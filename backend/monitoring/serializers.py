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
    project_code = serializers.CharField(source='project.project_code', read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True)

    class Meta:
        model = ProgressRecord
        fields = '__all__'
        read_only_fields = ['record_id', 'created_at']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        project = attrs.get('project', getattr(self.instance, 'project', None))
        contract = attrs.get('contract', getattr(self.instance, 'contract', None))
        if contract and project and contract.project_id != project.pk:
            raise serializers.ValidationError(
                {'contract': 'This contract does not belong to the selected project.'}
            )

        def value(name):
            return attrs[name] if name in attrs else getattr(self.instance, name, None)

        certified = value('certified_amount')
        snapshot = value('contract_amount_snapshot')
        errors = {}
        if certified is not None and certified < 0:
            errors['certified_amount'] = 'Certified amount cannot be negative.'
        if snapshot is not None and snapshot <= 0:
            errors['contract_amount_snapshot'] = 'Contract amount must be greater than 0.'
        if errors:
            raise serializers.ValidationError(errors)

        ceiling = snapshot if snapshot is not None else (contract.current_value() if contract else None)
        if certified is not None and ceiling is not None and certified > ceiling:
            raise serializers.ValidationError({
                'certified_amount': (
                    f'Certified amount ({certified:,.2f}) cannot exceed the '
                    f'contract amount ({ceiling:,.2f}).'
                )
            })
        return attrs


class IssueSerializer(serializers.ModelSerializer):
    project_code = serializers.CharField(source='project.project_code', read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    problem_category_name = serializers.CharField(source='problem_category.name', read_only=True)
    responsible_org_name = serializers.CharField(source='responsible_org.name', read_only=True)

    class Meta:
        model = Issue
        fields = '__all__'
        read_only_fields = ['issue_id', 'raised_date', 'created_at', 'updated_at']


class DocumentSerializer(serializers.ModelSerializer):
    project_code = serializers.CharField(source='project.project_code', read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    document_type_name = serializers.CharField(source='document_type.name', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)

    class Meta:
        model = Document
        fields = '__all__'
        read_only_fields = ['document_id', 'upload_date', 'created_at']

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        has_file = attrs.get('file') or (instance and instance.file)
        has_url = attrs.get('file_url') or (instance and instance.file_url)
        if not has_file and not has_url:
            raise serializers.ValidationError('Provide either an uploaded file or a file URL.')
        return attrs


class AlertSerializer(serializers.ModelSerializer):
    project_code = serializers.CharField(source='project.project_code', read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    alert_type_name = serializers.CharField(source='alert_type.name', read_only=True)
    contract_number = serializers.CharField(source='contract.contract_number', read_only=True)

    class Meta:
        model = Alert
        fields = '__all__'
        read_only_fields = ['alert_id', 'triggered_date', 'created_at']