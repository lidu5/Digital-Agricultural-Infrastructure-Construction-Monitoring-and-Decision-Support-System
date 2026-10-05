"""
Management command to seed lookup tables with initial data.
Usage: python manage.py seed_lookups
"""

from django.core.management.base import BaseCommand
from geography.models import (
    ProjectType, WaterSource, IrrigationTechnology, IrrigationSystem,
    ProjectCategory, FinancingSource
)


class Command(BaseCommand):
    help = 'Seeds lookup tables with initial data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding lookup tables...')

        # Project Types
        project_types = [
            'Small Scale Irrigation',
            'Medium Scale Irrigation',
            'Large Scale Irrigation',
            'Water Harvesting',
            'River Diversion',
            'Dam Construction',
        ]
        for name in project_types:
            ProjectType.objects.get_or_create(name=name)
        self.stdout.write(f'✓ Created {len(project_types)} project types')

        # Water Sources
        water_sources = [
            'River',
            'Stream',
            'Spring',
            'Groundwater',
            'Lake',
            'Reservoir',
            'Rainwater',
        ]
        for name in water_sources:
            WaterSource.objects.get_or_create(name=name)
        self.stdout.write(f'✓ Created {len(water_sources)} water sources')

        # Irrigation Technologies
        irrigation_techs = [
            'Drip Irrigation',
            'Sprinkler Irrigation',
            'Surface Irrigation',
            'Furrow Irrigation',
            'Basin Irrigation',
            'Border Irrigation',
            'Subsurface Irrigation',
        ]
        for name in irrigation_techs:
            IrrigationTechnology.objects.get_or_create(name=name)
        self.stdout.write(f'✓ Created {len(irrigation_techs)} irrigation technologies')

        # Irrigation Systems
        irrigation_systems = [
            'Gravity Fed',
            'Pump Fed',
            'Solar Powered',
            'Diesel Powered',
            'Electric Powered',
            'Mixed System',
        ]
        for name in irrigation_systems:
            IrrigationSystem.objects.get_or_create(name=name)
        self.stdout.write(f'✓ Created {len(irrigation_systems)} irrigation systems')

        # Project Categories
        project_categories = [
            'New Construction',
            'Rehabilitation',
            'Expansion',
            'Modernization',
            'Emergency',
        ]
        for name in project_categories:
            ProjectCategory.objects.get_or_create(name=name)
        self.stdout.write(f'✓ Created {len(project_categories)} project categories')

        # Financing Sources
        financing_sources = [
            'Government Budget',
            'World Bank',
            'African Development Bank',
            'USAID',
            'EU',
            'Bilateral Donor',
            'Private Investment',
            'Community Contribution',
            'Mixed Financing',
        ]
        for name in financing_sources:
            FinancingSource.objects.get_or_create(name=name)
        self.stdout.write(f'✓ Created {len(financing_sources)} financing sources')

        self.stdout.write(self.style.SUCCESS('\n✅ Successfully seeded all lookup tables!'))
