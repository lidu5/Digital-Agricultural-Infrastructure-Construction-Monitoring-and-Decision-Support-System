from rest_framework import serializers
from .models import User, Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    """
    Handles both reading users (password never included) and creating
    them (password is write-only and goes through create_user() so it
    gets hashed, never stored as plain text).
    """
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'user_id', 'full_name', 'email', 'role', 'region',
            'is_active', 'password', 'created_at', 'updated_at',
        ]
        read_only_fields = ['user_id', 'created_at', 'updated_at']

    def create(self, validated_data):
        password = validated_data.pop('password')
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user