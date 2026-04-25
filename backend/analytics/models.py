"""
analytics/models.py

Pre-aggregated performance metrics per Stage.

Table: AnalyticsMetric

Business rules enforced here:
  BR-09 – AnalyticsMetric is per-Stage, not per-Session.
           Recomputing a metric never deletes prior records;
           total_attempts and total_detections are atomically incremented
           (SessionCompletion_sequence: 'Atomic Increment' / SQL UPDATE
           total_attempts += 1).

Design note: These counters are updated atomically using
  F() expressions to prevent race conditions when multiple sessions
  complete concurrently (NFR-9: 50+ concurrent users).
"""

from django.db import models


class AnalyticsMetric(models.Model):
    """
    Aggregated detection statistics for one Stage across all sessions.

    Updated atomically via:
        AnalyticsMetric.objects.filter(stage=stage).update(
            total_attempts=F('total_attempts') + 1,
            total_detections=F('total_detections') + detected_int,
        )

    This avoids read-modify-write race conditions (BR-09,
    SessionCompletion_sequence 'Atomic Increment' block).

    Derived metrics (detection_rate, avg_time_to_detect) are computed
    as properties rather than stored columns to avoid staleness.

    ER fields: id, stage_id (FK), total_attempts, total_detections
    """

    stage = models.OneToOneField(
        "scenarios.Stage",
        on_delete=models.CASCADE,
        related_name="analytics_metric",
        help_text="One metric record per stage (BR-09).",
    )
    total_attempts = models.PositiveIntegerField(
        default=0,
        help_text="Total number of times users have reached this stage.",
    )
    total_detections = models.PositiveIntegerField(
        default=0,
        help_text="Total number of successful detections at this stage.",
    )
    # Cumulative sum for computing running average time-to-detect (FR-15)
    cumulative_time_to_detect_ms = models.BigIntegerField(
        default=0,
        help_text=(
            "Running sum of time_to_detect values from UserAction. "
            "Divide by total_detections to get average (FR-15, FR-16)."
        ),
    )
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "analytics_metric"
        verbose_name = "Analytics Metric"
        verbose_name_plural = "Analytics Metrics"

    def __str__(self) -> str:
        return f"Metrics for {self.stage} | {self.detection_rate:.1%} detection"

    # ------------------------------------------------------------------
    # Computed properties (FR-16, FR-17)
    # ------------------------------------------------------------------

    @property
    def detection_rate(self) -> float:
        """Detection rate as a float between 0.0 and 1.0."""
        if self.total_attempts == 0:
            return 0.0
        return self.total_detections / self.total_attempts

    @property
    def miss_rate(self) -> float:
        """Miss rate — used in FR-17 MITRE technique frequency dashboard."""
        return 1.0 - self.detection_rate

    @property
    def avg_time_to_detect_ms(self) -> float:
        """Average time-to-detect in milliseconds (FR-15)."""
        if self.total_detections == 0:
            return 0.0
        return self.cumulative_time_to_detect_ms / self.total_detections
    
class MitreEducationalResource(models.Model):
    """
    Maps a MITRE ATT&CK technique ID to an educational resource URL.
 
    Included in detection feedback (FR-15) so users can self-study the
    specific technique they encountered during a stage.
 
    The StageEngine looks up the matching resource by mitre_id and appends
    the URL to the feedback dict as `resource_url`. The frontend renders
    this as a "Learn more →" link in the stage-completion overlay.
 
    Pre-populated by the INTEGRATION_GUIDE seed commands:
        python manage.py shell -c "..."   (see INTEGRATION_GUIDE.py step 3d)
    """
 
    mitre_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="MITRE ATT&CK technique ID, e.g. 'T1566' or 'T1204.002'.",
    )
    title = models.CharField(
        max_length=255,
        help_text="Human-readable technique name, e.g. 'Spearphishing Link'.",
    )
    url = models.URLField(
        help_text="Canonical MITRE ATT&CK page or external resource URL.",
    )
    description = models.TextField(
        blank=True,
        help_text="Brief plain-English summary shown alongside the link.",
    )
 
    class Meta:
        db_table = "mitre_educational_resource"
        ordering = ["mitre_id"]
        verbose_name = "MITRE Educational Resource"
        verbose_name_plural = "MITRE Educational Resources"
 
    def __str__(self) -> str:
        return f"{self.mitre_id}: {self.title}"
 
 
# ---------------------------------------------------------------------------
# Initial resource data — used in manage.py seed command
# ---------------------------------------------------------------------------
INITIAL_MITRE_RESOURCES = [
    {
        "mitre_id":    "T1566",
        "title":       "Spearphishing Link",
        "url":         "https://attack.mitre.org/techniques/T1566/002/",
        "description": "Adversaries send spearphishing emails with malicious links disguised as legitimate content.",
    },
    {
        "mitre_id":    "T1566.001",
        "title":       "Spearphishing Attachment",
        "url":         "https://attack.mitre.org/techniques/T1566/001/",
        "description": "Adversaries attach malicious files to emails to gain initial access.",
    },
    {
        "mitre_id":    "T1204",
        "title":       "User Execution",
        "url":         "https://attack.mitre.org/techniques/T1204/",
        "description": "Adversaries rely on user actions to execute malicious code.",
    },
    {
        "mitre_id":    "T1204.002",
        "title":       "Malicious File",
        "url":         "https://attack.mitre.org/techniques/T1204/002/",
        "description": "Users execute malicious files disguised with double extensions or spoofed icons.",
    },
    {
        "mitre_id":    "T1598",
        "title":       "Phishing for Information",
        "url":         "https://attack.mitre.org/techniques/T1598/",
        "description": "Adversaries send phishing messages to elicit sensitive information from targets.",
    },
    {
        "mitre_id":    "T1078",
        "title":       "Valid Accounts",
        "url":         "https://attack.mitre.org/techniques/T1078/",
        "description": "Adversaries obtain and abuse credentials of existing accounts to maintain access.",
    },
    {
        "mitre_id":    "T1656",
        "title":       "Impersonation",
        "url":         "https://attack.mitre.org/techniques/T1656/",
        "description": "Adversaries impersonate trusted individuals to manipulate targets into unsafe actions.",
    },
]