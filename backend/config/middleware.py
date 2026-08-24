class NoStoreSensitiveResponsesMiddleware:
    """
    Prevent authenticated/sensitive backend responses from being stored
    by browser or intermediary HTTP caches.

    This is browser-cache protection. It does not and cannot prevent
    operating-system screenshots or screen recording.
    """

    protected_prefixes = (
        "/api/",
        "/admin/",
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.path.startswith(self.protected_prefixes):
            response["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, private"
            )
            response["Pragma"] = "no-cache"
            response["Expires"] = "0"

        return response
