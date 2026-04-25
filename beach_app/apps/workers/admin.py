from django.contrib import admin
from .models import Worker


@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display  = ['full_name', 'job_title', 'pay_type', 'pay_rate', 'status', 'date_hired']
    list_filter   = ['status', 'pay_type', 'nis_exempt']
    search_fields = ['first_name', 'last_name', 'email']
    ordering      = ['last_name']
