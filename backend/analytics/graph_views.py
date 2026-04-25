"""
analytics/graph_views.py

Sprint 5 — Fix #17: Attack-Path Force Graph API

Provides the JSON data for the D3.js force-directed graph on the admin
analytics screen (spec 5.4). Each node is a Stage or AttackVector; edges
represent the attack progression. Node color encodes detection rate:
  green  → detection_rate >= 0.7
  yellow → detection_rate >= 0.4
  red    → detection_rate < 0.4

GET /api/analytics/attack-graph/{scenario_id}/

Register in analytics/urls.py:
  path("analytics/attack-graph/<int:scenario_id>/", AttackPathGraphView.as_view(), name="attack-graph"),
"""

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdministrator


def _rate_to_color(rate: float) -> str:
    if rate >= 0.70:
        return "#22c55e"   # green
    if rate >= 0.40:
        return "#eab308"   # yellow
    return "#ef4444"       # red


class AttackPathGraphView(APIView):
    """
    GET /api/analytics/attack-graph/{scenario_id}/

    Returns nodes and edges for a D3.js force-directed graph.

    Node types:
      "stage"   — recruitment phase node (larger, labelled)
      "vector"  — attack vector node (smaller, coloured by detection rate)

    Edge shape: stage → vector (has-vector), vector → next_stage (leads-to)
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def get(self, request: Request, scenario_id: int) -> Response:
        from scenarios.models import Scenario, Stage, AttackVector
        from analytics.models import AnalyticsMetric
        from telemetry.models import UserAction
        from django.db.models import Count, Q, Avg

        try:
            scenario = Scenario.objects.get(pk=scenario_id)
        except Scenario.DoesNotExist:
            return Response({"detail": "Scenario not found."}, status=404)

        stages = Stage.objects.filter(scenario=scenario).order_by("stage_order").prefetch_related("attack_vectors")

        nodes = []
        edges = []
        node_ids = set()

        for stage in stages:
            # Stage node
            stage_node_id = f"stage-{stage.id}"

            # Get aggregated detection data for this stage
            total = UserAction.objects.filter(stage=stage).count()
            detected = UserAction.objects.filter(stage=stage, detected=True).count()
            detection_rate = (detected / total) if total else 0.0
            avg_time = UserAction.objects.filter(
                stage=stage, detected=True, time_to_detect__isnull=False
            ).aggregate(avg=Avg("time_to_detect"))["avg"] or 0

            nodes.append({
                "id":             stage_node_id,
                "type":           "stage",
                "label":          stage.get_name_display(),
                "stage_order":    stage.stage_order,
                "detection_rate": round(detection_rate, 3),
                "total_attempts": total,
                "avg_time_ms":    round(avg_time),
                "color":          _rate_to_color(detection_rate),
                "size":           28,   # stage nodes are larger
            })
            node_ids.add(stage_node_id)

            # Vector nodes
            for vector in stage.attack_vectors.all():
                vector_node_id = f"vector-{vector.id}"

                v_total    = UserAction.objects.filter(stage=stage).count()
                v_detected = UserAction.objects.filter(stage=stage, detected=True).count()
                v_rate     = (v_detected / v_total) if v_total else 0.0

                nodes.append({
                    "id":             vector_node_id,
                    "type":           "vector",
                    "label":          vector.get_vector_type_display(),
                    "mitre_id":       vector.mitre_id,
                    "vector_type":    vector.vector_type,
                    "detection_rate": round(v_rate, 3),
                    "total_attempts": v_total,
                    "avg_time_ms":    0,
                    "color":          _rate_to_color(v_rate),
                    "size":           16,
                })
                node_ids.add(vector_node_id)

                # Edge: stage → vector
                edges.append({
                    "source": stage_node_id,
                    "target": vector_node_id,
                    "type":   "has_vector",
                })

        # Inter-stage edges (attack progression)
        stage_list = list(stages)
        for i in range(len(stage_list) - 1):
            edges.append({
                "source": f"stage-{stage_list[i].id}",
                "target": f"stage-{stage_list[i + 1].id}",
                "type":   "leads_to",
            })

        return Response({
            "scenario_id":    scenario_id,
            "scenario_title": scenario.title,
            "nodes":          nodes,
            "edges":          edges,
            "legend": {
                "green":  "Detection rate ≥ 70%",
                "yellow": "Detection rate 40–70%",
                "red":    "Detection rate < 40%",
            },
        })