"""
scenarios/management/commands/load_default_scenarios.py

Creates two ready-to-use public scenarios for individual (self-registered) users.
Each scenario uses the phishing-recruiter container image and is immediately
active and publicly visible.

Usage:
    python manage.py load_default_scenarios

Running the command more than once is safe — it checks for existing titles
and skips creation if they already exist.

Scenarios created
-----------------
1. "The LinkedIn Recruiter"  (Basic, 2 stages)
   Stage 1 – Application (no attack vector — trust-building)
   Stage 2 – Screening   (phishing link: fake assessment portal)

2. "The Insider Threat Setup"  (Intermediate, 3 stages)
   Stage 1 – Screening          (no vector — normal candidate screening)
   Stage 2 – Technical Assessment (no vector — legitimate-looking coding task)
   Stage 3 – Onboarding         (malicious file: offer letter with double extension)

Both scenarios are flagged is_public=True so any individual user can start
them without an assignment.  Organizational users still need assignments.
"""

from django.core.management.base import BaseCommand
from django.db import transaction


CONTAINER_IMAGE = "rasp-phishing-recruiter:latest"


class Command(BaseCommand):
    help = "Load pre-built public scenarios for individual users."

    def handle(self, *args, **options):
        created_count = 0
        created_count += self._create_linkedin_recruiter()
        created_count += self._create_insider_threat_setup()

        if created_count == 0:
            self.stdout.write(self.style.WARNING(
                "No new scenarios created — they already exist. "
                "Delete them from the database first to re-create."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Done. {created_count} scenario(s) created and activated."
            ))

    # ------------------------------------------------------------------
    # Scenario 1: The LinkedIn Recruiter
    # ------------------------------------------------------------------
    def _create_linkedin_recruiter(self) -> int:
        from scenarios.models import Scenario, Stage, AttackVector

        TITLE = "The LinkedIn Recruiter"
        if Scenario.objects.filter(title=TITLE).exists():
            self.stdout.write(f"  Skipping '{TITLE}' — already exists.")
            return 0

        with transaction.atomic():
            # Create scenario (inactive first to avoid clean() stage count check)
            scenario = Scenario.objects.create(
                title=TITLE,
                description=(
                    "A convincing recruiter from a well-known tech company reaches "
                    "out via LinkedIn. The first interaction seems completely "
                    "legitimate — but the follow-up email hides a phishing link "
                    "disguised as a pre-screening assessment."
                ),
                company_profile=(
                    "Name: TechCorp Global\n"
                    "Industry: Software / SaaS\n"
                    "Location: San Francisco, CA\n"
                    "Size: 5,000 employees"
                ),
                container_image=CONTAINER_IMAGE,
                active_status=False,  # activated at the end via update()
                is_public=False,
                difficulty=Scenario.Difficulty.BASIC,
            )

            # ── Stage 1: Application — no attack vector (trust-building) ──
            Stage.objects.create(
                scenario=scenario,
                stage_order=1,
                name=Stage.PhaseName.APPLICATION,
                description=(
                    "The recruiter's initial outreach on LinkedIn. The message is "
                    "professional, the profile looks real, and the company exists. "
                    "Nothing here is suspicious — yet."
                ),
            )

            # ── Stage 2: Screening — phishing link ──
            stage2 = Stage.objects.create(
                scenario=scenario,
                stage_order=2,
                name=Stage.PhaseName.SCREENING,
                description=(
                    "A follow-up email from the recruiter includes a link to a "
                    "'pre-screening assessment portal'. The domain is almost right."
                ),
            )

            AttackVector.objects.create(
                stage=stage2,
                vector_type=AttackVector.VectorType.PHISHING_LINK,
                mitre_id="T1566",
                container_path="/",
                difficulty=Scenario.Difficulty.BASIC,
                detection_criteria={
                    "email": {
                        "sender_name":  "Sarah Reynolds",
                        "sender_email": "sarah.reynolds@techcorp-global.net",
                        "sender_title": "Senior Talent Acquisition Specialist at TechCorp Global",
                        "subject":      "Exciting Senior Developer Opportunity — Action Required",
                        "body": (
                            "Hi,\n\nI came across your profile and I'm very impressed "
                            "with your background!\n\nWe have an urgent opening for a "
                            "Senior Developer role at TechCorp Global that I think would "
                            "be a perfect fit for you. The position offers "
                            "$180,000–$220,000 base salary + equity.\n\nWe need to fill "
                            "this role within 48 hours due to a critical project deadline."
                            "\n\nPlease complete our quick pre-screening assessment to "
                            "move forward. It only takes 5 minutes:\n\n"
                            "👉 Click here to complete your assessment "
                            "(linkedln.com/assessment/tc-2024)\n\n"
                            "Looking forward to hearing from you!\n\nBest,\nSarah Reynolds"
                        ),
                        "has_attachment": False,
                    },
                    "target_elements":  ["btn-flag", "phishing-link", "btn-reply", "btn-delete", "btn-forward"],
                    "success_action":   ["flag", "delete"],
                    "fail_actions":     ["click", "reply", "forward"],
                    "time_pressure_ms": 30000,
                    "indicators": [
                        "Spoofed domain: 'linkedln.com' (letter swap: 'n' replaces 'i')",
                        "Sender email domain 'techcorp-global.net' doesn't match 'TechCorp Global'",
                        "Extreme urgency: 48-hour deadline to pressure fast action",
                        "Salary promise unusually high to override skepticism",
                    ],
                    "best_practice": (
                        "Always hover over links to inspect the real URL before clicking. "
                        "Verify the sender's domain matches the company they claim to represent."
                    ),
                    "mitre_description": "Phishing: spearphishing link via fake recruitment message",
                },
            )

            # Activate + mark public using update() to skip version auto-increment
            Scenario.objects.filter(pk=scenario.pk).update(
                active_status=True,
                is_public=True,
            )

        self.stdout.write(self.style.SUCCESS(f"  Created '{TITLE}' (Basic, 2 stages)."))
        return 1

    # ------------------------------------------------------------------
    # Scenario 2: The Insider Threat Setup
    # ------------------------------------------------------------------
    def _create_insider_threat_setup(self) -> int:
        from scenarios.models import Scenario, Stage, AttackVector

        TITLE = "The Insider Threat Setup"
        if Scenario.objects.filter(title=TITLE).exists():
            self.stdout.write(f"  Skipping '{TITLE}' — already exists.")
            return 0

        with transaction.atomic():
            scenario = Scenario.objects.create(
                title=TITLE,
                description=(
                    "A candidate clears screening and a technical round without "
                    "raising any suspicion. The attack only surfaces at onboarding "
                    "— by which point trust has already been established. "
                    "Based on the KnowBe4 / North Korean IT worker incident pattern."
                ),
                company_profile=(
                    "Name: NexusHire Solutions\n"
                    "Industry: Financial Technology\n"
                    "Location: New York, NY\n"
                    "Size: 1,200 employees"
                ),
                container_image=CONTAINER_IMAGE,
                active_status=False,
                is_public=False,
                difficulty=Scenario.Difficulty.INTERMEDIATE,
            )

            # Stage 1: Screening — no vector (normal phone screen)
            Stage.objects.create(
                scenario=scenario,
                stage_order=1,
                name=Stage.PhaseName.SCREENING,
                description=(
                    "An initial phone screening with the candidate. The conversation "
                    "is professional, the background checks out, and the candidate "
                    "has a convincing LinkedIn profile. No red flags."
                ),
            )

            # Stage 2: Technical Assessment — no vector (legitimate task)
            Stage.objects.create(
                scenario=scenario,
                stage_order=2,
                name=Stage.PhaseName.TECHNICAL_ASSESSMENT,
                description=(
                    "The candidate submits a take-home coding task. The repository "
                    "link and instructions look standard. The code quality is high. "
                    "Nothing unusual."
                ),
            )

            # Stage 3: Onboarding — malicious offer letter with double extension
            stage3 = Stage.objects.create(
                scenario=scenario,
                stage_order=3,
                name=Stage.PhaseName.ONBOARDING,
                description=(
                    "The candidate has been accepted. An onboarding document is sent "
                    "for signature. The attachment is not what it appears to be."
                ),
            )

            AttackVector.objects.create(
                stage=stage3,
                vector_type=AttackVector.VectorType.MALICIOUS_FILE,
                mitre_id="T1204.002",
                container_path="/",
                difficulty=Scenario.Difficulty.INTERMEDIATE,
                detection_criteria={
                    "email": {
                        "sender_name":  "Jennifer Park",
                        "sender_email": "j.park@nexushire-onboarding.com",
                        "sender_title": "People Operations, NexusHire Solutions",
                        "subject":      "Onboarding Package — Please Sign and Return",
                        "body": (
                            "Hi,\n\nWelcome to NexusHire Solutions! We're thrilled to "
                            "have you joining the team.\n\nPlease find your onboarding "
                            "documents attached. Open the file, complete the signature "
                            "fields, and return a copy by end of week.\n\n"
                            "📎 NexusHire_Onboarding_Pack.pdf.exe\n\n"
                            "If you have any questions, don't hesitate to reach out.\n\n"
                            "Best,\nJennifer Park\nPeople Operations"
                        ),
                        "has_attachment": True,
                        "attachment_name": "NexusHire_Onboarding_Pack.pdf.exe",
                    },
                    "target_elements":  ["btn-flag", "attachment-download", "btn-reply", "btn-delete", "btn-forward"],
                    "success_action":   ["flag", "delete"],
                    "fail_actions":     ["download", "reply", "forward"],
                    "time_pressure_ms": 35000,
                    "indicators": [
                        "File extension '.pdf.exe' — double extension malware delivery trick",
                        "Sender domain 'nexushire-onboarding.com' differs from the hiring domain",
                        "Onboarding documents should never be executable files",
                        "No prior mention of this specific document in previous communications",
                    ],
                    "best_practice": (
                        "Always check the full file extension before opening attachments. "
                        "Enable 'Show file extensions' in your OS settings. "
                        "A legitimate onboarding PDF will end in '.pdf', not '.exe'. "
                        "When in doubt, contact HR through a verified channel."
                    ),
                    "mitre_description": "User execution: malicious file with disguised extension",
                },
            )

            Scenario.objects.filter(pk=scenario.pk).update(
                active_status=True,
                is_public=True,
            )

        self.stdout.write(self.style.SUCCESS(
            f"  Created '{TITLE}' (Intermediate, 3 stages)."
        ))
        return 1