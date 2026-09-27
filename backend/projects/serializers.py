from rest_framework import serializers
from .models import Project, ProjectMilestone, MilestoneType


class ProjectSerializer(serializers.ModelSerializer):
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['project_id', 'created_at', 'updated_at']

    def get_latitude(self, obj):
        return obj.gps_location.y if obj.gps_location else None

    def get_longitude(self, obj):
        return obj.gps_location.x if obj.gps_location else None

class MilestoneTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilestoneType
        fields = '__all__'


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = '__all__'