from django.contrib import admin
from .models import Shift, RosterEntry


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_time', 'end_time', 'color']


@admin.register(RosterEntry)
class RosterEntryAdmin(admin.ModelAdmin):
    list_display  = ['worker', 'shift', 'date', 'status']
    list_filter   = ['status', 'shift', 'date']
    search_fields = ['worker__first_name', 'worker__last_name']
    ordering      = ['-date']
