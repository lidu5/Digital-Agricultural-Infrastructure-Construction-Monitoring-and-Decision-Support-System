from rest_framework import serializers
from .models import Project, ProjectMilestone, MilestoneType


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['project_id', 'created_at', 'updated_at']


class MilestoneTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilestoneType
        fields = '__all__'


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = '__all__'