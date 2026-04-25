from django.contrib import admin
from .models import Shed, Booking


@admin.register(Shed)
class ShedAdmin(admin.ModelAdmin):
    list_display = ['name', 'capacity', 'is_active', 'color']
    list_filter  = ['is_active']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display  = ['shed', 'customer_name', 'start_date', 'end_date', 'status', 'total_price']
    list_filter   = ['status', 'shed']
    search_fields = ['customer_name', 'customer_email', 'customer_phone']
    ordering      = ['-start_date']
    readonly_fields = ['created_at', 'updated_at']
