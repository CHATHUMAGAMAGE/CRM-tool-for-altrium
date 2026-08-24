"""
Django settings for the ELEVEN CRM backend.
"""

from datetime import timedelta
from pathlib import Path

# pyrefly: ignore [missing-import]
import environ


BASE_DIR = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------------
# Environment variables
# ---------------------------------------------------------------------

env = environ.Env()

environ.Env.read_env(
    BASE_DIR / ".env"
)


def environment_list(
    variable_name: str,
    default: list[str],
) -> list[str]:
    """Read a comma-separated environment variable as a clean list."""
    return [
        item.strip()
        for item in env.list(
            variable_name,
            default=default,
        )
        if item.strip()
    ]


# ---------------------------------------------------------------------
# Core security settings
# ---------------------------------------------------------------------

SECRET_KEY = env(
    "SECRET_KEY"
)

DEBUG = env.bool(
    "DEBUG",
    default=False,
)

ALLOWED_HOSTS = environment_list(
    "ALLOWED_HOSTS",
    default=[
        "localhost",
        "127.0.0.1",
    ],
)


# Render automatically provides this variable to web services.

render_hostname = env(
    "RENDER_EXTERNAL_HOSTNAME",
    default="",
)

if (
    render_hostname
    and render_hostname
    not in ALLOWED_HOSTS
):
    ALLOWED_HOSTS.append(
        render_hostname
    )


# ---------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt.token_blacklist",

    "core",
    "accounts",
    "crm",
]


# ---------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "config.middleware.NoStoreSensitiveResponsesMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


# ---------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------

TEMPLATES = [
    {
        "BACKEND": (
            "django.template.backends.django.DjangoTemplates"
        ),
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                (
                    "django.template.context_processors."
                    "request"
                ),
                (
                    "django.contrib.auth.context_processors."
                    "auth"
                ),
                (
                    "django.contrib.messages.context_processors."
                    "messages"
                ),
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"


# ---------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------

database_url = env(
    "DATABASE_URL",
    default="",
)

if database_url:
    DATABASES = {
        "default": env.db_url(
            "DATABASE_URL"
        ),
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": (
                "django.db.backends.postgresql"
            ),
            "NAME": env(
                "DB_NAME"
            ),
            "USER": env(
                "DB_USER"
            ),
            "PASSWORD": env(
                "DB_PASSWORD"
            ),
            "HOST": env(
                "DB_HOST"
            ),
            "PORT": env(
                "DB_PORT"
            ),
        },
    }


DATABASES["default"][
    "CONN_MAX_AGE"
] = env.int(
    "DB_CONN_MAX_AGE",
    default=600,
)

DATABASES["default"][
    "CONN_HEALTH_CHECKS"
] = True


# ---------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


# ---------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------

LANGUAGE_CODE = "en-us"

TIME_ZONE = env(
    "TIME_ZONE",
    default="UTC",
)

USE_I18N = True
USE_TZ = True


# ---------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------

STATIC_URL = "/static/"

STATIC_ROOT = (
    BASE_DIR / "staticfiles"
)


# ---------------------------------------------------------------------
# Uploaded media files
# ---------------------------------------------------------------------

MEDIA_URL = "/media/"

MEDIA_ROOT = (
    BASE_DIR / "media"
)


STORAGES = {
    "default": {
        "BACKEND": (
            "django.core.files.storage."
            "FileSystemStorage"
        ),
    },
    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage."
            "CompressedManifestStaticFilesStorage"
        ),
    },
}


# ---------------------------------------------------------------------
# Default model field
# ---------------------------------------------------------------------

DEFAULT_AUTO_FIELD = (
    "django.db.models.BigAutoField"
)


# ---------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        (
            "rest_framework_simplejwt."
            "authentication.JWTAuthentication"
        ),
    ),
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/minute",
        "token_refresh": "30/minute",
        "password_reset": "5/hour",
        "rescue_radar": "10/hour",
    },
}


# Keep access tokens deliberately short-lived. Refresh-token rotation is
# left disabled in this Sprint 1 hardening batch so the shared mobile
# authentication flow remains backward compatible.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=5,
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=1,
    ),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
}


# ---------------------------------------------------------------------
# CORS and CSRF
# ---------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = environment_list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ],
)

CSRF_TRUSTED_ORIGINS = environment_list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ],
)

# Required so the browser can send/receive the HttpOnly refresh cookie
# between the React frontend and Django API when they use different
# origins.
CORS_ALLOW_CREDENTIALS = True


# ---------------------------------------------------------------------
# Web authentication cookie
# ---------------------------------------------------------------------

AUTH_REFRESH_COOKIE_NAME = env(
    "AUTH_REFRESH_COOKIE_NAME",
    default="eleven_refresh",
)

AUTH_REMEMBER_COOKIE_NAME = env(
    "AUTH_REMEMBER_COOKIE_NAME",
    default="eleven_remember",
)

AUTH_REFRESH_COOKIE_PATH = env(
    "AUTH_REFRESH_COOKIE_PATH",
    default="/api/v1/auth/",
)

AUTH_COOKIE_SECURE = env.bool(
    "AUTH_COOKIE_SECURE",
    default=not DEBUG,
)

AUTH_COOKIE_SAMESITE = env(
    "AUTH_COOKIE_SAMESITE",
    default="Lax",
).strip().capitalize()

if AUTH_COOKIE_SAMESITE not in {
    "Lax",
    "Strict",
    "None",
}:
    raise ValueError(
        "AUTH_COOKIE_SAMESITE must be Lax, Strict, or None."
    )

if (
    AUTH_COOKIE_SAMESITE == "None"
    and not AUTH_COOKIE_SECURE
):
    raise ValueError(
        "AUTH_COOKIE_SECURE must be True when "
        "AUTH_COOKIE_SAMESITE=None."
    )

AUTH_COOKIE_DOMAIN = (
    env(
        "AUTH_COOKIE_DOMAIN",
        default="",
    ).strip()
    or None
)


# ---------------------------------------------------------------------
# Password recovery and email
# ---------------------------------------------------------------------

FRONTEND_URL = env(
    "FRONTEND_URL",
    default="http://127.0.0.1:3002",
)

PASSWORD_RESET_TIMEOUT = env.int(
    "PASSWORD_RESET_TIMEOUT",
    default=3600,
)

EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default=(
        "django.core.mail.backends."
        "console.EmailBackend"
    ),
)

EMAIL_HOST = env(
    "EMAIL_HOST",
    default="",
)

EMAIL_PORT = env.int(
    "EMAIL_PORT",
    default=587,
)

EMAIL_HOST_USER = env(
    "EMAIL_HOST_USER",
    default="",
)

EMAIL_HOST_PASSWORD = env(
    "EMAIL_HOST_PASSWORD",
    default="",
)

EMAIL_USE_TLS = env.bool(
    "EMAIL_USE_TLS",
    default=False,
)

EMAIL_USE_SSL = env.bool(
    "EMAIL_USE_SSL",
    default=False,
)

EMAIL_TIMEOUT = env.int(
    "EMAIL_TIMEOUT",
    default=10,
)

DEFAULT_FROM_EMAIL = env(
    "DEFAULT_FROM_EMAIL",
    default="no-reply@eleven.local",
)

PASSWORD_RESET_EMAIL_PROVIDER = env(
    "PASSWORD_RESET_EMAIL_PROVIDER",
    default="django",
)

BREVO_API_KEY = env(
    "BREVO_API_KEY",
    default="",
)

BREVO_SENDER_NAME = env(
    "BREVO_SENDER_NAME",
    default="ELEVEN CRM",
)

BREVO_SENDER_EMAIL = env(
    "BREVO_SENDER_EMAIL",
    default="",
)

BREVO_TIMEOUT_SECONDS = env.int(
    "BREVO_TIMEOUT_SECONDS",
    default=10,
)


# ---------------------------------------------------------------------
# Lead Rescue Radar AI provider
# ---------------------------------------------------------------------

AI_PROVIDER = env(
    "AI_PROVIDER",
    default="nvidia",
).strip().lower()

AI_FALLBACK_PROVIDER = env(
    "AI_FALLBACK_PROVIDER",
    default="",
).strip().lower()

AI_REQUEST_TIMEOUT_SECONDS = env.float(
    "AI_REQUEST_TIMEOUT_SECONDS",
    default=75.0,
)

NVIDIA_API_KEY = env(
    "NVIDIA_API_KEY",
    default="",
)

NVIDIA_NIM_BASE_URL = env(
    "NVIDIA_NIM_BASE_URL",
    default="https://integrate.api.nvidia.com/v1",
)

NVIDIA_NIM_MODEL = env(
    "NVIDIA_NIM_MODEL",
    default="nvidia/nemotron-3-ultra-550b-a55b",
)

GEMINI_API_KEY = env(
    "GEMINI_API_KEY",
    default="",
)

GEMINI_BASE_URL = env(
    "GEMINI_BASE_URL",
    default=(
        "https://generativelanguage.googleapis.com/"
        "v1beta/openai/"
    ),
)

GEMINI_MODEL = env(
    "GEMINI_MODEL",
    default="gemini-3.7-flash",
)


# ---------------------------------------------------------------------
# Production HTTPS and browser security
# ---------------------------------------------------------------------

SECURE_PROXY_SSL_HEADER = (
    "HTTP_X_FORWARDED_PROTO",
    "https",
)

USE_X_FORWARDED_HOST = True

SECURE_SSL_REDIRECT = env.bool(
    "SECURE_SSL_REDIRECT",
    default=not DEBUG,
)

SESSION_COOKIE_SECURE = env.bool(
    "SESSION_COOKIE_SECURE",
    default=not DEBUG,
)

CSRF_COOKIE_SECURE = env.bool(
    "CSRF_COOKIE_SECURE",
    default=not DEBUG,
)

SECURE_CONTENT_TYPE_NOSNIFF = True

SECURE_REFERRER_POLICY = (
    "same-origin"
)

X_FRAME_OPTIONS = "DENY"


# Django's built-in administration site is disabled by default in
# production. Local development keeps it available automatically when
# DEBUG=True. Set ENABLE_DJANGO_ADMIN=True explicitly only when the
# production administration site is intentionally required.
ENABLE_DJANGO_ADMIN = env.bool(
    "ENABLE_DJANGO_ADMIN",
    default=DEBUG,
)


# Keep HSTS disabled during the first deployment.
# Enable it after HTTPS and the final domain are verified.

SECURE_HSTS_SECONDS = env.int(
    "SECURE_HSTS_SECONDS",
    default=0,
)

SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS",
    default=False,
)

SECURE_HSTS_PRELOAD = env.bool(
    "SECURE_HSTS_PRELOAD",
    default=False,
)