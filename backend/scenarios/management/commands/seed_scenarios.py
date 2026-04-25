"""
backend/scenarios/management/commands/seed_scenarios.py

Creates two complete, ready-to-use public scenarios.
Run once after initial setup:

    python manage.py seed_scenarios

Safe to re-run — skips scenarios that already exist by title.

Scenario 1: "The Job Seeker Gauntlet" (Basic, public)
  Stage 1 — Application (awareness: legitimate HR reply, no attack)
  Stage 2 — Screening   (attack: phishing link — fake LinkedIn assessment)
  Stage 3 — Interview   (attack: malicious attachment — offer letter .exe)

Scenario 2: "The Recruiter's Blind Spot" (Intermediate, public)
  Stage 1 — Screening          (awareness: legitimate candidate email)
  Stage 2 — Application        (attack: malicious file — fake resume .pdf.exe)
  Stage 3 — Technical Assessment (attack: info extraction — fake reference check)
  Stage 4 — Onboarding         (attack: CEO impersonation BEC)
"""

from django.core.management.base import BaseCommand
from scenarios.models import Scenario, Stage, AttackVector


class Command(BaseCommand):
    help = "Seeds two complete public scenarios for individual users."

    def handle(self, *args, **options):
        self._seed_job_seeker_scenario()
        self._seed_hr_scenario()
        self.stdout.write(self.style.SUCCESS(
            "\nDone. Mark them active in Django admin or via PATCH /api/scenarios/{id}/activate/ "
            "to make them available to users."
        ))

    # =========================================================================
    # Scenario 1: The Job Seeker Gauntlet
    # =========================================================================

    def _seed_job_seeker_scenario(self):
        title = "The Job Seeker Gauntlet"
        if Scenario.objects.filter(title=title).exists():
            self.stdout.write(f"  Skipping '{title}' — already exists.")
            return

        scenario = Scenario.objects.create(
            title=title,
            description=(
                "You are a job seeker navigating a recruitment process. "
                "Not every recruiter is who they say they are. "
                "Can you tell a legitimate opportunity from an attack?"
            ),
            company_profile=(
                "Name: GlobalTech Solutions\n"
                "Industry: Software\n"
                "Location: San Francisco, CA"
            ),
            container_image="rasp-phishing-recruiter:latest",
            active_status=False,   # Admin activates after seeding
            is_public=True,
            difficulty=Scenario.Difficulty.BASIC,
        )
        self.stdout.write(f"  Created scenario: {scenario.title}")

        # ── Stage 1: Application — Awareness (legitimate email) ────────────
        stage1 = Stage.objects.create(
            scenario=scenario,
            stage_order=1,
            name=Stage.PhaseName.APPLICATION,
            description=(
                "You've applied for a software engineering role. "
                "A recruiter has replied to acknowledge your application. "
                "Read the email and decide how to handle it."
            ),
        )
        # No AttackVector → this is an awareness stage.
        # The container will show a legitimate recruiter email.
        # Flagging it = fail. Any other action = pass.
        self.stdout.write(f"    Stage 1 (Application) — awareness stage, no attack vector")

        # ── Stage 2: Screening — Phishing link ────────────────────────────
        stage2 = Stage.objects.create(
            scenario=scenario,
            stage_order=2,
            name=Stage.PhaseName.SCREENING,
            description=(
                "You've made it to the screening round. "
                "The recruiter has sent you a link to complete a pre-screening assessment. "
                "Look carefully before you click."
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
                    "sender_title": "Senior Talent Acquisition at TechCorp Global",
                    "subject":      "URGENT: Complete your screening assessment today",
                    "body": (
                        "Hi,\n\n"
                        "Congratulations on making it to the screening round!\n\n"
                        "We have an urgent opening and need to fill this position within 48 hours. "
                        "Please complete your pre-screening assessment as soon as possible:\n\n"
                        "👉 Click here: linkedln.com/assessment/tc-2024\n\n"
                        "The role offers $180,000–$220,000 base salary + equity. "
                        "Don't miss this opportunity!\n\n"
                        "Best,\nSarah Reynolds\nsarah.reynolds@techcorp-global.net"
                    ),
                    "has_attachment": False,
                },
                "target_elements": ["btn-flag", "phishing-link", "btn-reply", "btn-delete", "btn-forward"],
                "time_pressure_ms": 30000,
                "indicators": [
                    "Spoofed domain: 'linkedln.com' — note the 'n' replacing 'i'",
                    "Sender domain 'techcorp-global.net' doesn't match 'TechCorp Global'",
                    "Extreme urgency: '48-hour deadline' to pressure fast action",
                    "Unusually high salary promise designed to override scepticism",
                ],
                "best_practice": (
                    "Always hover over links to inspect the real URL before clicking. "
                    "Verify the sender's domain matches the company they claim to represent. "
                    "Legitimate recruiters do not pressure candidates with 48-hour deadlines."
                ),
                "mitre_id": "T1566",
                "mitre_description": "Phishing via spearphishing link in fake recruitment message",
            },
        )
        self.stdout.write(f"    Stage 2 (Screening) — phishing link [T1566]")

        # ── Stage 3: Interview — Malicious attachment ──────────────────────
        stage3 = Stage.objects.create(
            scenario=scenario,
            stage_order=3,
            name=Stage.PhaseName.INTERVIEW,
            description=(
                "You've been shortlisted. The recruiter has sent what appears to be "
                "an offer letter for your review. Check the attachment carefully."
            ),
        )
        AttackVector.objects.create(
            stage=stage3,
            vector_type=AttackVector.VectorType.MALICIOUS_FILE,
            mitre_id="T1204.002",
            container_path="/",
            difficulty=Scenario.Difficulty.BASIC,
            detection_criteria={
                "email": {
                    "sender_name":    "Jennifer Park",
                    "sender_email":   "j.park@global-staffing-hub.com",
                    "sender_title":   "Recruitment Lead",
                    "subject":        "Offer Letter — Please Review and Sign Today",
                    "body": (
                        "Dear Candidate,\n\n"
                        "We are pleased to extend a formal offer for the Software Engineer position.\n\n"
                        "Please find your offer letter attached. Review and return a signed copy "
                        "by end of day today — your start date is Monday.\n\n"
                        "Compensation: $145,000 base + $20,000 signing bonus\n\n"
                        "Best regards,\nJennifer Park\nGlobal Staffing Hub"
                    ),
                    "has_attachment":   True,
                    "attachment_name":  "OfferLetter_GlobalTech.pdf.exe",
                },
                "target_elements": ["btn-flag", "attachment-download", "btn-reply", "btn-delete", "btn-forward"],
                "time_pressure_ms": 35000,
                "indicators": [
                    "File is named 'OfferLetter_GlobalTech.pdf.exe' — .exe hidden behind .pdf extension",
                    "Domain 'global-staffing-hub.com' doesn't match the company name in earlier emails",
                    "Offer sent without a prior phone/video interview",
                    "Deadline pressure: 'by end of day today' limits time to verify",
                ],
                "best_practice": (
                    "Always check the actual file extension before opening. On Windows, enable "
                    "'Show file extensions' in File Explorer. Offer letters should never be .exe files. "
                    "A legitimate offer always follows a real interview process."
                ),
                "mitre_id": "T1204.002",
                "mitre_description": "User execution: malicious file disguised with double extension",
            },
        )
        self.stdout.write(f"    Stage 3 (Interview) — malicious attachment [T1204.002]")
        self.stdout.write(self.style.SUCCESS(f"  ✓ Scenario 1 complete: {scenario.title}"))

    # =========================================================================
    # Scenario 2: The Recruiter's Blind Spot
    # =========================================================================

    def _seed_hr_scenario(self):
        title = "The Recruiter's Blind Spot"
        if Scenario.objects.filter(title=title).exists():
            self.stdout.write(f"  Skipping '{title}' — already exists.")
            return

        scenario = Scenario.objects.create(
            title=title,
            description=(
                "You are an HR recruiter managing candidates. "
                "Attackers exploit the trust you place in applicants. "
                "Four stages — one legitimate, three attacks. Stay sharp."
            ),
            company_profile=(
                "Name: NovaCorp Industries\n"
                "Industry: Finance\n"
                "Location: New York, NY"
            ),
            container_image="rasp-phishing-recruiter:latest",
            active_status=False,
            is_public=True,
            difficulty=Scenario.Difficulty.INTERMEDIATE,
        )
        self.stdout.write(f"  Created scenario: {scenario.title}")

        # ── Stage 1: Screening — Awareness (legitimate candidate) ──────────
        stage1 = Stage.objects.create(
            scenario=scenario,
            stage_order=1,
            name=Stage.PhaseName.SCREENING,
            description=(
                "A candidate has emailed in response to your job posting. "
                "Review the message and decide how to handle it."
            ),
        )
        # No AttackVector — legitimate candidate email, awareness stage.
        self.stdout.write(f"    Stage 1 (Screening) — awareness stage, no attack vector")

        # ── Stage 2: Application — Malicious resume file ───────────────────
        stage2 = Stage.objects.create(
            scenario=scenario,
            stage_order=2,
            name=Stage.PhaseName.APPLICATION,
            description=(
                "A candidate has submitted their resume for the open position. "
                "Before you open it, take a close look."
            ),
        )
        AttackVector.objects.create(
            stage=stage2,
            vector_type=AttackVector.VectorType.MALICIOUS_FILE,
            mitre_id="T1204.002",
            container_path="/",
            difficulty=Scenario.Difficulty.INTERMEDIATE,
            detection_criteria={
                "email": {
                    "sender_name":  "Michael Chen",
                    "sender_email": "m.chen.dev@proton-mail.io",
                    "sender_title": "Software Engineer",
                    "subject":      "Application for Senior Developer Role — Resume Attached",
                    "body": (
                        "Dear Hiring Team,\n\n"
                        "I am writing to apply for the Senior Developer position advertised on LinkedIn.\n\n"
                        "Please find my resume attached. I have 8 years of experience in fintech "
                        "and would welcome the opportunity to discuss the role.\n\n"
                        "Kind regards,\nMichael Chen"
                    ),
                    "has_attachment":  True,
                    "attachment_name": "MichaelChen_Resume.docx.exe",
                },
                "target_elements": ["btn-flag", "attachment-download", "btn-reply", "btn-delete", "btn-forward"],
                "time_pressure_ms": 40000,
                "indicators": [
                    "Resume file is named 'MichaelChen_Resume.docx.exe' — executable disguised as Word doc",
                    "Sender uses a ProtonMail address, not a personal or corporate domain",
                    "Email arrives at unusual hours (outside business hours)",
                    "Slightly generic application language with no specific reference to the company",
                ],
                "best_practice": (
                    "Never open resume attachments without checking the file extension first. "
                    "Legitimate resumes are PDF or .docx files — never .exe. "
                    "This attack vector mimics the More_Eggs malware campaign (eSentire, 2024)."
                ),
                "mitre_id": "T1204.002",
                "mitre_description": "More_Eggs-style malware delivery via fake resume attachment",
            },
        )
        self.stdout.write(f"    Stage 2 (Application) — malicious resume [T1204.002]")

        # ── Stage 3: Technical Assessment — Info extraction ────────────────
        stage3 = Stage.objects.create(
            scenario=scenario,
            stage_order=3,
            name=Stage.PhaseName.TECHNICAL_ASSESSMENT,
            description=(
                "A background check company has contacted you for a reference verification "
                "on one of your shortlisted candidates. They need information urgently."
            ),
        )
        AttackVector.objects.create(
            stage=stage3,
            vector_type=AttackVector.VectorType.FAKE_IDENTITY,
            mitre_id="T1598",
            container_path="/",
            difficulty=Scenario.Difficulty.INTERMEDIATE,
            detection_criteria={
                "email": {
                    "sender_name":  "Amanda Wells",
                    "sender_email": "awells@bg-verification-corp.com",
                    "sender_title": "Background Verification Specialist",
                    "subject":      "Reference Check — Action Required Before 3PM Today",
                    "body": (
                        "Dear HR Team,\n\n"
                        "We are conducting a background verification on a candidate who listed "
                        "your organisation as a previous employer.\n\n"
                        "Could you please confirm the following before 3PM today:\n"
                        "• Employment dates\n"
                        "• Role and department\n"
                        "• Direct manager's name and email\n"
                        "• Reason for leaving\n"
                        "• Any disciplinary actions\n\n"
                        "This is time-sensitive as the candidate's start date is tomorrow.\n\n"
                        "Amanda Wells\nBG Verification Corp"
                    ),
                    "has_attachment": False,
                },
                "target_elements": ["btn-reply", "btn-forward", "btn-flag", "btn-delete"],
                "time_pressure_ms": 40000,
                "indicators": [
                    "Requesting sensitive employee data via email from an unverifiable company",
                    "'Urgent — before 3PM today' deliberately limits time to verify authenticity",
                    "Asking for direct manager names and emails — organisational chart harvesting",
                    "Domain 'bg-verification-corp.com' is not a known background check provider",
                ],
                "best_practice": (
                    "Never share employee information via email without calling the requester back "
                    "on a number from their official website. Legitimate background check companies "
                    "follow a formal, agreed-upon process — they do not request data by cold email."
                ),
                "mitre_id": "T1598",
                "mitre_description": "Phishing for information via fake background check request",
            },
        )
        self.stdout.write(f"    Stage 3 (Technical Assessment) — info extraction [T1598]")

        # ── Stage 4: Onboarding — CEO BEC impersonation ────────────────────
        stage4 = Stage.objects.create(
            scenario=scenario,
            stage_order=4,
            name=Stage.PhaseName.ONBOARDING,
            description=(
                "The CEO has emailed you directly with a confidential and urgent request. "
                "Read carefully before responding."
            ),
        )
        AttackVector.objects.create(
            stage=stage4,
            vector_type=AttackVector.VectorType.URGENCY,
            mitre_id="T1656",
            container_path="/",
            difficulty=Scenario.Difficulty.INTERMEDIATE,
            detection_criteria={
                "email": {
                    "sender_name":  "Robert Mitchell (CEO)",
                    "sender_email": "rmitchell@novacorp-corp.net",
                    "sender_title": "Chief Executive Officer",
                    "subject":      "Confidential — Urgent Action Required",
                    "body": (
                        "Hi,\n\n"
                        "I'm in a board meeting and can't talk. I need you to process an urgent "
                        "vendor payment of $47,500 to a new supplier before end of business today.\n\n"
                        "This is confidential — please don't discuss with anyone until it's done.\n\n"
                        "Wire to:\n"
                        "Account: 4829-1047-2938\n"
                        "Routing: 021000089\n\n"
                        "Confirm when done.\n\n"
                        "Robert Mitchell\nCEO, NovaCorp Industries"
                    ),
                    "has_attachment": False,
                },
                "target_elements": ["btn-reply", "btn-flag", "btn-delete", "btn-forward"],
                "time_pressure_ms": 30000,
                "indicators": [
                    "Sender domain 'novacorp-corp.net' does not match company domain 'novacorp.com'",
                    "Request for secrecy — 'don't discuss with anyone' is a social engineering tactic",
                    "CEOs do not send wire transfer instructions via email",
                    "Urgency + secrecy together are the hallmark of Business Email Compromise (BEC)",
                ],
                "best_practice": (
                    "Any financial request via email should be verified by calling the person directly "
                    "on a known number — not by replying to the email. BEC attacks cost organisations "
                    "billions annually. Legitimate executives follow proper financial approval processes."
                ),
                "mitre_id": "T1656",
                "mitre_description": "Impersonation: Business Email Compromise targeting HR/Finance",
            },
        )
        self.stdout.write(f"    Stage 4 (Onboarding) — CEO BEC impersonation [T1656]")
        self.stdout.write(self.style.SUCCESS(f"  ✓ Scenario 2 complete: {scenario.title}"))