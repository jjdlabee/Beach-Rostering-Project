from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Worker
from .serializers import WorkerSerializer


class WorkerViewSet(viewsets.ModelViewSet):
    queryset = Worker.objects.all()
    serializer_class = WorkerSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'pay_type']
    search_fields    = ['first_name', 'last_name', 'email', 'job_title']
    ordering_fields  = ['last_name', 'date_hired', 'pay_rate']
