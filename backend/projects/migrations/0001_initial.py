import django.contrib.gis.db.models.fields
import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('geography', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MilestoneType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('sequence_order', models.PositiveSmallIntegerField(unique=True)),
            ],
            options={
                'ordering': ['sequence_order'],
            },
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('project_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('project_code', models.CharField(max_length=30, unique=True)),
                ('project_name', models.CharField(max_length=255)),
                ('gps_location', django.contrib.gis.db.models.fields.PointField(blank=True, geography=True, null=True, srid=4326)),
                ('basin', models.CharField(blank=True, max_length=100)),
                ('sub_basin', models.CharField(blank=True, max_length=100)),
                ('designed_irrigable_area_ha', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('target_beneficiaries_thh', models.PositiveIntegerField(blank=True, null=True)),
                ('target_beneficiaries_male', models.PositiveIntegerField(blank=True, null=True)),
                ('target_beneficiaries_female', models.PositiveIntegerField(blank=True, null=True)),
                ('physical_status_pct', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('financial_status_pct', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('overall_status_flag', models.CharField(choices=[('on_track', 'On track'), ('delayed', 'Delayed'), ('critical', 'Critical'), ('completed', 'Completed')], default='on_track', max_length=20)),
                ('priority_level', models.CharField(choices=[('normal', 'Normal'), ('high', 'High'), ('critical', 'Critical')], default='normal', max_length=20)),
                ('technical_support_required', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='projects', to='geography.projectcategory')),
                ('financing_source', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='projects', to='geography.financingsource')),
                ('irrigation_system', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='projects', to='geography.irrigationsystem')),
                ('irrigation_technology', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='projects', to='geography.irrigationtechnology')),
                ('kebele', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='projects', to='geography.kebele')),
                ('project_type', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='projects', to='geography.projecttype')),
                ('region', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='projects', to='geography.region')),
                ('water_source', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='projects', to='geography.watersource')),
                ('woreda', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='projects', to='geography.woreda')),
                ('zone', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='projects', to='geography.zone')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProjectCrop',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('crop', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='geography.crop')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='projects.project')),
            ],
            options={
                'unique_together': {('project', 'crop')},
            },
        ),
        migrations.AddField(
            model_name='project',
            name='crops',
            field=models.ManyToManyField(related_name='projects', through='projects.ProjectCrop', to='geography.crop'),
        ),
        migrations.CreateModel(
            name='ProjectMilestone',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('planned_date', models.DateField(blank=True, null=True)),
                ('actual_date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('in_progress', 'In progress'), ('completed', 'Completed'), ('delayed', 'Delayed')], default='pending', max_length=20)),
                ('notes', models.TextField(blank=True)),
                ('milestone_type', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='projects.milestonetype')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='milestones', to='projects.project')),
            ],
            options={
                'ordering': ['project', 'milestone_type__sequence_order'],
            },
        ),
        migrations.AddIndex(
            model_name='project',
            index=models.Index(fields=['region'], name='projects_pr_region__544c8e_idx'),
        ),
        migrations.AddIndex(
            model_name='project',
            index=models.Index(fields=['overall_status_flag'], name='projects_pr_overall_f70e86_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='projectmilestone',
            unique_together={('project', 'milestone_type')},
        ),
    ]
