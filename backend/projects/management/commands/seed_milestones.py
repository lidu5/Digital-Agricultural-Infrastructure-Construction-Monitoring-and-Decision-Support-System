"""
Management command to seed milestone types with standard construction stages.
Usage: python manage.py seed_milestones
"""

from django.core.management.base import BaseCommand
from projects.models import MilestoneType


class Command(BaseCommand):
    help = 'Seeds milestone types with standard construction stages'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding milestone types...')

        # 14 standard construction stages in sequence
        milestones = [
            (1, 'Site Handover'),
            (2, 'Mobilization'),
            (3, 'Design Completion'),
            (4, 'Excavation Start'),
            (5, 'Foundation Work'),
            (6, 'Main Structure Construction'),
            (7, 'Canal/Pipeline Installation'),
            (8, 'Pumping System Installation'),
            (9, 'Electrical Works'),
            (10, 'Testing & Commissioning'),
            (11, 'First Irrigation'),
            (12, 'Farmer Training'),
            (13, 'Provisional Acceptance'),
            (14, 'Final Handover'),
        ]

        for sequence, name in milestones:
            MilestoneType.objects.get_or_create(
                sequence_order=sequence,
                defaults={'name': name}
            )

        self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully seeded {len(milestones)} milestone types!'))
