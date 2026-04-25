from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Shift, RosterEntry
from .serializers import ShiftSerializer, RosterEntrySerializer


class ShiftViewSet(viewsets.ModelViewSet):
    queryset         = Shift.objects.all()
    serializer_class = ShiftSerializer


class RosterEntryViewSet(viewsets.ModelViewSet):
    queryset         = RosterEntry.objects.select_related('worker', 'shift').all()
    serializer_class = RosterEntrySerializer
    filter_backends  = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['worker', 'shift', 'date', 'status']
    ordering_fields  = ['date', 'shift__start_time']

    @action(detail=False, methods=['get'], url_path='week')
    def week(self, request):
        """
        GET /api/roster/entries/week/?start=YYYY-MM-DD

        Returns all roster entries for the 7-day week starting from `start`.
        Used to power the weekly roster grid view in the frontend.
        """
        from datetime import date, timedelta
        start_str = request.query_params.get('start')
        try:
            start = date.fromisoformat(start_str)
        except (TypeError, ValueError):
            return Response({'detail': 'Provide a valid ?start=YYYY-MM-DD param.'}, status=400)

        end = start + timedelta(days=6)
        entries = self.queryset.filter(date__gte=start, date__lte=end)
        serializer = self.get_serializer(entries, many=True)
        return Response(serializer.data)
