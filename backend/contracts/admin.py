from django.contrib import admin
from .models import Contract, VariationOrder, ExtensionOfTime, IPC, Claim

admin.site.register(Contract)
admin.site.register(VariationOrder)
admin.site.register(ExtensionOfTime)
admin.site.register(IPC)
admin.site.register(Claim)