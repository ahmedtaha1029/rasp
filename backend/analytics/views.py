# analytics/views.py
from django.db.models import Count, Q, Avg, F
from rest_framework import permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdministrator
from .models import AnalyticsMetric, MitreEducationalResource
from .serializers import (
    AnalyticsMetricSerializer,
    MitreTechniqueFrequencySerializer,
    ReportExportSerializer,
)


class OverallPlatformView(APIView):
    """
    GET /api/analytics/overview/

    Fix #14: Added active_sessions counter.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def get(self, request: Request) -> Response:
        from simulations.models import SimulationSession
        from telemetry.models import UserAction
        from scenarios.models import AttackVector

        total_sessions = SimulationSession.objects.count()
        completed_sessions = SimulationSession.objects.filter(
            status=SimulationSession.Status.COMPLETED
        ).count()

        # Fix #14: Active sessions live counter
        active_sessions = SimulationSession.objects.filter(
            status=SimulationSession.Status.ACTIVE
        ).count()

        actions = UserAction.objects.all()
        total_actions = actions.count()
        total_detected = actions.filter(detected=True).count()
        overall_rate = (total_detected / total_actions) if total_actions else 0.0

        avg_time_qs = actions.filter(
            detected=True, time_to_detect__isnull=False
        ).aggregate(avg=Avg("time_to_detect"))
        avg_time_ms = round(avg_time_qs["avg"] or 0)

        all_metrics = AnalyticsMetric.objects.select_related(
            "stage__scenario"
        ).order_by("stage__scenario__title", "stage__stage_order")
        stage_breakdown = AnalyticsMetricSerializer(all_metrics, many=True).data

        vectors = AttackVector.objects.values("mitre_id").annotate(
            total=Count("stage__user_actions", distinct=True),
            misses=Count(
                "stage__user_actions",
                filter=Q(stage__user_actions__detected=False),
                distinct=True,
            ),
        ).filter(mitre_id__isnull=False).exclude(mitre_id="")

        mitre_list = []
        for v in vectors:
            total = v["total"] or 0
            misses = v["misses"] or 0
            mitre_list.append({
                "mitre_id": v["mitre_id"],
                "technique_description": v["mitre_id"],
                "total_presentations": total,
                "total_misses": misses,
                "miss_rate": (misses / total) if total else 0.0,
            })
        mitre_list.sort(key=lambda x: x["miss_rate"], reverse=True)

        return Response({
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "active_sessions": active_sessions,        # ← Fix #14
            "total_actions": total_actions,
            "total_detections": total_detected,
            "overall_detection_rate": round(overall_rate, 3),
            "avg_time_to_detect_ms": avg_time_ms,
            "stage_breakdown": stage_breakdown,
            "mitre_frequency": mitre_list[:10],
        })

class MitreTechniqueFrequencyView(APIView):
    """
    GET /api/analytics/mitre/?scenario_id=1
    FR-17: MITRE ATT&CK technique miss frequency, sorted by miss_rate desc.
    Optional ?scenario_id filter.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def get(self, request: Request) -> Response:
        from scenarios.models import AttackVector

        scenario_id = request.query_params.get("scenario_id")
        if not scenario_id:
            return Response(
                {"detail": "scenario_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        qs = AttackVector.objects.values("mitre_id").annotate(
            total_presentations=Count("stage__user_actions", distinct=True),
            total_misses=Count(
                "stage__user_actions",
                filter=Q(stage__user_actions__detected=False),
                distinct=True,
            ),
        )
        if scenario_id:
            qs = qs.filter(stage__scenario_id=scenario_id)

        results = []
        for row in qs:
            total  = row["total_presentations"] or 0
            misses = row["total_misses"] or 0
            results.append({
                "mitre_id":              row["mitre_id"],
                "technique_description": row["mitre_id"],
                "total_presentations":   total,
                "total_misses":          misses,
                "miss_rate":             (misses / total) if total > 0 else 0.0,
            })

        results.sort(key=lambda x: x["miss_rate"], reverse=True)
        serializer = MitreTechniqueFrequencySerializer(results, many=True)
        return Response(serializer.data)


class DwellTimeAnalyticsView(APIView):
    """
    GET /api/analytics/dwell/?scenario_id=1&stage_id=2

    Fix #19: Hesitation & dwell-time analytics endpoint.

    Returns per-element dwell statistics for admin analysis:
      - avg_dwell_ms: average time hovering on attack elements
      - hesitation_events: hover-then-no-action counts (cognitive load signal)
      - Segmented by stage and vector type
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def get(self, request: Request) -> Response:
        from telemetry.models import EventLog, UserAction
        from django.db.models import Avg, Count, Max, Min

        scenario_id = request.query_params.get("scenario_id")
        stage_id    = request.query_params.get("stage_id")

        # scenario_id is required when stage_id is also absent
        if not scenario_id and not stage_id:
            return Response(
                {"detail": "scenario_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Hover events from the event log
        hover_qs = EventLog.objects.filter(event_type="hover")

        if stage_id:
            hover_qs = hover_qs.filter(action__stage_id=stage_id)
        elif scenario_id:
            hover_qs = hover_qs.filter(action__stage__scenario_id=scenario_id)

        # Aggregate per element
        dwell_stats = (
            hover_qs
            .values("element", "action__stage__name", "action__stage_id")
            .annotate(
                hover_count=Count("id"),
                avg_dwell_ms=Avg("offset_ms"),
                max_dwell_ms=Max("offset_ms"),
            )
            .order_by("-avg_dwell_ms")
        )

        # Hesitation = hover on an element that is in a vector's target_elements
        # but the user's subsequent action was NOT a flag (they retreated)
        hesitation_data = []
        for row in dwell_stats:
            element = row["element"]
            stage_id_val = row["action__stage_id"]

            # Count users who hovered this element but then didn't flag/delete
            hovered_sessions = set(
                EventLog.objects.filter(
                    event_type="hover",
                    element=element,
                    action__stage_id=stage_id_val,
                ).values_list("action__session_id", flat=True)
            )
            acted_sessions = set(
                UserAction.objects.filter(
                    stage_id=stage_id_val,
                    action_type__in=["flag", "delete"],
                    session_id__in=hovered_sessions,
                ).values_list("session_id", flat=True)
            )
            hesitation_count = len(hovered_sessions) - len(acted_sessions)

            hesitation_data.append({
                "element": element,
                "stage_name": row["action__stage__name"],
                "stage_id": stage_id_val,
                "hover_count": row["hover_count"],
                "avg_dwell_ms": round(row["avg_dwell_ms"] or 0),
                "max_dwell_ms": row["max_dwell_ms"] or 0,
                "hesitation_events": max(0, hesitation_count),
            })

        return Response({
            "dwell_stats": hesitation_data,
            "total_hover_events": hover_qs.count(),
        })

class PersonalAnalyticsView(APIView):
    """
    GET /api/analytics/me
    
    Any authenticated user can view their own performance.
    Returns:
      - Sessions completed
      - Overall detection rate
      - Per-stage breakdown
      - MITRE techniques missed most
      - Average time to detect
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        from simulations.models import SimulationSession
        from telemetry.models import UserAction
        from scenarios.models import AttackVector

        user = request.user

        # Only the user's completed sessions
        sessions = SimulationSession.objects.filter(
            user=user,
            status=SimulationSession.Status.COMPLETED,
        ).select_related("scenario").order_by("-started_at")

        # All actions from those sessions
        actions       = UserAction.objects.filter(session__in=sessions)
        total_actions = actions.count()
        detected      = actions.filter(detected=True).count()
        detection_rate = (detected / total_actions) if total_actions else 0.0

        avg_time_qs = actions.filter(
            detected=True, time_to_detect__isnull=False
        ).aggregate(avg=Avg("time_to_detect"))
        avg_time_ms = round(avg_time_qs["avg"] or 0)

        # Per-stage breakdown
        stage_stats = (
            actions
            .values("stage__stage_order", "stage__name")
            .annotate(
                total=Count("id"),
                detections=Count("id", filter=Q(detected=True)),
            )
            .order_by("stage__stage_order")
        )

        stage_list = []
        for s in stage_stats:
            total = s["total"] or 0
            dets  = s["detections"] or 0
            stage_list.append({
                "stage_order":    s["stage__stage_order"],
                "stage_name":     s["stage__name"],
                "total":          total,
                "detections":     dets,
                "detection_rate": round(dets / total, 3) if total else 0.0,
            })

        # MITRE miss frequency for this user
        missed_actions = actions.filter(detected=False).select_related("stage")
        mitre_counts = {}
        for action in missed_actions:
            vectors = AttackVector.objects.filter(stage=action.stage)
            for v in vectors:
                if v.mitre_id:
                    mitre_counts[v.mitre_id] = mitre_counts.get(v.mitre_id, 0) + 1

        mitre_list = [
            {"mitre_id": k, "miss_count": v}
            for k, v in sorted(mitre_counts.items(), key=lambda x: -x[1])
        ]

        # Recent session history (last 10)
        session_history = [
            {
                "id":           str(s.id),
                "scenario":     s.scenario.title,
                "started_at":   s.started_at.isoformat(),
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            }
            for s in sessions[:10]
        ]

        return Response({
            "total_sessions":        sessions.count(),
            "total_actions":         total_actions,
            "total_detections":      detected,
            "detection_rate":        round(detection_rate, 3),
            "avg_time_to_detect_ms": avg_time_ms,
            "stage_breakdown":       stage_list,
            "mitre_miss_frequency":  mitre_list,
            "recent_sessions":       session_history,
        })


class MitreResourceListView(APIView):
    """
    GET /api/analytics/mitre-resources/

    Fix #13: Returns educational resource URLs keyed by MITRE technique ID.
    Used by DetectionFeedbackSerializer to include resource_url in feedback.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request) -> Response:
        resources = MitreEducationalResource.objects.all().values(
            "mitre_id", "title", "url", "description"
        )
        return Response(list(resources))

class ReportExportView(APIView):
    """
    POST /api/analytics/export/
    FR-18: Export analytics report as PDF or CSV.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def post(self, request: Request) -> Response:
        serializer = ReportExportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        scenario_id = serializer.validated_data["scenario_id"]
        fmt         = serializer.validated_data["format"]

        from scenarios.models import Scenario
        try:
            scenario = Scenario.objects.get(pk=scenario_id)
        except Scenario.DoesNotExist:
            return Response({"detail": "Scenario not found."}, status=status.HTTP_404_NOT_FOUND)

        from analytics.reports import generate_pdf_report, generate_csv_report
        if fmt == "pdf":
            return generate_pdf_report(scenario)
        return generate_csv_report(scenario)
    
class ScenarioMetricsDashboardView(APIView):
    """
    GET /api/analytics/scenarios/{scenario_id}/
    FR-16: Stage-based success metrics for the admin dashboard.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def get(self, request: Request, scenario_id: int) -> Response:
        metrics = AnalyticsMetric.objects.filter(
            stage__scenario_id=scenario_id
        ).select_related("stage__scenario").order_by("stage__stage_order")
        serializer = AnalyticsMetricSerializer(metrics, many=True)
        return Response(serializer.data)