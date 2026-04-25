from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings as django_settings
from .models import Shed, Booking
from .serializers import PublicShedSerializer, PublicBookingSerializer


class PricingView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'shed_base_price':           django_settings.SHED_BASE_PRICE,
            'electricity_price':         django_settings.SHED_ELECTRICITY_PRICE,
            'washroom_price_per_person': django_settings.SHED_WASHROOM_PRICE,
            'free_vehicles':             django_settings.SHED_FREE_VEHICLES,
            'extra_vehicle_price':       django_settings.SHED_EXTRA_VEHICLE_PRICE,
            'payment_url':               django_settings.SHED_PAYMENT_URL,
        })


class PublicShedViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = Shed.objects.filter(is_active=True)
    serializer_class   = PublicShedSerializer
    permission_classes = [AllowAny]

    @action(detail=True, methods=['get'], url_path='availability')
    def availability(self, request, pk=None):
        """
        GET /api/public/sheds/{id}/availability/?date=YYYY-MM-DD

        Returns whether the shed is available on the given date.
        """
        from datetime import date
        shed     = self.get_object()
        date_str = request.query_params.get('date')
        try:
            check_date = date.fromisoformat(date_str)
        except (TypeError, ValueError):
            return Response({'detail': 'Provide ?date=YYYY-MM-DD'}, status=400)

        booked = Booking.objects.filter(
            shed=shed,
            status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
            start_date__lte=check_date,
            end_date__gte=check_date,
        ).exists()

        return Response({'available': not booked, 'date': date_str})


class PublicBookingCreateView(generics.CreateAPIView):
    serializer_class   = PublicBookingSerializer
    permission_classes = [AllowAny]
