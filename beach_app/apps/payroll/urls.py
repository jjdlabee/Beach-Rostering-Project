from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HoursEntryViewSet, PayPeriodViewSet, PaySlipViewSet

router = DefaultRouter()
router.register(r'hours',   HoursEntryViewSet, basename='hours')
router.register(r'periods', PayPeriodViewSet,  basename='payperiod')
router.register(r'slips',   PaySlipViewSet,    basename='payslip')

urlpatterns = [
    path('', include(router.urls)),
]
