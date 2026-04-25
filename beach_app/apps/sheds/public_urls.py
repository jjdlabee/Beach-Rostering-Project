from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .public_views import PublicShedViewSet, PublicBookingCreateView, PricingView

router = DefaultRouter()
router.register(r'sheds', PublicShedViewSet, basename='public-shed')

urlpatterns = [
    path('',         include(router.urls)),
    path('bookings/', PublicBookingCreateView.as_view(), name='public-booking-create'),
    path('pricing/',  PricingView.as_view(),             name='public-pricing'),
]
