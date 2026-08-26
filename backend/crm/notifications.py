from .models import Notification


def create_notification(*, recipient, actor, kind, title, message, target_url):
    if recipient is None or (actor is not None and recipient.pk == actor.pk):
        return None

    return Notification.objects.create(
        recipient=recipient,
        actor=actor,
        kind=kind,
        title=title,
        message=message,
        target_url=target_url,
    )
