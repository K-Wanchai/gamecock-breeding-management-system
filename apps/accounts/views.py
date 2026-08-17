from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts import services
from apps.accounts.serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.core.exceptions import AppError


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register — self-registration always creates a CUSTOMER."""

    serializer_class = RegisterSerializer
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = 'register'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login."""

    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = 'login'


class RefreshView(TokenRefreshView):
    """POST /api/v1/auth/refresh. Rotation + blacklist-after-rotation configured in SIMPLE_JWT."""


class LogoutView(APIView):
    """POST /api/v1/auth/logout — blacklists the given refresh token (Global architecture: token revocation)."""

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            raise AppError('REFRESH_TOKEN_REQUIRED', 'refresh token is required.', http_status=400)
        try:
            RefreshToken(refresh).blacklist()
        except TokenError:
            raise AppError('INVALID_TOKEN', 'refresh token is invalid or already revoked.', http_status=400)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveAPIView):
    """GET /api/v1/auth/me."""

    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user


class ProfileView(generics.UpdateAPIView):
    """PATCH /api/v1/auth/profile — self only, role/username/password excluded from the serializer."""

    serializer_class = ProfileUpdateSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    """POST /api/v1/auth/change-password — also revokes every other outstanding refresh token."""

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        services.blacklist_all_outstanding_tokens_for_user(request.user)
        return Response({'detail': 'Password changed. Please log in again.'})


class PasswordResetRequestView(APIView):
    """
    POST /api/v1/auth/password-reset/request — always 200, regardless of whether
    the email is registered, to avoid account enumeration.
    """

    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.request_password_reset(serializer.validated_data['email'])
        return Response({'detail': 'If that email is registered, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    """POST /api/v1/auth/password-reset/confirm."""

    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.confirm_password_reset(**serializer.validated_data)
        return Response({'detail': 'Password has been reset. Please log in again.'})
