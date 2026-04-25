from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Shed, Booking
from .serializers import ShedSerializer, BookingSerializer


class ShedViewSet(viewsets.ModelViewSet):
    queryset         = Shed.objects.all()
    serializer_class = ShedSerializer
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['name']

    @action(detail=True, methods=['get'], url_path='availability')
    def availability(self, request, pk=None):
        """
        GET /api/sheds/{id}/availability/?start=YYYY-MM-DD&end=YYYY-MM-DD

        Returns confirmed/pending bookings within the given date range
        so the frontend calendar can mark unavailable days.
        """
        from datetime import date
        shed      = self.get_object()
        start_str = request.query_params.get('start')
        end_str   = request.query_params.get('end')
        try:
            start = date.fromisoformat(start_str)
            end   = date.fromisoformat(end_str)
        except (TypeError, ValueError):
            return Response({'detail': 'Provide ?start=YYYY-MM-DD&end=YYYY-MM-DD'}, status=400)

        bookings = Booking.objects.filter(
            shed=shed,
            status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
            start_date__lte=end,
            end_date__gte=start,
        )
        return Response(BookingSerializer(bookings, many=True).data)


class BookingViewSet(viewsets.ModelViewSet):
    queryset         = Booking.objects.select_related('shed').all()
    serializer_class = BookingSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['shed', 'status', 'start_date', 'end_date']
    search_fields    = ['customer_name', 'customer_email', 'customer_phone']
    ordering_fields  = ['start_date', 'created_at']

    @action(detail=False, methods=['get'], url_path='calendar')
    def calendar(self, request):
        """
        GET /api/sheds/bookings/calendar/?start=YYYY-MM-DD&end=YYYY-MM-DD

        Returns all bookings across all sheds in a range,
        formatted for FullCalendar consumption.
        """
        from datetime import date
        start_str = request.query_params.get('start')
        end_str   = request.query_params.get('end')
        try:
            start = date.fromisoformat(start_str)
            end   = date.fromisoformat(end_str)
        except (TypeError, ValueError):
            return Response({'detail': 'Provide ?start=YYYY-MM-DD&end=YYYY-MM-DD'}, status=400)

        bookings = self.queryset.filter(
            status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
            start_date__lte=end,
            end_date__gte=start,
        )

        # Format for FullCalendar
        events = [
            {
                'id': b.id,
                'title': f'{b.shed.name} — {b.customer_name}',
                'start': b.start_date.isoformat(),
                'end':   b.end_date.isoformat(),
                'color': b.shed.color,
                'extendedProps': {
                    'shed_id':      b.shed_id,
                    'shed_name':    b.shed.name,
                    'customer':     b.customer_name,
                    'phone':        b.customer_phone,
                    'status':       b.status,
                    'num_guests':   b.num_guests,
                    'total_price':  str(b.total_price) if b.total_price else None,
                    'deposit_paid': str(b.deposit_paid),
                    'notes':        b.notes,
                }
            }
            for b in bookings
        ]
        return Response(events)
