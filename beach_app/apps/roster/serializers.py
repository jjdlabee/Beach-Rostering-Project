# serializers.py
from rest_framework import serializers
from .models import Shift, RosterEntry
from apps.workers.serializers import WorkerSummarySerializer


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Shift
        fields = '__all__'


class RosterEntrySerializer(serializers.ModelSerializer):
    worker_detail = WorkerSummarySerializer(source='worker', read_only=True)
    shift_detail  = ShiftSerializer(source='shift',  read_only=True)

    class Meta:
        model  = RosterEntry
        fields = '__all__'
