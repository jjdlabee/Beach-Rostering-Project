from django.contrib import admin
from .models import HoursEntry, PayPeriod, PaySlip


@admin.register(HoursEntry)
class HoursEntryAdmin(admin.ModelAdmin):
    list_display  = ['worker', 'date', 'hours_worked', 'clock_in', 'clock_out']
    list_filter   = ['date', 'worker']
    search_fields = ['worker__first_name', 'worker__last_name']
    ordering      = ['-date']


class PaySlipInline(admin.TabularInline):
    model  = PaySlip
    extra  = 0
    fields = ['worker', 'total_hours', 'gross_pay', 'nis_deduction', 'health_surcharge', 'net_pay']
    readonly_fields = ['total_hours', 'gross_pay', 'nis_deduction', 'health_surcharge', 'net_pay']


@admin.register(PayPeriod)
class PayPeriodAdmin(admin.ModelAdmin):
    list_display  = ['__str__', 'status', 'start_date', 'end_date']
    list_filter   = ['status', 'period_type']
    inlines       = [PaySlipInline]


@admin.register(PaySlip)
class PaySlipAdmin(admin.ModelAdmin):
    list_display  = ['worker', 'pay_period', 'gross_pay', 'nis_deduction', 'health_surcharge', 'net_pay']
    list_filter   = ['pay_period__status']
    search_fields = ['worker__first_name', 'worker__last_name']
    readonly_fields = ['gross_pay', 'nis_deduction', 'health_surcharge', 'net_pay',
                       'nis_rate_used', 'health_surcharge_applied', 'total_hours']
