from rest_framework import serializers
from django.contrib.gis.geos import Point
from .models import Program, Project, ProjectMilestone, MilestoneType


class ProgramSerializer(serializers.ModelSerializer):
    project_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Program
        fields = '__all__'

    def get_project_count(self, obj):
        return obj.projects.count()


class ProjectSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(required=False, allow_null=True, write_only=True)
    longitude = serializers.FloatField(required=False, allow_null=True, write_only=True)
    
    # Read-only fields for displaying lookup names
    crop_names = serializers.StringRelatedField(source='crops', many=True, read_only=True)

    region_name = serializers.CharField(source='region.name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    woreda_name = serializers.CharField(source='woreda.name', read_only=True)
    kebele_name = serializers.CharField(source='kebele.name', read_only=True)
    project_type_name = serializers.CharField(source='project_type.name', read_only=True)
    water_source_name = serializers.CharField(source='water_source.name', read_only=True)
    irrigation_technology_name = serializers.CharField(source='irrigation_technology.name', read_only=True)
    irrigation_system_name = serializers.CharField(source='irrigation_system.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    financing_source_name = serializers.CharField(source='financing_source.name', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True, default='')

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['project_id', 'created_at', 'updated_at', 'gps_location']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        fields = (
            'target_beneficiaries_thh',
            'target_beneficiaries_male',
            'target_beneficiaries_female',
        )
        values = {
            f: attrs[f] if f in attrs else getattr(self.instance, f, None)
            for f in fields
        }
        if all(v is not None for v in values.values()):
            total = values['target_beneficiaries_male'] + values['target_beneficiaries_female']
            if values['target_beneficiaries_thh'] != total:
                raise serializers.ValidationError({
                    'target_beneficiaries_thh': (
                        'Target Beneficiaries (Households) must equal '
                        'Male Beneficiaries + Female Beneficiaries '
                        f'({total}).'
                    )
                })
        return attrs

    def create(self, validated_data):
        lat = validated_data.pop('latitude', None)
        lon = validated_data.pop('longitude', None)
        
        if lat is not None and lon is not None:
            validated_data['gps_location'] = Point(float(lon), float(lat), srid=4326)
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        lat = validated_data.pop('latitude', None)
        lon = validated_data.pop('longitude', None)
        
        if lat is not None and lon is not None:
            validated_data['gps_location'] = Point(float(lon), float(lat), srid=4326)
        elif lat is None and lon is None:
            validated_data['gps_location'] = None
        
        return super().update(instance, validated_data)
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.gps_location:
            representation['latitude'] = instance.gps_location.y
            representation['longitude'] = instance.gps_location.x
        else:
            representation['latitude'] = None
            representation['longitude'] = None

        # Report live progress per field: measured contract data (BOQ
        # quantities + certified IPCs) is the source of truth, the latest
        # ProgressRecord is the fallback for projects without measurable
        # contract data, and the denormalized columns are the last resort.
        measured = instance.measured_progress()
        latest = None
        if measured['physical'] is None or measured['financial'] is None:
            latest = instance.progress_records.order_by('-record_date').first()

        if measured['physical'] is not None:
            representation['physical_status_pct'] = float(measured['physical'])
        elif latest:
            representation['physical_status_pct'] = float(latest.physical_progress_pct)

        if measured['financial'] is not None:
            representation['financial_status_pct'] = float(measured['financial'])
        elif latest:
            representation['financial_status_pct'] = float(latest.financial_progress_pct)
        return representation

class MilestoneTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilestoneType
        fields = '__all__'


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = '__all__'