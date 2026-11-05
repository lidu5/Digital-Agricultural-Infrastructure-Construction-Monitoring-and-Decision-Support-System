from django.contrib import admin
from .models import (
    Contract, VariationOrder, ExtensionOfTime, IPC, Claim,
    BOQSection, BOQItem, PhysicalProgress, IPCLineItem,
)

admin.site.register(Contract)
admin.site.register(VariationOrder)
admin.site.register(ExtensionOfTime)
admin.site.register(IPC)
admin.site.register(Claim)
admin.site.register(BOQSection)
admin.site.register(BOQItem)
admin.site.register(PhysicalProgress)
admin.site.register(IPCLineItem)