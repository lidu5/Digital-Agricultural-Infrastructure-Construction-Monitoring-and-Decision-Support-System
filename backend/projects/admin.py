from django.contrib import admin
from .models import Program, Project, ProjectCrop, MilestoneType, ProjectMilestone

admin.site.register(Program)
admin.site.register(Project)
admin.site.register(ProjectCrop)
admin.site.register(MilestoneType)
admin.site.register(ProjectMilestone)