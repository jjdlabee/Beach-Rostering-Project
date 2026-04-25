from rest_framework import serializers
from .models import Worker


class WorkerSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model  = Worker
        fields = '__all__'


class WorkerSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer used in nested contexts (e.g. roster, payroll)."""
    full_name = serializers.ReadOnlyField()

    class Meta:
        model  = Worker
        fields = ['id', 'full_name', 'job_title', 'pay_type', 'pay_rate', 'status']
