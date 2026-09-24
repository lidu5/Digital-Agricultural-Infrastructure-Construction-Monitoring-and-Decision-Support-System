from rest_framework import serializers
from .models import (
    Region, Zone, Woreda, Kebele,
    ProjectType, WaterSource, IrrigationTechnology,
    IrrigationSystem, ProjectCategory, FinancingSource, Crop,
)


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = '__all__'


class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = '__all__'


class WoredaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Woreda
        fields = '__all__'


class KebeleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kebele
        fields = '__all__'


class ProjectTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectType
        fields = '__all__'


class WaterSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaterSource
        fields = '__all__'


class IrrigationTechnologySerializer(serializers.ModelSerializer):
    class Meta:
        model = IrrigationTechnology
        fields = '__all__'


class IrrigationSystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = IrrigationSystem
        fields = '__all__'


class ProjectCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectCategory
        fields = '__all__'


class FinancingSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancingSource
        fields = '__all__'


class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model = Crop
        fields = '__all__'