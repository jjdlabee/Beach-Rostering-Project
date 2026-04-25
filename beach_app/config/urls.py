from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT auth endpoints
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # App API routes (authenticated)
    path('api/workers/', include('apps.workers.urls')),
    path('api/payroll/', include('apps.payroll.urls')),
    path('api/roster/',  include('apps.roster.urls')),
    path('api/sheds/',   include('apps.sheds.urls')),

    # Public API routes (no auth required)
    path('api/public/', include('apps.sheds.public_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
