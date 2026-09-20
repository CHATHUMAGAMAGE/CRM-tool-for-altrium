from getpass import getpass

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from accounts.models import UserProfile


class Command(BaseCommand):
    help = "Interactively create a local development user using Django password validation."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("create_local_user is available only when DEBUG=True.")
        username = input("Username: ").strip()
        email = input("Email: ").strip()
        first_name = input("First name: ").strip()
        last_name = input("Last name: ").strip()
        role = input("Role: ").strip().upper()

        valid_roles = {value for value, _ in UserProfile.Role.choices}
        if role not in valid_roles:
            raise CommandError(f"Unknown role. Choose one of: {', '.join(sorted(valid_roles))}")

        User = get_user_model()
        if User.objects.filter(username=username).exists():
            raise CommandError("A user with that username already exists.")

        password = getpass("Password: ")
        confirmation = getpass("Confirm password: ")
        if password != confirmation:
            raise CommandError("Passwords do not match.")

        candidate = User(username=username, email=email, first_name=first_name, last_name=last_name)
        try:
            validate_password(password, user=candidate)
        except ValidationError as exc:
            raise CommandError(" ".join(exc.messages)) from exc

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password,
        )
        user.profile.role = role
        user.profile.save(update_fields=["role"])
        self.stdout.write(self.style.SUCCESS(f"Created {username} as {user.profile.get_role_display()}."))
