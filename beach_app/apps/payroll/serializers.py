from rest_framework import serializers
from .models import HoursEntry, PayPeriod, PaySlip
from apps.workers.serializers import WorkerSummarySerializer


class HoursEntrySerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)

    class Meta:
        model  = HoursEntry
        fields = '__all__'

    def validate(self, data):
        clock_in  = data.get('clock_in')
        clock_out = data.get('clock_out')
        hours     = data.get('hours_worked')

        if clock_in and clock_out and clock_out <= clock_in:
            raise serializers.ValidationError('clock_out must be after clock_in.')

        if not hours and not (clock_in and clock_out):
            raise serializers.ValidationError(
                'Provide either hours_worked directly, or both clock_in and clock_out.'
            )
        return data


class PaySlipSerializer(serializers.ModelSerializer):
    worker = WorkerSummarySerializer(read_only=True)
    worker_id = serializers.PrimaryKeyRelatedField(
        source='worker', queryset=__import__('apps.workers.models', fromlist=['Worker']).Worker.objects.all(),
        write_only=True
    )

    class Meta:
        model  = PaySlip
        fields = '__all__'
        read_only_fields = [
            'gross_pay', 'nis_deduction', 'health_surcharge',
            'net_pay', 'nis_rate_used', 'health_surcharge_applied',
            'total_hours', 'created_at', 'updated_at',
        ]


class PayPeriodSerializer(serializers.ModelSerializer):
    payslips = PaySlipSerializer(many=True, read_only=True)
    total_gross = serializers.SerializerMethodField()
    total_net   = serializers.SerializerMethodField()

    class Meta:
        model  = PayPeriod
        fields = '__all__'

    def get_total_gross(self, obj):
        return sum(p.gross_pay for p in obj.payslips.all())

    def get_total_net(self, obj):
        return sum(p.net_pay for p in obj.payslips.all())

    def validate(self, data):
        if data.get('end_date') and data.get('start_date'):
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError('end_date must be on or after start_date.')
        return data


class PayPeriodListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views — no nested payslips."""
    class Meta:
        model  = PayPeriod
        fields = ['id', 'period_type', 'start_date', 'end_date', 'status', 'created_at']
