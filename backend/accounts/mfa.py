import base64
import hashlib
import hmac
import io
import secrets
import string
from dataclasses import dataclass

import pyotp
import qrcode
from cryptography.fernet import (
    Fernet,
    InvalidToken as FernetInvalidToken,
)
from django.conf import settings
from django.contrib.auth.hashers import (
    check_password,
    make_password,
)
from django.contrib.auth.models import User
from django.core import signing
from django.utils import timezone

from .models import UserProfile


class MFAChallengeError(Exception):
    """Raised when an MFA challenge is invalid, stale, or expired."""


class MFASecretError(Exception):
    """Raised when a stored MFA secret cannot be decrypted."""


@dataclass(frozen=True)
class MFAChallenge:
    user: User
    web_session: bool
    remember_me: bool
    purpose: str


def _encryption_key_material() -> str:
    configured = getattr(
        settings,
        "MFA_ENCRYPTION_KEY",
        "",
    ).strip()

    if configured:
        return configured

    return settings.SECRET_KEY


def _fernet() -> Fernet:
    digest = hashlib.sha256(
        _encryption_key_material().encode(
            "utf-8"
        )
    ).digest()

    encoded_key = base64.urlsafe_b64encode(
        digest
    )

    return Fernet(
        encoded_key
    )


def encrypt_secret(secret: str) -> str:
    return (
        _fernet()
        .encrypt(
            secret.encode(
                "utf-8"
            )
        )
        .decode(
            "utf-8"
        )
    )


def decrypt_secret(
    encrypted_secret: str,
) -> str:
    if not encrypted_secret:
        raise MFASecretError(
            "No MFA secret is configured."
        )

    try:
        return (
            _fernet()
            .decrypt(
                encrypted_secret.encode(
                    "utf-8"
                )
            )
            .decode(
                "utf-8"
            )
        )
    except (
        FernetInvalidToken,
        ValueError,
    ) as exc:
        raise MFASecretError(
            "The stored MFA secret could not be decrypted."
        ) from exc


def user_requires_mfa(
    user: User,
) -> bool:
    profile = getattr(
        user,
        "profile",
        None,
    )

    if profile is None:
        return bool(
            user.is_superuser
        )

    if profile.mfa_enabled:
        return True

    required_roles = set(
        getattr(
            settings,
            "MFA_REQUIRED_ROLES",
            [],
        )
    )

    return (
        user.is_superuser
        or profile.role
        in required_roles
    )


def user_needs_mfa_setup(
    user: User,
) -> bool:
    profile = getattr(
        user,
        "profile",
        None,
    )

    if profile is None:
        return bool(
            user.is_superuser
        )

    return (
        user_requires_mfa(
            user
        )
        and not profile.mfa_enabled
    )


def create_challenge(
    user: User,
    *,
    purpose: str,
    web_session: bool,
    remember_me: bool,
) -> str:
    profile = user.profile

    nonce = secrets.token_urlsafe(
        32
    )

    profile.mfa_challenge_nonce = (
        nonce
    )

    profile.save(
        update_fields=[
            "mfa_challenge_nonce",
        ]
    )

    payload = {
        "uid": user.pk,
        "nonce": nonce,
        "purpose": purpose,
        "web_session": bool(
            web_session
        ),
        "remember_me": bool(
            remember_me
        ),
    }

    return signing.dumps(
        payload,
        salt=(
            settings.MFA_CHALLENGE_SIGNING_SALT
        ),
        compress=True,
    )


def resolve_challenge(
    challenge_token: str,
    *,
    expected_purpose: str,
) -> MFAChallenge:
    try:
        payload = signing.loads(
            challenge_token,
            salt=(
                settings.MFA_CHALLENGE_SIGNING_SALT
            ),
            max_age=(
                settings.MFA_CHALLENGE_MAX_AGE_SECONDS
            ),
        )
    except (
        signing.BadSignature,
        signing.SignatureExpired,
    ) as exc:
        raise MFAChallengeError(
            "The security verification challenge "
            "is invalid or has expired."
        ) from exc

    if not isinstance(
        payload,
        dict,
    ):
        raise MFAChallengeError(
            "The security verification challenge "
            "is invalid or has expired."
        )

    if (
        payload.get(
            "purpose"
        )
        != expected_purpose
    ):
        raise MFAChallengeError(
            "The security verification challenge "
            "is invalid or has expired."
        )

    user_id = payload.get(
        "uid"
    )

    nonce = payload.get(
        "nonce"
    )

    if (
        not user_id
        or not isinstance(
            nonce,
            str,
        )
        or not nonce
    ):
        raise MFAChallengeError(
            "The security verification challenge "
            "is invalid or has expired."
        )

    try:
        user = (
            User.objects
            .select_related(
                "profile",
            )
            .get(
                pk=user_id,
                is_active=True,
            )
        )
    except User.DoesNotExist as exc:
        raise MFAChallengeError(
            "The security verification challenge "
            "is invalid or has expired."
        ) from exc

    profile = user.profile

    if not hmac.compare_digest(
        profile.mfa_challenge_nonce,
        nonce,
    ):
        raise MFAChallengeError(
            "The security verification challenge "
            "is invalid or has expired."
        )

    return MFAChallenge(
        user=user,
        web_session=bool(
            payload.get(
                "web_session",
                False,
            )
        ),
        remember_me=bool(
            payload.get(
                "remember_me",
                False,
            )
        ),
        purpose=expected_purpose,
    )


def clear_challenge(
    user: User,
) -> None:
    profile = user.profile

    profile.mfa_challenge_nonce = ""

    profile.save(
        update_fields=[
            "mfa_challenge_nonce",
        ]
    )


def generate_totp_secret() -> str:
    return pyotp.random_base32(
        length=32,
    )


def build_provisioning_uri(
    user: User,
    secret: str,
) -> str:
    account_name = (
        user.email.strip()
        or user.username
    )

    totp = pyotp.TOTP(
        secret,
        digits=6,
        interval=30,
    )

    return totp.provisioning_uri(
        name=account_name,
        issuer_name=(
            settings.MFA_ISSUER_NAME
        ),
    )


def build_qr_code_data_url(
    provisioning_uri: str,
) -> str:
    qr = qrcode.QRCode(
        version=None,
        error_correction=(
            qrcode.constants.ERROR_CORRECT_M
        ),
        box_size=6,
        border=3,
    )

    qr.add_data(
        provisioning_uri
    )

    qr.make(
        fit=True
    )

    image = qr.make_image(
        fill_color="black",
        back_color="white",
    )

    buffer = io.BytesIO()

    image.save(
        buffer,
        format="PNG",
    )

    encoded = base64.b64encode(
        buffer.getvalue()
    ).decode(
        "ascii"
    )

    return (
        "data:image/png;base64,"
        f"{encoded}"
    )


def match_totp_counter(
    secret: str,
    code: str,
    *,
    last_used_counter: int | None,
) -> int | None:
    normalized_code = (
        code.strip()
    )

    if (
        len(normalized_code)
        != 6
        or not normalized_code.isdigit()
    ):
        return None

    interval = 30

    current_counter = int(
        timezone.now().timestamp()
        // interval
    )

    valid_window = int(
        settings.MFA_TOTP_VALID_WINDOW
    )

    totp = pyotp.TOTP(
        secret,
        digits=6,
        interval=interval,
    )

    for offset in range(
        -valid_window,
        valid_window + 1,
    ):
        counter = (
            current_counter
            + offset
        )

        if (
            last_used_counter
            is not None
            and counter
            <= last_used_counter
        ):
            continue

        expected = totp.at(
            counter
            * interval
        )

        if hmac.compare_digest(
            expected,
            normalized_code,
        ):
            return counter

    return None


def generate_recovery_codes() -> list[str]:
    alphabet = (
        "ABCDEFGHJKLMNPQRSTUVWXYZ"
        "23456789"
    )

    code_count = int(
        settings.MFA_RECOVERY_CODE_COUNT
    )

    codes = []

    for _ in range(
        code_count
    ):
        raw = "".join(
            secrets.choice(
                alphabet
            )
            for _ in range(
                8
            )
        )

        codes.append(
            f"{raw[:4]}-{raw[4:]}"
        )

    return codes


def hash_recovery_codes(
    recovery_codes: list[str],
) -> list[str]:
    return [
        make_password(
            code.upper()
        )
        for code in recovery_codes
    ]


def consume_recovery_code(
    profile: UserProfile,
    code: str,
) -> bool:
    normalized = (
        code.strip().upper()
    )

    if not normalized:
        return False

    hashes = list(
        profile.mfa_recovery_code_hashes
        or []
    )

    matched_index = None

    for index, encoded_hash in enumerate(
        hashes
    ):
        if check_password(
            normalized,
            encoded_hash,
        ):
            matched_index = index
            break

    if matched_index is None:
        return False

    del hashes[
        matched_index
    ]

    profile.mfa_recovery_code_hashes = (
        hashes
    )

    profile.save(
        update_fields=[
            "mfa_recovery_code_hashes",
        ]
    )

    return True
