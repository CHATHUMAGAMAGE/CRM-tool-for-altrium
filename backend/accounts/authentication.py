from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """
    JWT login endpoint protected by an IP-based burst throttle.

    ScopedRateThrottle uses the request identity supplied by DRF.
    For unauthenticated login attempts this resolves to the client IP.
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"
