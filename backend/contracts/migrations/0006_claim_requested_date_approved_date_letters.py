from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0005_contract_advance_payment_recovery_rate'),
    ]

    operations = [
        migrations.RenameField(
            model_name='claim',
            old_name='claim_date',
            new_name='requested_date',
        ),
        migrations.AddField(
            model_name='claim',
            name='approved_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='claim',
            name='request_letter',
            field=models.FileField(blank=True, null=True, upload_to='claims/request_letters/'),
        ),
        migrations.AddField(
            model_name='claim',
            name='approval_letter',
            field=models.FileField(blank=True, null=True, upload_to='claims/approval_letters/'),
        ),
    ]
