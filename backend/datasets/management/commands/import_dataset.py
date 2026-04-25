"""
datasets/management/commands/import_dataset.py

Management command for importing EMSCAD and PhishTank CSV datasets.

Usage:
  # Import EMSCAD fraudulent job postings
  python manage.py import_dataset \\
      --source-type emscad \\
      --name "EMSCAD v1 2023" \\
      --file /path/to/emscad.csv

  # Import PhishTank verified phishing URLs
  python manage.py import_dataset \\
      --source-type phishtank \\
      --name "PhishTank April 2026" \\
      --file /path/to/verified_online_phishing.csv

  # Import custom CSV
  python manage.py import_dataset \\
      --source-type custom \\
      --name "Internal Phishing Corpus" \\
      --file /path/to/custom.csv \\
      --description "Internal red-team phishing examples"

  # Dry-run (show count without writing to DB)
  python manage.py import_dataset --source-type emscad --file emscad.csv --dry-run

After import, link features to an AttackVector from Django shell:
  from datasets.models import DatasetFeature
  from scenarios.models import AttackVector
  vector = AttackVector.objects.get(pk=<id>)
  features = DatasetFeature.objects.filter(
      source__source_type='emscad',
      feature_type='fraudulent_posting',
  )[:5]
  vector.dataset_features.set(features)
"""

import csv
import sys
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from datasets.models import DataSource, DatasetFeature
from datasets.views import _parse_emscad, _parse_phishtank, _parse_custom

User = get_user_model()


class Command(BaseCommand):
    help = "Import a CSV dataset (EMSCAD, PhishTank, or custom) into RASP."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source-type",
            required=True,
            choices=["emscad", "phishtank", "custom"],
            help="Type of dataset to import.",
        )
        parser.add_argument(
            "--name",
            required=True,
            help="Human-readable name for this import.",
        )
        parser.add_argument(
            "--file",
            required=True,
            help="Path to the CSV file.",
        )
        parser.add_argument(
            "--description",
            default="",
            help="Optional description for this dataset.",
        )
        parser.add_argument(
            "--username",
            default=None,
            help="Username to attribute this import to (defaults to first admin).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Parse the file and report feature count without writing to the database.",
        )
        parser.add_argument(
            "--replace",
            action="store_true",
            default=False,
            help="Delete any existing DataSource with the same name before importing.",
        )

    def handle(self, *args, **options):
        csv_path    = Path(options["file"])
        source_type = options["source_type"]
        name        = options["name"]
        description = options["description"]
        dry_run     = options["dry_run"]
        replace     = options["replace"]
        username    = options["username"]

        # ── Validate file ────────────────────────────────────────────────────
        if not csv_path.exists():
            raise CommandError(f"File not found: {csv_path}")
        if not csv_path.suffix.lower() == ".csv":
            self.stdout.write(self.style.WARNING("Warning: file does not have .csv extension."))

        # ── Read CSV ──────────────────────────────────────────────────────────
        self.stdout.write(f"Reading {csv_path} …")
        try:
            with open(csv_path, "r", encoding="utf-8", errors="replace") as fh:
                reader = csv.DictReader(fh)
                rows = list(reader)
        except Exception as exc:
            raise CommandError(f"Failed to read CSV: {exc}")

        self.stdout.write(f"  → {len(rows)} raw rows read.")

        # ── Parse ─────────────────────────────────────────────────────────────
        self.stdout.write(f"Parsing as {source_type} …")
        try:
            if source_type == "emscad":
                features = _parse_emscad(rows)
            elif source_type == "phishtank":
                features = _parse_phishtank(rows)
            else:
                features = _parse_custom(rows)
        except Exception as exc:
            raise CommandError(f"Parse error: {exc}")

        self.stdout.write(f"  → {len(features)} features extracted.")

        if not features:
            self.stdout.write(self.style.WARNING(
                "No valid features found. Check that the CSV column names match "
                "the expected format (see command docstring)."
            ))
            sys.exit(0)

        if dry_run:
            self.stdout.write(self.style.SUCCESS(
                f"Dry run complete. Would import {len(features)} features. "
                "Re-run without --dry-run to persist."
            ))
            return

        # ── Resolve admin user ────────────────────────────────────────────────
        importer = None
        if username:
            try:
                importer = User.objects.get(username=username)
            except User.DoesNotExist:
                raise CommandError(f"User '{username}' not found.")
        else:
            importer = User.objects.filter(role="administrator").first()

        # ── Replace existing? ─────────────────────────────────────────────────
        if replace:
            deleted_qs = DataSource.objects.filter(name=name)
            count = deleted_qs.count()
            if count:
                deleted_qs.delete()
                self.stdout.write(f"  → Deleted {count} existing DataSource(s) with name '{name}'.")

        # ── Write to DB ────────────────────────────────────────────────────────
        self.stdout.write("Writing to database …")
        with transaction.atomic():
            source = DataSource.objects.create(
                name=name,
                source_type=source_type,
                description=description,
                record_count=len(features),
                imported_by=importer,
            )
            feature_objects = [
                DatasetFeature(
                    source=source,
                    feature_type=f["feature_type"],
                    raw_value=f["raw_value"],
                    description=f.get("description", ""),
                    severity=f.get("severity", 1),
                )
                for f in features
            ]
            DatasetFeature.objects.bulk_create(feature_objects, batch_size=500)

        self.stdout.write(self.style.SUCCESS(
            f"✓ Imported {len(features)} features into DataSource "
            f"'{name}' (id={source.id})."
        ))
        self.stdout.write(
            f"\nTo link features to an attack vector, run:\n"
            f"  python manage.py shell -c \"\n"
            f"from datasets.models import DatasetFeature\n"
            f"from scenarios.models import AttackVector\n"
            f"vector = AttackVector.objects.get(pk=<vector_id>)\n"
            f"features = DatasetFeature.objects.filter(source_id={source.id})[:5]\n"
            f"vector.dataset_features.set(features)\n"
            f"\""
        )