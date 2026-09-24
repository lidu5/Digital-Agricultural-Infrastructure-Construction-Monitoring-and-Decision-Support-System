from django.core.management.base import BaseCommand
from geography.models import Crop
from projects.models import MilestoneType
from monitoring.models import ProblemCategory, DocumentType


MILESTONES = [
    ('Design completed', 1),
    ('Tender completed', 2),
    ('Contract signed', 3),
    ('Site possession', 4),
    ('Mobilization completed', 5),
    ('Intake completed', 6),
    ('Main canal completed', 7),
    ('Secondary canal completed', 8),
    ('Structures completed', 9),
    ('Irrigation network completed', 10),
    ('Testing completed', 11),
    ('Commissioning completed', 12),
    ('Scheme handed over', 13),
    ('Irrigation started', 14),
]

PROBLEM_CATEGORIES = [
    'Design problem', 'Land acquisition', 'Right-of-way',
    'Contractor capacity', 'Consultant performance', 'Material shortage',
    'Equipment shortage', 'Labour shortage', 'Payment delay',
    'Variation', 'Geological condition', 'Hydrological problem',
    'Security', 'Community conflict', 'Weather condition',
    'Environmental issue', 'Technical quality problem', 'Other',
    'Technical support needed',  # for the technical_support_required workflow
]

DOCUMENT_TYPES = [
    'Site photograph', 'Before/after photograph', 'Progress photograph',
    'Approved drawing', 'As-built drawing', 'BoQ', 'Contract', 'IPC',
    'Test result', 'Inspection report', 'Site instruction',
    'Variation order', 'Meeting minutes',
]


class Command(BaseCommand):
    help = 'Seeds the fixed lookup tables (milestones, problem categories, document types).'

    def handle(self, *args, **options):
        for name, order in MILESTONES:
            obj, created = MilestoneType.objects.get_or_create(
                name=name, defaults={'sequence_order': order}
            )
            self.stdout.write(f"{'Created' if created else 'Exists'}: {obj}")

        for name in PROBLEM_CATEGORIES:
            obj, created = ProblemCategory.objects.get_or_create(name=name)
            self.stdout.write(f"{'Created' if created else 'Exists'}: {obj}")

        for name in DOCUMENT_TYPES:
            obj, created = DocumentType.objects.get_or_create(name=name)
            self.stdout.write(f"{'Created' if created else 'Exists'}: {obj}")

        self.stdout.write(self.style.SUCCESS('Lookup data seeded successfully.'))