from django.contrib import admin
from .models import (
    ProblemCategory, DocumentType, AlertType,
    ProgressRecord, Issue, Document, Alert,
)

admin.site.register(ProblemCategory)
admin.site.register(DocumentType)
admin.site.register(AlertType)
admin.site.register(ProgressRecord)
admin.site.register(Issue)
admin.site.register(Document)
admin.site.register(Alert)