# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShedViewSet, BookingViewSet

router = DefaultRouter()
router.register(r'sheds',    ShedViewSet,    basename='shed')
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [path('', include(router.urls))]
