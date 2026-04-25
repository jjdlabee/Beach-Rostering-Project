# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShiftViewSet, RosterEntryViewSet

router = DefaultRouter()
router.register(r'shifts',  ShiftViewSet,       basename='shift')
router.register(r'entries', RosterEntryViewSet, basename='rosterentry')

urlpatterns = [path('', include(router.urls))]
