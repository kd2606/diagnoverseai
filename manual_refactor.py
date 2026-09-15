import json

# Replace strings manually for Vault
v_f = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/patient/vault/page.tsx'
with open(v_f, 'r', encoding='utf-8') as f:
    vc = f.read()

replacements = {
    '"No matching records"': 't("noMatchingRecords")',
    '"No health records yet"': 't("noHealthRecordsYet")',
    '"Try a different name, date or clinic."': 't("tryDifferentName")',
    '"Your AI assessments will automatically sync here. Run a scan to create your first record."': 't("aiAssessmentsSync")',
    '"Clear search"': 't("clearSearch")',
    '"Run a Scan"': 't("runScan")',
    '"No reminders set"': 't("noRemindersSet")',
    '"Set gentle nudges for medication, follow-up scans or appointments. We\'ll notify you — never more than once a day."': 't("setGentleNudges")',
    '"Create a Reminder"': 't("createReminder")',
    '>Add Reminder<': '>{t("addReminder")}<',
    '"No schemes matched yet"': 't("noSchemesMatched")',
    '"Once you complete a profile and one assessment, we\'ll check which public health schemes you may be eligible for and list them here."': 't("onceYouCompleteProfile")',
    '"Complete an Assessment"': 't("completeAssessment")',
    '>View Details<': '>{t("viewDetails")}<'
}

for k, v in replacements.items():
    vc = vc.replace(k, v)

if 'useTranslations' not in vc:
    vc = vc.replace('"use client";', '"use client";\nimport { useTranslations } from "next-intl";')
if 'const t = ' not in vc:
    vc = vc.replace('export default function ClinicalVaultPage() {', 'export default function ClinicalVaultPage() {\n  const t = useTranslations("Vault");')

with open(v_f, 'w', encoding='utf-8') as f:
    f.write(vc)

# Same for Assessments
a_f = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/patient/assessments/page.tsx'
with open(a_f, 'r', encoding='utf-8') as f:
    ac = f.read()

a_reps = {
    '>Start<': '>{t("start")}<',
    '>Share with a Clinician<': '>{t("shareClinician")}<',
    '>Take Another<': '>{t("takeAnother")}<',
    '>THIS IS A WELLNESS SCREENING, NOT A DIAGNOSIS. SCORES ONLY REFLECT\n                THE ANSWERS YOU GAVE TODAY.<': '>{t("wellnessScreeningWarning")}<'
}
for k, v in a_reps.items():
    ac = ac.replace(k, v)

if 'useTranslations' not in ac:
    ac = ac.replace('"use client";', '"use client";\nimport { useTranslations } from "next-intl";')
if 'const t = ' not in ac:
    ac = ac.replace('export default function AssessmentsPage() {', 'export default function AssessmentsPage() {\n  const t = useTranslations("Assessments");')

with open(a_f, 'w', encoding='utf-8') as f:
    f.write(ac)

print('Updated Vault and Assessments')
