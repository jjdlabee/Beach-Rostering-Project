from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
import django_filters

from apps.workers.models import Worker
from .models import HoursEntry, PayPeriod, PaySlip
from .serializers import (
    HoursEntrySerializer,
    PayPeriodSerializer,
    PayPeriodListSerializer,
    PaySlipSerializer,
)


class HoursEntryFilter(django_filters.FilterSet):
    date__gte = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date__lte = django_filters.DateFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model  = HoursEntry
        fields = ['worker', 'date']


class HoursEntryViewSet(viewsets.ModelViewSet):
    queryset         = HoursEntry.objects.select_related('worker').all()
    serializer_class = HoursEntrySerializer
    filter_backends  = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class  = HoursEntryFilter
    ordering_fields  = ['date', 'worker']


class PayPeriodViewSet(viewsets.ModelViewSet):
    queryset = PayPeriod.objects.prefetch_related('payslips__worker').all()
    filter_backends  = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'period_type']
    ordering_fields  = ['start_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return PayPeriodListSerializer
        return PayPeriodSerializer

    @action(detail=True, methods=['post'], url_path='calculate')
    def calculate(self, request, pk=None):
        """
        POST /api/payroll/periods/{id}/calculate/

        Creates or refreshes PaySlip records for every active worker
        within the pay period, running all TT payroll deduction logic.
        Returns the fully populated pay period with all payslips.
        """
        period  = self.get_object()
        workers = Worker.objects.filter(status=Worker.Status.ACTIVE)
        slips   = []

        for worker in workers:
            slip, _ = PaySlip.objects.get_or_create(pay_period=period, worker=worker)
            slip.calculate()
            slips.append(slip)

        serializer = PayPeriodSerializer(period)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='finalise')
    def finalise(self, request, pk=None):
        """Lock the pay period so it can no longer be edited."""
        period = self.get_object()
        if period.status == PayPeriod.Status.PAID:
            return Response({'detail': 'Period is already marked as paid.'}, status=400)
        period.status = PayPeriod.Status.FINALISED
        period.save()
        return Response(PayPeriodSerializer(period).data)

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        period = self.get_object()
        period.status = PayPeriod.Status.PAID
        period.save()
        return Response(PayPeriodSerializer(period).data)


class PaySlipViewSet(viewsets.ModelViewSet):
    queryset         = PaySlip.objects.select_related('worker', 'pay_period').all()
    serializer_class = PaySlipSerializer
    filter_backends  = [DjangoFilterBackend]
    filterset_fields = ['pay_period', 'worker']

    @action(detail=True, methods=['post'], url_path='recalculate')
    def recalculate(self, request, pk=None):
        """Re-run payroll calculation for a single payslip."""
        slip = self.get_object()
        slip.calculate()
        return Response(PaySlipSerializer(slip).data)
