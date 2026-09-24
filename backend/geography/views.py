from rest_framework import viewsets, permissions
from .models import (
    Region, Zone, Woreda, Kebele,
    ProjectType, WaterSource, IrrigationTechnology,
    IrrigationSystem, ProjectCategory, FinancingSource, Crop,
)
from .serializers import (
    RegionSerializer, ZoneSerializer, WoredaSerializer, KebeleSerializer,
    ProjectTypeSerializer, WaterSourceSerializer, IrrigationTechnologySerializer,
    IrrigationSystemSerializer, ProjectCategorySerializer,
    FinancingSourceSerializer, CropSerializer,
)


class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [permissions.IsAuthenticated]


class ZoneViewSet(viewsets.ModelViewSet):
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer
    permission_classes = [permissions.IsAuthenticated]


class WoredaViewSet(viewsets.ModelViewSet):
    queryset = Woreda.objects.all()
    serializer_class = WoredaSerializer
    permission_classes = [permissions.IsAuthenticated]


class KebeleViewSet(viewsets.ModelViewSet):
    queryset = Kebele.objects.all()
    serializer_class = KebeleSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProjectTypeViewSet(viewsets.ModelViewSet):
    queryset = ProjectType.objects.all()
    serializer_class = ProjectTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class WaterSourceViewSet(viewsets.ModelViewSet):
    queryset = WaterSource.objects.all()
    serializer_class = WaterSourceSerializer
    permission_classes = [permissions.IsAuthenticated]


class IrrigationTechnologyViewSet(viewsets.ModelViewSet):
    queryset = IrrigationTechnology.objects.all()
    serializer_class = IrrigationTechnologySerializer
    permission_classes = [permissions.IsAuthenticated]


class IrrigationSystemViewSet(viewsets.ModelViewSet):
    queryset = IrrigationSystem.objects.all()
    serializer_class = IrrigationSystemSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProjectCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProjectCategory.objects.all()
    serializer_class = ProjectCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class FinancingSourceViewSet(viewsets.ModelViewSet):
    queryset = FinancingSource.objects.all()
    serializer_class = FinancingSourceSerializer
    permission_classes = [permissions.IsAuthenticated]


class CropViewSet(viewsets.ModelViewSet):
    queryset = Crop.objects.all()
    serializer_class = CropSerializer
    permission_classes = [permissions.IsAuthenticated]