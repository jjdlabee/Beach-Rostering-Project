from rest_framework import serializers
from .models import Shed, Booking


class ShedSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Shed
        fields = '__all__'


class BookingSerializer(serializers.ModelSerializer):
    shed_name = serializers.CharField(source='shed.name', read_only=True)
    shed_color = serializers.CharField(source='shed.color', read_only=True)

    class Meta:
        model  = Booking
        fields = '__all__'

    def validate(self, data):
        instance = self.instance
        shed       = data.get('shed', getattr(instance, 'shed', None))
        start_date = data.get('start_date', getattr(instance, 'start_date', None))
        end_date   = data.get('end_date',   getattr(instance, 'end_date', None))
        req_status = data.get('status',     getattr(instance, 'status', Booking.Status.PENDING))

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError('end_date must be on or after start_date.')

        if req_status not in [Booking.Status.CANCELLED]:
            overlapping = Booking.objects.filter(
                shed=shed,
                status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
                start_date__lte=end_date,
                end_date__gte=start_date,
            )
            if instance:
                overlapping = overlapping.exclude(pk=instance.pk)
            if overlapping.exists():
                raise serializers.ValidationError(
                    f'"{shed}" is already booked for part or all of that period.'
                )
        return data


# ── Public serializers (no auth required) ─────────────────────────────────────

class PublicShedSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Shed
        fields = ['id', 'name', 'description', 'capacity', 'color']


class PublicBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Booking
        fields = [
            'id', 'shed', 'customer_name', 'customer_phone', 'customer_email',
            'start_date', 'end_date', 'num_guests',
            'wants_electricity', 'num_washroom_passes', 'num_vehicles',
            'notes', 'total_price', 'status',
        ]
        read_only_fields = ['id', 'status', 'total_price']

    def validate(self, data):
        start_date = data.get('start_date')
        end_date   = data.get('end_date')
        shed       = data.get('shed')

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError('end_date must be on or after start_date.')

        overlapping = Booking.objects.filter(
            shed=shed,
            status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
            start_date__lte=end_date,
            end_date__gte=start_date,
        )
        if overlapping.exists():
            raise serializers.ValidationError(
                f'"{shed}" is already booked for that date. Please choose a different date.'
            )
        return data

    def create(self, validated_data):
        booking = Booking(**validated_data)
        booking.status      = Booking.Status.PENDING
        booking.total_price = booking.calculate_total()
        booking.save()
        return booking
