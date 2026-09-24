from rest_framework import serializers
from .models import (
    ProblemCategory, DocumentType, AlertType,
    ProgressRecord, Issue, Document, Alert,
)


class ProblemCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProblemCategory
        fields = '__all__'


class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = '__all__'


class AlertTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertType
        fields = '__all__'


class ProgressRecordSerializer(serializers.ModelSerializer):
    # These three are Python @property methods on the model, not real
    # columns — SerializerMethodField exposes them as read-only JSON output.
    physical_progress_pct = serializers.ReadOnlyField()
    financial_progress_pct = serializers.ReadOnlyField()
    time_progress_pct = serializers.ReadOnlyField()

    class Meta:
        model = ProgressRecord
        fields = '__all__'
        read_only_fields = ['record_id', 'created_at']


class IssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = '__all__'
        read_only_fields = ['issue_id', 'raised_date', 'created_at', 'updated_at']


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'
        read_only_fields = ['document_id', 'upload_date', 'created_at']


class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = '__all__'
        read_only_fields = ['alert_id', 'triggered_date', 'created_at']