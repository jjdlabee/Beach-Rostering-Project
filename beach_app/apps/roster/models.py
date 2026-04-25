from django.db import models
from apps.workers.models import Worker


class Shift(models.Model):
    """
    Defines a named shift (e.g. Morning, Afternoon, Full Day).
    Reusable across the roster.
    """
    name       = models.CharField(max_length=50, unique=True)
    start_time = models.TimeField()
    end_time   = models.TimeField()
    color      = models.CharField(max_length=7, default='#3B82F6', help_text='Hex color for calendar display.')

    class Meta:
        ordering = ['start_time']

    def __str__(self):
        return f'{self.name} ({self.start_time} – {self.end_time})'


class RosterEntry(models.Model):
    """
    Assigns a worker to a shift on a specific date.
    One worker can only have one shift per date.
    """
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        CONFIRMED = 'confirmed', 'Confirmed'
        ABSENT    = 'absent',    'Absent'
        SWAPPED   = 'swapped',   'Swapped'

    worker  = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='roster_entries')
    shift   = models.ForeignKey(Shift,  on_delete=models.CASCADE, related_name='roster_entries')
    date    = models.DateField()
    status  = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED)
    notes   = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering     = ['date', 'shift__start_time']
        unique_together = ['worker', 'date']   # one shift per worker per day

    def __str__(self):
        return f'{self.worker} — {self.shift} on {self.date}'
