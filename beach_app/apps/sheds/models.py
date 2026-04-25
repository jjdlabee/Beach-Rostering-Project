from django.db import models


class Shed(models.Model):
    """
    A bookable beach shed / facility.
    """
    name        = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    capacity    = models.PositiveIntegerField(default=1, help_text='Max number of occupants.')
    is_active   = models.BooleanField(default=True, help_text='Inactive sheds cannot be booked.')
    color       = models.CharField(max_length=7, default='#10B981', help_text='Hex color for calendar display.')

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Booking(models.Model):
    """
    A shed booking for a specific date range and customer.
    """
    class Status(models.TextChoices):
        PENDING   = 'pending',   'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
        COMPLETED = 'completed', 'Completed'

    shed          = models.ForeignKey(Shed, on_delete=models.CASCADE, related_name='bookings')

    # Customer info (no separate Customer model — keep it simple for now)
    customer_name  = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=20, blank=True)
    customer_email = models.EmailField(blank=True)

    # Booking window
    start_date    = models.DateField()
    end_date      = models.DateField()
    start_time    = models.TimeField(blank=True, null=True, help_text='Optional — for half-day bookings.')
    end_time      = models.TimeField(blank=True, null=True)

    # Booking details
    status        = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    num_guests    = models.PositiveIntegerField(default=1)
    total_price   = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    deposit_paid  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes         = models.TextField(blank=True)

    # Add-on selections (drive automatic price calculation for public bookings)
    wants_electricity   = models.BooleanField(default=False)
    num_washroom_passes = models.PositiveIntegerField(default=0)
    num_vehicles        = models.PositiveIntegerField(default=0)

    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date', 'shed']

    def __str__(self):
        return f'{self.shed} | {self.customer_name} | {self.start_date} → {self.end_date}'

    def calculate_total(self):
        from django.conf import settings
        from decimal import Decimal
        total = Decimal(str(settings.SHED_BASE_PRICE))
        if self.wants_electricity:
            total += Decimal(str(settings.SHED_ELECTRICITY_PRICE))
        total += Decimal(self.num_washroom_passes) * Decimal(str(settings.SHED_WASHROOM_PRICE))
        extra_vehicles = max(0, self.num_vehicles - settings.SHED_FREE_VEHICLES)
        total += Decimal(extra_vehicles) * Decimal(str(settings.SHED_EXTRA_VEHICLE_PRICE))
        return total

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.end_date < self.start_date:
            raise ValidationError('end_date must be on or after start_date.')
        if self.status != self.Status.CANCELLED:
            # Check for overlapping bookings on the same shed
            overlapping = Booking.objects.filter(
                shed=self.shed,
                status__in=[self.Status.PENDING, self.Status.CONFIRMED],
                start_date__lte=self.end_date,
                end_date__gte=self.start_date,
            ).exclude(pk=self.pk)
            if overlapping.exists():
                raise ValidationError(
                    f'"{self.shed}" is already booked for part or all of that period.'
                )
