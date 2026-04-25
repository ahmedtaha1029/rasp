// // src/constants/attackTemplates.js
// //
// // Pre-built attack templates for the admin scenario builder.
// // Admin picks one from this pool, then customizes the text fields.
// // Each template maps directly to the AttackVector detection_criteria schema.
// //
// // USAGE: Admin selects a template → fields pre-fill → admin edits if needed → saves.

// export const ATTACK_CATEGORIES = [
//   { id: "phishing_link",    label: "Phishing Link",         color: "#ef4444" },
//   { id: "attachment",  label: "Malicious Attachment",  color: "#f97316" },
//   { id: "extraction",  label: "Info Extraction",       color: "#eab308" },
//   { id: "impersonation", label: "Impersonation",       color: "#a855f7" },
// ]

// // Each template has:
// //   - id, name, category
// //   - email: the fake email content (admin can edit these)
// //   - detection_criteria: what the backend uses to score the user's response
// //   - indicators: the red flags the user should spot

// export const ATTACK_TEMPLATES = [

//   // -----------------------------------------------------------------------
//   // PHISHING LINK templates
//   // -----------------------------------------------------------------------
//   {
//     id: "phishing_linkedin",
//     name: "Fake LinkedIn Assessment",
//     category: "phishing_link",
//     description: "Spoofed LinkedIn recruiter with fake assessment portal link",
//     email: {
//       sender_name:    "Sarah Reynolds",
//       sender_email:   "sarah.reynolds@techcorp-global.net",
//       sender_title:   "Senior Talent Acquisition Specialist at TechCorp Global",
//       subject:        "Exciting Senior Developer Opportunity – Action Required",
//       body: `Hi,

// I came across your profile and I'm very impressed with your background!

// We have an urgent opening for a Senior Developer role at TechCorp Global that I think would be a perfect fit for you. The position offers $180,000–$220,000 base salary + equity.

// We need to fill this role within 48 hours due to a critical project deadline.

// Please complete our quick pre-screening assessment to move forward. It only takes 5 minutes:

// 👉 Click here to complete your assessment (linkedln.com/assessment/tc-2024)

// Looking forward to hearing from you!

// Best,
// Sarah Reynolds
// sarah.reynolds@techcorp-global.net`,
//     },
//     detection_criteria: {
//       target_elements:   ["btn-flag", "phishing-link", "btn-reply", "btn-delete", "btn-forward"],
//       success_action:    ["flag", "delete"],
//       fail_actions:      ["click", "reply", 'forward'],
//       time_pressure_ms:  30000,
//       indicators: [
//         "Spoofed domain: 'linkedln.com' (letter swap: n replaces i)",
//         "Sender email domain doesn't match company name",
//         "Extreme urgency: 48-hour deadline to pressure fast action",
//         "Salary promise unusually high to override skepticism",
//       ],
//       best_practice:
//         "Always hover over links to inspect the real URL before clicking. Verify the sender's domain matches the company they claim to represent.",
//       mitre_id:          "T1566",
//       mitre_description: "Phishing: spearphishing link via fake recruitment message",
//     },
//   },

//   {
//     id: "phishing_job_portal",
//     name: "Fake Job Portal Login",
//     category: "phishing_link",
//     description: "Redirects victim to a credential-harvesting job portal clone",
//     email: {
//       sender_name:    "Michael Torres",
//       sender_email:   "m.torres@hirequest-talent.co",
//       sender_title:   "Executive Recruiter at HireQuest",
//       subject:        "Your application has been shortlisted",
//       body: `Hello,

// Congratulations! You have been shortlisted for the Lead Engineer position at our client.

// To proceed, please log in to our candidate portal to schedule your interview and review the offer letter:

// 🔗 Login here: careers-hirequest.co/portal

// Your temporary access code is: HQ-7842-XZ

// This link expires in 24 hours.

// Regards,
// Michael Torres
// HireQuest Talent Solutions`,
//     },
//     detection_criteria: {
//       target_elements:   ["btn-flag", "portal-link", "btn-reply", "btn-delete", "btn-forward"],
//       success_action:    ["flag", "delete"],
//       fail_actions:      ["click", "reply", "forward"],
//       time_pressure_ms:  25000,
//       indicators: [
//         "Domain 'careers-hirequest.co' is different from 'hirequest-talent.co' — inconsistency",
//         "Unsolicited shortlist notification with no previous contact",
//         "24-hour expiry creates artificial urgency",
//         "Temporary access code tactic to seem legitimate",
//       ],
//       best_practice:
//         "Never log into a portal sent via an unsolicited email. Go directly to the company's official website and log in from there.",
//       mitre_id:          "T1566.002",
//       mitre_description: "Phishing: spearphishing link targeting credentials",
//     },
//   },

//   // -----------------------------------------------------------------------
//   // MALICIOUS ATTACHMENT templates
//   // -----------------------------------------------------------------------
//   {
//     id: "attachment_pdf_exe",
//     name: "Double-Extension Job Offer",
//     category: "attachment",
//     description: "Executable disguised as a PDF using double extension trick",
//     email: {
//       sender_name:    "Jennifer Park",
//       sender_email:   "j.park@global-staffing-hub.com",
//       sender_title:   "Recruitment Lead",
//       subject:        "Offer Letter – Please Review and Sign",
//       body: `Dear Candidate,

// We are pleased to extend a formal offer for the Software Engineer position.

// Please find the offer letter attached. Review and return a signed copy by end of day tomorrow.

// Compensation: $145,000 base + $20,000 signing bonus

// Best regards,
// Jennifer Park
// Global Staffing Hub`,
//     },
//     detection_criteria: {
//       target_elements:   ["btn-flag", "attachment-download", "btn-reply", "btn-delete", "btn-forward"],
//       success_action:    ["flag", "delete"],
//       fail_actions:      ["download", "reply", "forward"],
//       time_pressure_ms:  35000,
//       indicators: [
//         "File is named 'OfferLetter.pdf.exe' — .exe hidden behind .pdf",
//         "Sender domain 'global-staffing-hub.com' is generic and unverifiable",
//         "No prior conversation — unsolicited offer letter",
//         "Deadline pressure: 'by end of day tomorrow'",
//       ],
//       best_practice:
//         "Always check the actual file extension before opening. On Windows, enable 'Show file extensions' in File Explorer. An offer letter should never be an .exe file.",
//       mitre_id:          "T1204.002",
//       mitre_description: "User execution: malicious file with disguised extension",
//     },
//   },

//   {
//     id: "attachment_macro",
//     name: "Contract with Macro",
//     category: "attachment",
//     description: "Word document with embedded macro requesting macro enable",
//     email: {
//       sender_name:    "David Chen",
//       sender_email:   "dchen@nexus-partners.io",
//       sender_title:   "Managing Partner at Nexus",
//       subject:        "NDA and Contract — Requires Your Signature",
//       body: `Hello,

// As discussed, please find the attached NDA and consulting contract.

// Note: You'll need to click "Enable Content" when opening the document so the signature fields load correctly.

// Please return signed copies within 48 hours.

// David Chen
// Nexus Partners`,
//     },
//     detection_criteria: {
//       target_elements:   ["btn-flag", "attachment-download", "btn-reply", "btn-delete", "btn-forward"],
//       success_action:    ["flag", "delete"],
//       fail_actions:      ["download", "reply", "forward"],
//       time_pressure_ms:  35000,
//       indicators: [
//         "Request to 'Enable Content' / macros in a Word doc is a classic malware vector",
//         "Pressure to sign in 48 hours limits time to verify",
//         "NDA sent by email without any prior meeting or video call",
//         "'As discussed' implies prior relationship that doesn't exist",
//       ],
//       best_practice:
//         "Legitimate contracts never require you to enable macros. If asked to do so, treat the file as malicious and report it.",
//       mitre_id:          "T1566.001",
//       mitre_description: "Phishing: spearphishing attachment with malicious macro",
//     },
//   },

//   // -----------------------------------------------------------------------
//   // INFO EXTRACTION templates
//   // -----------------------------------------------------------------------
//   {
//     id: "extraction_reference",
//     name: "Reference Check Extraction",
//     category: "extraction",
//     description: "Poses as legitimate reference checker to extract employee info",
//     email: {
//       sender_name:    "Amanda Wells",
//       sender_email:   "awells@bg-verification-corp.com",
//       sender_title:   "Background Verification Specialist",
//       subject:        "Reference Check for [Candidate Name] — Urgent",
//       body: `Dear HR,

// We are conducting a background check on a candidate who listed your organization as a previous employer.

// Could you please confirm the following before 3pm today:
// - Employment dates
// - Role and department
// - Direct manager's name and email
// - Reason for leaving
// - Any disciplinary actions

// This is time-sensitive as the candidate's start date is tomorrow.

// Amanda Wells
// BG Verification Corp`,
//     },
//     detection_criteria: {
//       target_elements:   ["btn-reply", "btn-forward", "btn-flag", "btn-delete",],
//       success_action:    ["flag", "delete"],
//       fail_actions:      ["reply", "forward"],
//       time_pressure_ms:  40000,
//       indicators: [
//         "Requesting sensitive employee data via email from unverifiable source",
//         "'Urgent' and same-day deadline limit time to verify authenticity",
//         "Asking for manager names and emails; org chart harvesting",
//         "Generic sender domain 'bg-verification-corp.com'; not a known company",
//       ],
//       best_practice:
//         "Never share employee information via email without verifying the requester through official channels. Call the company directly using a number from their official website.",
//       mitre_id:          "T1598",
//       mitre_description: "Phishing for information: social engineering via fake reference check",
//     },
//   },

//   // -----------------------------------------------------------------------
//   // IMPERSONATION templates
//   // -----------------------------------------------------------------------
//   {
//     id: "impersonation_ceo",
//     name: "CEO Impersonation — Urgent Wire",
//     category: "impersonation",
//     description: "Attacker impersonates CEO asking HR to process urgent payment",
//     email: {
//       sender_name:    "Robert Mitchell (CEO)",
//       sender_email:   "rmitchell@company-corp.net",
//       sender_title:   "Chief Executive Officer",
//       subject:        "Confidential — Urgent Action Required",
//       body: `Hi,

// I'm in a meeting and can't talk. I need you to process an urgent vendor payment of $47,500 to a new supplier.

// This is time-sensitive and confidential — please don't discuss with anyone until it's done.

// Wire to:
// Account: 4829-1047-2938
// Routing: 021000089

// Confirm when done.

// Robert Mitchell
// CEO`,
//     },
//     detection_criteria: {
//       target_elements:   ["btn-reply", "btn-flag", "btn-delete", "btn-forward"],
//       success_action:    ["flag", "delete"],
//       fail_actions:      ["reply", "forward"],
//       time_pressure_ms:  30000,
//       indicators: [
//         "Sender email 'company-corp.net' does not match actual company domain",
//         "Request for secrecy — 'don't discuss with anyone' is a social engineering tactic",
//         "Unusual channel: CEOs don't typically send wire transfer instructions via email",
//         "Urgency combined with secrecy is the hallmark of BEC (Business Email Compromise)",
//       ],
//       best_practice:
//         "Any financial request via email should be verified by calling the person directly. BEC attacks (Business Email Compromise) cause billions in losses annually.",
//       mitre_id:          "T1656",
//       mitre_description: "Impersonation: business email compromise targeting HR/finance",
//     },
//   },
// ]

// // Helper: get a template by ID
// export const getTemplate = (id) =>
//   ATTACK_TEMPLATES.find((t) => t.id === id) || null

// // Helper: get templates by category
// export const getTemplatesByCategory = (categoryId) =>
//   ATTACK_TEMPLATES.filter((t) => t.category === categoryId)

// src/constants/attackTemplates.js
// Updated: Fix #6 (credential_form), Fix #7 (fake_identity),
//          Fix #8 (geographic), Fix #20 (3-vector advanced template)

export const ATTACK_CATEGORIES = [
  { id: "phishing_link",    label: "Phishing Link",            color: "#ef4444" },
  { id: "attachment",       label: "Malicious Attachment",     color: "#f97316" },
  { id: "extraction",       label: "Info Extraction",          color: "#eab308" },
  { id: "impersonation",    label: "Impersonation",            color: "#a855f7" },
  { id: "credential_form",  label: "Credential Harvesting",    color: "#ec4899" },
  { id: "fake_identity",    label: "Fake Identity",            color: "#14b8a6" },
  { id: "geographic",       label: "Geographic Inconsistency", color: "#3b82f6" },
]

export const VECTOR_TYPE_TO_IMAGE = {
  phishing_link:   "rasp/sim-phishing:latest",
  malicious_file:  "rasp/sim-phishing:latest",
  urgency:         "rasp/sim-phishing:latest",
  credential_form: "rasp/sim-credential-form:latest",
  fake_identity:   "rasp/sim-fake-identity:latest",
  geographic:      "rasp/sim-geographic:latest",
}


export const ATTACK_TEMPLATES = [

  // -----------------------------------------------------------------------
  // PHISHING LINK templates (unchanged)
  // -----------------------------------------------------------------------
  {
    id: "phishing_linkedin",
    name: "Fake LinkedIn Assessment",
    category: "phishing_link",
    description: "Spoofed LinkedIn recruiter with fake assessment portal link",
    email: {
      sender_name:   "Sarah Reynolds",
      sender_email:  "sarah.reynolds@techcorp-global.net",
      sender_title:  "Senior Talent Acquisition Specialist at TechCorp Global",
      subject:       "Exciting Senior Developer Opportunity – Action Required",
      body: `Hi,\n\nI came across your profile and I'm very impressed with your background!\n\nWe have an urgent opening for a Senior Developer role at TechCorp Global that I think would be a perfect fit for you. The position offers $180,000–$220,000 base salary + equity.\n\nWe need to fill this role within 48 hours due to a critical project deadline.\n\nPlease complete our quick pre-screening assessment to move forward:\n\n👉 linkedln.com/assessment/tc-2024\n\nLooking forward to hearing from you!\n\nBest,\nSarah Reynolds`,
    },
    detection_criteria: {
      target_elements:  ["btn-flag", "phishing-link", "btn-reply", "btn-delete", "btn-forward"],
      passing_conditions:  [{ action: "flag" }, { action: "delete" }],
      fail_conditions:     [{ action: "click", element: "phishing-link" }, { action: "reply" }, { action: "forward" }],
      partial_credit_events: [{ action: "delete" }],
      time_pressure_ms: 30000,
      indicators: [
        "Spoofed domain: 'linkedln.com' (n replaces i)",
        "Sender domain doesn't match company name",
        "Extreme urgency: 48-hour deadline",
        "Salary unusually high to override skepticism",
      ],
      best_practice:     "Always hover over links to inspect the real URL. Verify sender domain matches the company.",
      mitre_id:          "T1566",
      mitre_description: "Phishing: spearphishing link via fake recruitment message",
    },
  },

  {
    id: "phishing_job_portal",
    name: "Fake Job Portal Login",
    category: "phishing_link",
    description: "Redirects victim to a credential-harvesting job portal clone",
    email: {
      sender_name:  "Michael Torres",
      sender_email: "m.torres@hirequest-talent.co",
      sender_title: "Executive Recruiter at HireQuest",
      subject:      "Your application has been shortlisted",
      body: `Hello,\n\nCongratulations! You have been shortlisted for the Lead Engineer position.\n\nPlease log in to our candidate portal to schedule your interview:\n\n🔗 careers-hirequest.co/portal\n\nYour access code: HQ-7842-XZ\nThis link expires in 24 hours.\n\nMichael Torres\nHireQuest Talent Solutions`,
    },
    detection_criteria: {
      target_elements:  ["btn-flag", "portal-link", "btn-reply", "btn-delete", "btn-forward"],
      passing_conditions:  [{ action: "flag" }, { action: "delete" }],
      fail_conditions:     [{ action: "click" }, { action: "reply" }, { action: "forward" }],
      partial_credit_events: [{ action: "delete" }],
      time_pressure_ms: 25000,
      indicators: [
        "Domain 'careers-hirequest.co' differs from sender 'hirequest-talent.co'",
        "Unsolicited shortlist with no prior contact",
        "24-hour expiry creates artificial urgency",
      ],
      best_practice:     "Never log into a portal from an unsolicited email. Go to the company's official website directly.",
      mitre_id:          "T1566.002",
      mitre_description: "Phishing: spearphishing link targeting credentials",
    },
  },

  // -----------------------------------------------------------------------
  // MALICIOUS ATTACHMENT templates (unchanged)
  // -----------------------------------------------------------------------
  {
    id: "attachment_pdf_exe",
    name: "Double-Extension Job Offer",
    category: "attachment",
    description: "Executable disguised as PDF using double extension trick",
    email: {
      sender_name:    "Jennifer Park",
      sender_email:   "j.park@global-staffing-hub.com",
      sender_title:   "Recruitment Lead",
      subject:        "Offer Letter – Please Review and Sign",
      body: `Dear Candidate,\n\nWe are pleased to extend a formal offer for the Software Engineer position.\n\nPlease find the offer letter attached. Review and return a signed copy by end of day tomorrow.\n\nCompensation: $145,000 base + $20,000 signing bonus\n\nBest regards,\nJennifer Park`,
      has_attachment:    true,
      attachment_name:   "OfferLetter.pdf.exe",
    },
    detection_criteria: {
      target_elements:  ["btn-flag", "attachment-download", "btn-delete"],
      passing_conditions:  [{ action: "flag" }, { action: "delete" }],
      fail_conditions:     [{ action: "download" }, { action: "reply" }, { action: "forward" }],
      partial_credit_events: [{ action: "delete" }],
      time_pressure_ms: 35000,
      indicators: [
        "File 'OfferLetter.pdf.exe' — .exe hidden behind .pdf",
        "Unverifiable generic sender domain",
        "No prior conversation — unsolicited offer",
        "Deadline pressure: 'by end of day tomorrow'",
      ],
      best_practice:     "Always check the full file extension. An offer letter should never be an .exe file.",
      mitre_id:          "T1204.002",
      mitre_description: "User execution: malicious file with disguised extension",
    },
  },

  {
    id: "attachment_macro",
    name: "Contract with Macro",
    category: "attachment",
    description: "Word document with embedded macro requesting macro enable",
    email: {
      sender_name:    "David Chen",
      sender_email:   "dchen@nexus-partners.io",
      sender_title:   "Managing Partner at Nexus",
      subject:        "NDA and Contract — Requires Your Signature",
      body: `Hello,\n\nAs discussed, please find the attached NDA and consulting contract.\n\nNote: Click \"Enable Content\" when opening the document so the signature fields load correctly.\n\nPlease return signed copies within 48 hours.\n\nDavid Chen\nNexus Partners`,
      has_attachment:  true,
      attachment_name: "NDA_Contract_2024.docm",
    },
    detection_criteria: {
      target_elements:  ["btn-flag", "attachment-download", "btn-delete"],
      passing_conditions:  [{ action: "flag" }, { action: "delete" }],
      fail_conditions:     [{ action: "download" }, { action: "reply" }, { action: "forward" }],
      partial_credit_events: [{ action: "delete" }],
      time_pressure_ms: 35000,
      indicators: [
        "Request to 'Enable Content' / macros is a classic malware vector",
        "Pressure to sign in 48 hours limits verification time",
        "NDA sent without any prior video call or meeting",
        "'As discussed' implies prior relationship that doesn't exist",
      ],
      best_practice:     "Legitimate contracts never require enabling macros. Treat such files as malicious.",
      mitre_id:          "T1566.001",
      mitre_description: "Phishing: spearphishing attachment with malicious macro",
    },
  },

  // -----------------------------------------------------------------------
  // INFO EXTRACTION templates (unchanged)
  // -----------------------------------------------------------------------
  {
    id: "extraction_reference",
    name: "Reference Check Extraction",
    category: "extraction",
    description: "Poses as legitimate reference checker to extract employee info",
    email: {
      sender_name:  "Amanda Wells",
      sender_email: "awells@bg-verification-corp.com",
      sender_title: "Background Verification Specialist",
      subject:      "Reference Check for [Candidate Name] — Urgent",
      body: `Dear HR,\n\nWe are conducting a background check on a candidate who listed your organization as a previous employer.\n\nCould you please confirm the following before 3pm today:\n- Employment dates\n- Role and department\n- Direct manager's name and email\n- Reason for leaving\n- Any disciplinary actions\n\nThis is time-sensitive as the candidate's start date is tomorrow.\n\nAmanda Wells\nBG Verification Corp`,
    },
    detection_criteria: {
      target_elements:  ["btn-reply", "btn-forward", "btn-flag", "btn-delete"],
      passing_conditions:  [{ action: "flag" }, { action: "delete" }],
      fail_conditions:     [{ action: "reply" }, { action: "forward" }],
      partial_credit_events: [{ action: "delete" }],
      time_pressure_ms: 40000,
      indicators: [
        "Requesting sensitive employee data via email from unverifiable source",
        "'Urgent' same-day deadline limits verification time",
        "Asking for manager names and emails — org chart harvesting",
        "Generic unrecognizable sender domain",
      ],
      best_practice:     "Never share employee data via email without verifying the requester through official channels.",
      mitre_id:          "T1598",
      mitre_description: "Phishing for information: social engineering via fake reference check",
    },
  },

  // -----------------------------------------------------------------------
  // IMPERSONATION templates (unchanged)
  // -----------------------------------------------------------------------
  {
    id: "impersonation_ceo",
    name: "CEO Impersonation — Urgent Wire",
    category: "impersonation",
    description: "Attacker impersonates CEO asking HR to process urgent payment",
    email: {
      sender_name:  "Robert Mitchell (CEO)",
      sender_email: "rmitchell@company-corp.net",
      sender_title: "Chief Executive Officer",
      subject:      "Confidential — Urgent Action Required",
      body: `Hi,\n\nI'm in a meeting and can't talk. I need you to process an urgent vendor payment of $47,500 to a new supplier.\n\nThis is time-sensitive and confidential — please don't discuss with anyone until it's done.\n\nWire to:\nAccount: 4829-1047-2938\nRouting: 021000089\n\nConfirm when done.\n\nRobert Mitchell\nCEO`,
    },
    detection_criteria: {
      target_elements:  ["btn-reply", "btn-flag", "btn-delete", "btn-forward"],
      passing_conditions:  [{ action: "flag" }, { action: "delete" }],
      fail_conditions:     [{ action: "reply" }, { action: "forward" }],
      partial_credit_events: [{ action: "delete" }],
      time_pressure_ms: 30000,
      indicators: [
        "Sender email domain doesn't match actual company domain",
        "'Don't discuss with anyone' — social engineering tactic",
        "CEOs don't send wire transfer instructions via email",
        "Urgency + secrecy = hallmark of BEC (Business Email Compromise)",
      ],
      best_practice:     "Any financial request via email must be verified by calling the person directly.",
      mitre_id:          "T1656",
      mitre_description: "Impersonation: business email compromise targeting HR/finance",
    },
  },

  // -----------------------------------------------------------------------
  // CREDENTIAL HARVESTING FORM templates (Fix #6 — new)
  // -----------------------------------------------------------------------
  {
    id: "credential_form_portal",
    name: "Spoofed Job Application Portal",
    category: "credential_form",
    description: "Fake application portal with spoofed domain, no HTTPS, and excessive PII request",
    vectorType: "credential_form",
    detection_criteria: {
      target_elements: ["portal-flag", "btn-advance-interview", "application-form-submit"],
      passing_conditions:  [{ action: "flag" }, { action: "flag", element: "portal-flag" }],
      fail_conditions:     [{ action: "submit", element: "application-form-submit" }],
      partial_credit_events: [{ action: "view", element: "pii-field-ssn" }],
      time_pressure_ms: 60000,
      portal: {
        company_name:   "TalentHub Global",
        spoofed_domain: "careers.talenthub-g1obal.com",
        real_domain:    "careers.talenthubglobal.com",
        has_https:      false,
        excessive_pii:  true,
        pii_fields:     ["ssn", "bank_account", "passport_scan"],
      },
      indicators: [
        "Domain 'talenthub-g1obal.com' uses digit '1' instead of letter 'i'",
        "Missing HTTPS — no padlock in browser bar",
        "Requesting SSN at initial application stage is highly unusual",
        "Bank account details should never be requested before a job offer",
        "Passport scan at application stage is a red flag",
      ],
      best_practice:     "Verify the domain carefully before entering any information. Legitimate portals use HTTPS and never ask for SSN or bank details on initial application.",
      mitre_id:          "T1598",
      mitre_description: "Phishing for information: credential harvesting via spoofed job portal",
    },
  },

  // -----------------------------------------------------------------------
  // FAKE IDENTITY templates (Fix #7 — new)
  // -----------------------------------------------------------------------
  {
    id: "fake_identity_ai_photo",
    name: "AI-Generated Candidate Profile",
    category: "fake_identity",
    description: "Candidate profile with AI-photo artifacts, stolen identity metadata, and timezone mismatch",
    vectorType: "fake_identity",
    detection_criteria: {
      target_elements: ["profile-flag", "btn-advance-interview", "profile-photo", "linkedin-url"],
      passing_conditions:  [{ action: "flag", element: "profile-flag" }],
      fail_conditions:     [{ action: "click", element: "btn-advance-interview" }],
      partial_credit_events: [{ action: "view", element: "ai-artifact-panel" }],
      time_pressure_ms: 90000,
      profile: {
        name:                  "Alex Morgan",
        email:                 "alex.morgan@gmail.com",
        claimed_location:      "New York, NY",
        ip_timezone:           "UTC+8",
        availability_tz_conflict: true,
        photo_ai_artifacts:    true,
        photo_description:     "Asymmetric ear shape, blurred background texture, inconsistent face lighting",
        linkedin_url:          "https://linkedin.com/in/alex-morg4n",
        last_role:             "Senior Engineer at GoogleX",
        applied_role:          "Junior Frontend Developer",
      },
      indicators: [
        "Profile photo shows AI generation artifacts (asymmetric features, background blur)",
        "LinkedIn URL uses '4' instead of 'a' in username — digit substitution",
        "Availability UTC+8 conflicts with claimed New York timezone (UTC-5)",
        "Role mismatch: claims GoogleX senior experience for a junior position",
        "Non-corporate email (gmail) for someone claiming senior tech background",
      ],
      best_practice:     "Reverse-image search all profile photos. Cross-check LinkedIn URL character-by-character. Verify timezone against stated location.",
      mitre_id:          "T1078",
      mitre_description: "Valid accounts: fake identity indicators in candidate profile",
    },
  },

  // -----------------------------------------------------------------------
  // GEOGRAPHIC INCONSISTENCY templates (Fix #8 — new)
  // -----------------------------------------------------------------------
  {
    id: "geographic_timezone_mismatch",
    name: "Geographic / Timezone Mismatch",
    category: "geographic",
    description: "Candidate claims US location but IP, document metadata, and activity timestamps all indicate Asia",
    vectorType: "geographic",
    detection_criteria: {
      target_elements: ["geo-inconsistency-flag", "btn-advance-candidate", "geo-map", "ip-timezone", "document-metadata"],
      passing_conditions:  [{ action: "flag", element: "geo-inconsistency-flag" }],
      fail_conditions:     [{ action: "click", element: "btn-advance-candidate" }],
      partial_credit_events: [{ action: "view", element: "geo-map" }],
      time_pressure_ms: 90000,
      geo: {
        candidate_name:            "James Chen",
        claimed_location:          "San Francisco, CA, USA",
        claimed_timezone:          "PST (UTC-8)",
        ip_timezone:               "UTC+8 (Asia/Shanghai)",
        ip_country:                "China",
        document_metadata_country: "CN",
        availability:              "9am–5pm PST Mon–Fri",
        availability_utc:          "17:00–01:00 UTC",
        last_linkedin_active:      "Today at 03:47 AM PST",
        application_submitted:     "02:23 AM PST",
        resume_created_locale:     "zh-CN",
        phone_country_code:        "+86",
        mismatch_count:            4,
      },
      indicators: [
        "IP timezone (UTC+8) contradicts claimed PST (UTC-8) location",
        "Resume document locale is 'zh-CN' (Chinese Simplified)",
        "Phone country code +86 is China, not USA (+1)",
        "Application submitted at 2:23am PST — inconsistent with San Francisco work hours",
        "LinkedIn last active at 3:47am PST — consistent with UTC+8 business hours",
      ],
      best_practice:     "Cross-reference claimed location against IP timezone, document metadata, and activity timestamps. Four mismatches indicate a likely falsified location.",
      mitre_id:          "T1078",
      mitre_description: "Valid accounts: geographic inconsistency indicating falsified identity",
    },
  },

  // -----------------------------------------------------------------------
  // Fix #20: 3 Simultaneous Vectors — Advanced Template
  // -----------------------------------------------------------------------
  {
    id: "advanced_triple_vector_screening",
    name: "Advanced — Triple Vector Screening Stage",
    category: "fake_identity",
    description: "3 simultaneous attack vectors in one screening stage (BR-02 maximum). Tests fake identity, geographic inconsistency, and credential harvesting at once.",
    isAdvanced: true,
    multiVector: true,
    stageTemplate: {
      name: "screening",
      vectors: [
        {
          vector_type: "fake_identity",
          mitre_id:    "T1078",
          difficulty:  3,
          detection_criteria: {
            target_elements: ["profile-flag", "btn-advance-interview"],
            passing_conditions:  [{ action: "flag" }],
            fail_conditions:     [{ action: "click", element: "btn-advance-interview" }],
            partial_credit_events: [{ action: "view", element: "ai-artifact-panel" }],
            indicators: ["AI-generated photo artifacts", "LinkedIn username digit substitution"],
            best_practice: "Always verify profile photos with reverse image search.",
            mitre_id:          "T1078",
            mitre_description: "Fake identity indicators in candidate profile",
          },
        },
        {
          vector_type: "geographic",
          mitre_id:    "T1078",
          difficulty:  3,
          detection_criteria: {
            target_elements: ["geo-inconsistency-flag", "btn-advance-candidate"],
            passing_conditions:  [{ action: "flag" }],
            fail_conditions:     [{ action: "click", element: "btn-advance-candidate" }],
            partial_credit_events: [{ action: "view", element: "geo-map" }],
            indicators: ["IP timezone mismatch with claimed location", "Document locale inconsistency"],
            best_practice: "Cross-reference location against IP, metadata, and activity times.",
            mitre_id:          "T1078",
            mitre_description: "Geographic inconsistency in candidate data",
          },
        },
        {
          vector_type: "credential_form",
          mitre_id:    "T1598",
          difficulty:  3,
          detection_criteria: {
            target_elements: ["portal-flag", "application-form-submit"],
            passing_conditions:  [{ action: "flag" }],
            fail_conditions:     [{ action: "submit" }],
            partial_credit_events: [{ action: "view", element: "pii-field-ssn" }],
            indicators: ["Missing HTTPS indicator", "Spoofed domain with digit substitution", "Excessive PII request"],
            best_practice: "Verify HTTPS and domain before entering any personal information.",
            mitre_id:          "T1598",
            mitre_description: "Credential harvesting via spoofed application portal",
          },
        },
      ],
    },
  },
]

export const getTemplate          = (id) => ATTACK_TEMPLATES.find((t) => t.id === id) || null
export const getTemplatesByCategory = (categoryId) => ATTACK_TEMPLATES.filter((t) => t.category === categoryId)