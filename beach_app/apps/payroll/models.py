from django.db import models
from django.conf import settings
from decimal import Decimal, ROUND_HALF_UP
from apps.workers.models import Worker


class HoursEntry(models.Model):
    """
    Records hours worked by a worker on a specific date.
    Supports manual entry and clock-in/clock-out tracking.
    """
    worker      = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='hours_entries')
    date        = models.DateField()
    clock_in    = models.TimeField(blank=True, null=True)
    clock_out   = models.TimeField(blank=True, null=True)
    hours_worked = models.DecimalField(
        max_digits=5, decimal_places=2,
        help_text='Can be entered manually or auto-calculated from clock_in / clock_out.'
    )
    notes       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'worker']
        unique_together = ['worker', 'date']   # one entry per worker per day

    def __str__(self):
        return f'{self.worker} — {self.date} ({self.hours_worked}h)'

    def save(self, *args, **kwargs):
        # Auto-calculate hours if clock in/out are provided and hours_worked is not set manually
        if self.clock_in and self.clock_out and not self.hours_worked:
            from datetime import datetime, date
            dt_in  = datetime.combine(date.today(), self.clock_in)
            dt_out = datetime.combine(date.today(), self.clock_out)
            delta  = dt_out - dt_in
            self.hours_worked = Decimal(str(round(delta.seconds / 3600, 2)))
        super().save(*args, **kwargs)


class PayPeriod(models.Model):
    """
    Defines a pay period (daily or weekly) and stores the computed payroll
    for all workers within that period.
    """
    class PeriodType(models.TextChoices):
        DAILY  = 'daily',  'Daily'
        WEEKLY = 'weekly', 'Weekly'

    class Status(models.TextChoices):
        DRAFT    = 'draft',    'Draft'
        FINALISED = 'finalised', 'Finalised'
        PAID     = 'paid',     'Paid'

    period_type = models.CharField(max_length=10, choices=PeriodType.choices)
    start_date  = models.DateField()
    end_date    = models.DateField()
    status      = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    notes       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f'{self.get_period_type_display()} period: {self.start_date} → {self.end_date} [{self.status}]'


class PaySlip(models.Model):
    """
    Individual pay record for one worker within a PayPeriod.
    All monetary values are in TTD.
    """
    pay_period       = models.ForeignKey(PayPeriod, on_delete=models.CASCADE, related_name='payslips')
    worker           = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='payslips')

    # Earnings
    total_hours      = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    gross_pay        = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Deductions
    nis_deduction            = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    health_surcharge         = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    other_deductions         = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    other_deductions_notes   = models.TextField(blank=True)

    # Net
    net_pay          = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Snapshot of the rates used (so historical records are accurate even if rates change)
    nis_rate_used            = models.DecimalField(max_digits=5, decimal_places=4, default=0)
    health_surcharge_applied = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['pay_period', 'worker']
        unique_together = ['pay_period', 'worker']

    def __str__(self):
        return f'{self.worker} | {self.pay_period} | Net: TTD {self.net_pay}'

    # ─── Payroll calculation logic ───────────────────────────────────────────

    def calculate(self):
        """
        Compute gross pay, deductions, and net pay for this worker/period.
        Reads hours from manual HoursEntry records first, then fills in any
        gaps from past RosterEntry records (scheduled/confirmed) within the
        period. Manual entries take precedence — roster hours are only used
        for dates that have no HoursEntry.
        Stores a snapshot of the rates used so historical records are stable.
        """
        from datetime import date as today_date, datetime, timedelta
        from apps.roster.models import RosterEntry

        worker = self.worker
        period = self.pay_period

        # 1. Manual HoursEntry records within the period
        hours_qs = worker.hours_entries.filter(
            date__gte=period.start_date,
            date__lte=period.end_date,
        )
        logged_dates = set(hours_qs.values_list('date', flat=True))
        manual_hours = sum(e.hours_worked for e in hours_qs) or Decimal('0')

        # 2. Past roster entries not already covered by a manual HoursEntry
        roster_qs = RosterEntry.objects.filter(
            worker=worker,
            date__gte=period.start_date,
            date__lte=min(period.end_date, today_date.today()),
            status__in=[RosterEntry.Status.SCHEDULED, RosterEntry.Status.CONFIRMED],
        ).select_related('shift').exclude(date__in=logged_dates)

        roster_hours = Decimal('0')
        roster_days: set = set()
        for entry in roster_qs:
            shift = entry.shift
            dt_start = datetime.combine(entry.date, shift.start_time)
            dt_end   = datetime.combine(entry.date, shift.end_time)
            if dt_end <= dt_start:          # overnight shift
                dt_end += timedelta(days=1)
            hours = Decimal(str(round((dt_end - dt_start).total_seconds() / 3600, 2)))
            roster_hours += hours
            roster_days.add(entry.date)

        total_hours = manual_hours + roster_hours
        self.total_hours = total_hours

        # 3. Gross pay
        rate = Decimal(str(worker.pay_rate))
        if worker.pay_type == Worker.PayType.HOURLY:
            gross = total_hours * rate
        elif worker.pay_type == Worker.PayType.DAILY:
            # Count distinct days from both sources
            days_worked = hours_qs.values('date').distinct().count() + len(roster_days)
            gross = Decimal(days_worked) * rate
        else:  # WEEKLY — flat weekly salary regardless of hours
            gross = rate

        self.gross_pay = gross.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        # 3. NIS deduction — applied to insurable wages, capped at weekly ceiling
        if worker.nis_exempt:
            self.nis_deduction = Decimal('0.00')
            self.nis_rate_used = Decimal('0.0000')
        else:
            nis_rate = Decimal(str(settings.NIS_EMPLOYEE_RATE))
            ceiling  = Decimal(str(settings.NIS_INSURABLE_WAGE_CEILING))
            insurable_wages = min(self.gross_pay, ceiling)
            self.nis_rate_used = nis_rate
            self.nis_deduction = (insurable_wages * nis_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        # 4. Health Surcharge (weekly flat rate; pro-rate for daily periods)
        if worker.health_surcharge_exempt:
            self.health_surcharge = Decimal('0.00')
        else:
            weekly_gross = self.gross_pay if period.period_type == PayPeriod.PeriodType.WEEKLY else self.gross_pay * 5
            threshold    = Decimal(str(settings.HEALTH_SURCHARGE_THRESHOLD))
            if weekly_gross > threshold:
                weekly_hs = Decimal(str(settings.HEALTH_SURCHARGE_WEEKLY_HIGH))
            else:
                weekly_hs = Decimal(str(settings.HEALTH_SURCHARGE_WEEKLY_LOW))

            # Scale down for daily pay periods (1/5 of weekly surcharge)
            if period.period_type == PayPeriod.PeriodType.DAILY:
                self.health_surcharge = (weekly_hs / 5).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            else:
                self.health_surcharge = weekly_hs

        self.health_surcharge_applied = self.health_surcharge

        # 5. Net pay
        total_deductions = self.nis_deduction + self.health_surcharge + self.other_deductions
        self.net_pay = (self.gross_pay - total_deductions).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        self.save()
        return self
