from django.db import models


class Worker(models.Model):
    """
    Represents a beach facility employee.
    Stores personal info, pay rate, and employment status.
    """

    class PayType(models.TextChoices):
        HOURLY  = 'hourly',  'Hourly'
        DAILY   = 'daily',   'Daily'
        WEEKLY  = 'weekly',  'Weekly'

    class Status(models.TextChoices):
        ACTIVE   = 'active',   'Active'
        INACTIVE = 'inactive', 'Inactive'

    # Personal details
    first_name    = models.CharField(max_length=100)
    last_name     = models.CharField(max_length=100)
    email         = models.EmailField(unique=True, blank=True, null=True)
    phone         = models.CharField(max_length=20, blank=True)
    address       = models.TextField(blank=True)

    # Employment details
    job_title     = models.CharField(max_length=100, blank=True)
    date_hired    = models.DateField()
    status        = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    # Pay configuration
    pay_type      = models.CharField(max_length=10, choices=PayType.choices, default=PayType.HOURLY)
    pay_rate      = models.DecimalField(
        max_digits=8, decimal_places=2,
        help_text='Rate in TTD. Meaning depends on pay_type (per hour / per day / per week).'
    )

    # NIS / Health Surcharge — can override defaults per worker if needed
    nis_exempt            = models.BooleanField(default=False, help_text='Exempt from NIS deductions (e.g. over 60).')
    health_surcharge_exempt = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.first_name} {self.last_name}'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'
