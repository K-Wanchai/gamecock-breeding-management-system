from django.contrib.auth import password_validation
from django.core import exceptions as django_exceptions
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    """Read model for GET /auth/me and the response body of /auth/profile."""

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'phone', 'address', 'first_name', 'last_name',
            'role', 'is_active', 'date_joined',
        )
        read_only_fields = ('id', 'username', 'role', 'is_active', 'date_joined')


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """
    PATCH /auth/profile. Deliberately excludes username/role/is_active/password —
    those are not self-service fields (role especially: never let a client set
    their own role, Global Rule #11).
    """

    class Meta:
        model = User
        fields = ('email', 'phone', 'address', 'first_name', 'last_name')

    def validate_email(self, value):
        if value and User.objects.exclude(pk=self.instance.pk).filter(email__iexact=value).exists():
            raise serializers.ValidationError('This email is already in use.')
        return value

    def validate_phone(self, value):
        if value and User.objects.exclude(pk=self.instance.pk).filter(phone=value).exists():
            raise serializers.ValidationError('This phone number is already in use.')
        return value


class RegisterSerializer(serializers.ModelSerializer):
    """
    POST /auth/register. `role` is intentionally not a field here — every
    self-registered account is CUSTOMER (the model default); ADMIN accounts are
    only ever created through the Django admin / createsuperuser.
    """

    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('username', 'email', 'phone', 'first_name', 'last_name', 'password', 'password_confirm')

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('This email is already registered.')
        return value

    def validate_phone(self, value):
        if value and User.objects.filter(phone=value).exists():
            raise serializers.ValidationError('This phone number is already registered.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})

        temp_user = User(
            username=attrs.get('username'), email=attrs.get('email'), first_name=attrs.get('first_name', ''),
        )
        try:
            password_validation.validate_password(attrs['password'], user=temp_user)
        except django_exceptions.ValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data, role=User.Role.CUSTOMER)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Wraps SimpleJWT's serializer to embed `role` in the token claims and to return
    basic profile info alongside the access/refresh pair, so the frontend doesn't
    need a second round trip after login. Inactive/wrong-password handling is
    unchanged — still produced by the parent's authenticate() call (-> 401).
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    new_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    new_password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        try:
            password_validation.validate_password(attrs['new_password'], user=self.context['request'].user)
        except django_exceptions.ValidationError as exc:
            raise serializers.ValidationError({'new_password': list(exc.messages)})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
