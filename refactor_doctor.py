import re

def refactor_doctor_files():
    # 1. doctor/page.tsx (Server Component)
    fpath = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/page.tsx'
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'getTranslations' not in content:
        content = 'import { getTranslations } from "next-intl/server";\n' + content
        content = re.sub(
            r'(export default async function DoctorCommandCenterPage\([^)]+\) {)',
            r'\1\n  const t = await getTranslations("Doctor");',
            content
        )
        content = content.replace('>Loading triage queue...<', '>{t("loadingTriageQueue")}<')
        
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

    # 2. doctor/audit/page.tsx (Server Component)
    fpath = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/audit/page.tsx'
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'getTranslations' not in content:
        content = 'import { getTranslations } from "next-intl/server";\n' + content
        content = re.sub(
            r'(export default async function AuditLedgerPage\([^)]+\) {)',
            r'\1\n  const t = await getTranslations("Doctor");',
            content
        )
        content = content.replace('>Loading audit ledger...<', '>{t("loadingAuditLedger")}<')
        
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

    # 3. doctor/audit/_components/audit-ledger.tsx (Client Component)
    fpath = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/audit/_components/audit-ledger.tsx'
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'useTranslations' not in content:
        content = content.replace('"use client";', '"use client";\nimport { useTranslations } from "next-intl";')
        content = re.sub(r'(export function AuditLedger\([^)]+\) {)', r'\1\n  const t = useTranslations("Doctor");', content)
        content = content.replace('>Search ledger<', '>{t("searchLedger")}<')
        content = content.replace('>No ledger entries match<', '>{t("noLedgerEntries")}<')
        
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

    # 4. doctor/patients/page.tsx (Server Component)
    fpath = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/patients/page.tsx'
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'getTranslations' not in content:
        content = 'import { getTranslations } from "next-intl/server";\n' + content
        content = re.sub(
            r'(export default async function PatientsPage\([^)]+\) {)',
            r'\1\n  const t = await getTranslations("Doctor");',
            content
        )
        content = content.replace('>Loading patient panel...<', '>{t("loadingPatientPanel")}<')
        content = content.replace('>No patients found<', '>{t("noPatientsFound")}<')
        content = content.replace('>There are currently no patients assigned to your panel.<', '>{t("noPatientsAssigned")}<')
        
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

    # 5. doctor/patients/[id]/page.tsx (Server Component)
    fpath = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/patients/[id]/page.tsx'
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'getTranslations' not in content:
        content = 'import { getTranslations } from "next-intl/server";\n' + content
        content = re.sub(
            r'(export default async function PatientHealthPassportPage\([^)]+\) {)',
            r'\1\n  const t = await getTranslations("Doctor");',
            content
        )
        content = content.replace('>Unauthorized Access<', '>{t("unauthorizedAccess")}<')
        content = content.replace('>Registered Medical Practitioner (RMP) login required to view this health passport.<', '>{t("rmpLoginRequired")}<')
        content = content.replace('>Patient Health Passport<', '>{t("patientHealthPassport")}<')
        content = content.replace('>Verified RMP Access Granted<', '>{t("verifiedRmpAccess")}<')
        content = content.replace('>Secure Session<', '>{t("secureSession")}<')
        
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

    # 6. doctor/patients/_components/patient-panel.tsx (Client Component)
    fpath = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/patients/_components/patient-panel.tsx'
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'useTranslations' not in content:
        content = content.replace('"use client";', '"use client";\nimport { useTranslations } from "next-intl";')
        content = re.sub(r'(export function PatientPanel\([^)]+\) {)', r'\1\n  const t = useTranslations("Doctor");', content)
        content = content.replace('>Search patients<', '>{t("searchPatients")}<')
        content = content.replace('>Complaint:<', '>{t("complaint")}<')
        content = content.replace('>AI:<', '>{t("ai")}<')
        content = content.replace('>No matching records<', '>{t("noMatchingRecords")}<')
        
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

    # 7. doctor/settings/page.tsx (Client Component)
    fpath = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/settings/page.tsx'
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'useTranslations' not in content:
        content = content.replace('"use client";', '"use client";\nimport { useTranslations } from "next-intl";')
        content = re.sub(r'(export default function DoctorSettingsPage\([^)]+\) {)', r'\1\n  const t = useTranslations("Doctor");', content)
        content = content.replace('>Verified 2026-07-01<', '>{t("verifiedDate")}<')
        content = content.replace('>PECOS active<', '>{t("pecosActive")}<')
        content = content.replace('>Re-attestation quarterly<', '>{t("reattestationQuarterly")}<')
        
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

    # 8. doctor/_components/case-preview-panel.tsx (Client Component)
    fpath = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/_components/case-preview-panel.tsx'
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'useTranslations' not in content:
        content = content.replace('"use client";', '"use client";\nimport { useTranslations } from "next-intl";')
        content = re.sub(r'(export function CasePreviewPanel\([^)]+\) {)', r'\1\n  const t = useTranslations("Doctor");', content)
        content = content.replace('>Active case<', '>{t("activeCase")}<')
        content = content.replace('>Model reasoning<', '>{t("modelReasoning")}<')
        content = content.replace('>DV-VISION-4.2.1<', '>{t("dvVisionModel")}<')
        content = content.replace('>Differentials<', '>{t("differentials")}<')
        content = content.replace('>Route to<', '>{t("routeTo")}<')
        
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

    # 9. doctor/_components/clinician-sidebar.tsx (Client Component)
    fpath = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/_components/clinician-sidebar.tsx'
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'useTranslations' not in content:
        content = content.replace('"use client";', '"use client";\nimport { useTranslations } from "next-intl";')
        content = re.sub(r'(export function ClinicianSidebar\([^)]+\) {)', r'\1\n  const t = useTranslations("Doctor");', content)
        content = content.replace('>DiagnoVerse AI<', '>{t("diagnoverseAi")}<')
        content = content.replace('>Clinical<', '>{t("clinical")}<')
        content = content.replace('>DV-Vision<', '>{t("dvVision")}<')
        content = content.replace('>v4.2.1<', '>{t("dvVisionVersion")}<')
        
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

refactor_doctor_files()
print('Doctor files refactored')
