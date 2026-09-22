from django.contrib import admin
from .models import (
    Region, Zone, Woreda, Kebele,
    ProjectType, WaterSource, IrrigationTechnology,
    IrrigationSystem, ProjectCategory, FinancingSource, Crop,
)

admin.site.register(Region)
admin.site.register(Zone)
admin.site.register(Woreda)
admin.site.register(Kebele)
admin.site.register(ProjectType)
admin.site.register(WaterSource)
admin.site.register(IrrigationTechnology)
admin.site.register(IrrigationSystem)
admin.site.register(ProjectCategory)
admin.site.register(FinancingSource)
admin.site.register(Crop)