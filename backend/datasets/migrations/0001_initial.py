import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DataSource",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("source_type", models.CharField(
                    choices=[
                        ("emscad",    "EMSCAD (Fraudulent Job Postings)"),
                        ("phishtank", "PhishTank (Phishing URLs)"),
                        ("custom",    "Custom Upload"),
                    ],
                    default="custom",
                    max_length=20,
                )),
                ("description",  models.TextField(blank=True)),
                ("record_count", models.PositiveIntegerField(default=0)),
                ("imported_at",  models.DateTimeField(default=django.utils.timezone.now)),
                ("imported_by",  models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="imported_datasets",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "dataset_source", "ordering": ["-imported_at"]},
        ),
        migrations.CreateModel(
            name="DatasetFeature",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("feature_type", models.CharField(
                    choices=[
                        ("fraudulent_posting", "Fraudulent Job Posting"),
                        ("salary_bait",        "Unrealistic Salary Bait"),
                        ("vague_requirements", "Vague Job Requirements"),
                        ("urgency_language",   "Urgency Language Pattern"),
                        ("personal_email",     "Personal Email Domain"),
                        ("spelling_errors",    "Spelling / Grammar Errors"),
                        ("phishing_url",       "Known Phishing URL"),
                        ("suspicious_domain",  "Suspicious Domain Pattern"),
                        ("custom",             "Custom Feature"),
                    ],
                    default="custom",
                    max_length=30,
                )),
                ("raw_value",   models.TextField(help_text="The original value from the CSV row (URL, phrase, pattern).")),
                ("description", models.TextField(blank=True, help_text="Plain-English explanation for scenario designers.")),
                ("severity",    models.PositiveSmallIntegerField(default=1, help_text="Severity level 1–5.")),
                ("source",      models.ForeignKey(
                    db_column="source",
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="features",
                    to="datasets.datasource",
                )),
            ],
            options={"db_table": "dataset_feature", "ordering": ["-severity", "feature_type"]},
        ),
    ]