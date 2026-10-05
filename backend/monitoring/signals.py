"""
monitoring/signals.py

Automatically update Project status fields when ProgressRecords are created/updated.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from decimal import Decimal
from .models import ProgressRecord


def update_project_status(project):
    """
    Recalculate and update project status based on latest progress record.
    """
    latest_record = project.progress_records.order_by('-record_date').first()
    
    if not latest_record:
        # No progress records yet, keep defaults
        project.physical_status_pct = Decimal('0.00')
        project.financial_status_pct = Decimal('0.00')
        project.overall_status_flag = 'on_track'
    else:
        # Update percentages from latest record
        project.physical_status_pct = Decimal(str(latest_record.physical_progress_pct))
        project.financial_status_pct = Decimal(str(latest_record.financial_progress_pct))
        
        # Calculate overall status based on progress and time
        physical = latest_record.physical_progress_pct
        financial = latest_record.financial_progress_pct
        time = latest_record.time_progress_pct
        
        # Status determination logic
        if physical >= 100 and financial >= 100:
            project.overall_status_flag = 'completed'
        elif time > 0:
            # Compare progress vs time elapsed
            avg_progress = (physical + financial) / 2
            variance = avg_progress - time
            
            if variance >= -5:  # Within 5% of schedule
                project.overall_status_flag = 'on_track'
            elif variance >= -15:  # 5-15% behind
                project.overall_status_flag = 'delayed'
            else:  # More than 15% behind
                project.overall_status_flag = 'critical'
        else:
            # No time data, use simple thresholds
            avg_progress = (physical + financial) / 2
            if avg_progress >= 75:
                project.overall_status_flag = 'on_track'
            elif avg_progress >= 50:
                project.overall_status_flag = 'delayed'
            else:
                project.overall_status_flag = 'critical'
    
    project.save(update_fields=['physical_status_pct', 'financial_status_pct', 'overall_status_flag'])


@receiver(post_save, sender=ProgressRecord)
def progress_record_saved(sender, instance, created, **kwargs):
    """
    When a progress record is created or updated, recalculate project status.
    """
    update_project_status(instance.project)


@receiver(post_delete, sender=ProgressRecord)
def progress_record_deleted(sender, instance, **kwargs):
    """
    When a progress record is deleted, recalculate project status.
    """
    update_project_status(instance.project)
