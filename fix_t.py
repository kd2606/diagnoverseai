import re
import os

fixes = [
    {
        'file': 'src/app/[locale]/dashboard/doctor/_components/case-preview-panel.tsx',
        'find': 'export function CasePreviewPanel({\n  triageCase: c,\n  audit,\n  onApprove,\n  onReject,\n  onRevise,\n  onReroute\n}: {\n  triageCase: AdjudicatedCase | null;\n  audit: AuditEntry[];\n  onApprove: (id: string) => void;\n  onReject: (id: string) => void;\n  onRevise: (id: string, newPlan: string) => void;\n  onReroute: (id: string, specialty: string) => void;\n}) {',
        'repl': 'export function CasePreviewPanel({\n  triageCase: c,\n  audit,\n  onApprove,\n  onReject,\n  onRevise,\n  onReroute\n}: {\n  triageCase: AdjudicatedCase | null;\n  audit: AuditEntry[];\n  onApprove: (id: string) => void;\n  onReject: (id: string) => void;\n  onRevise: (id: string, newPlan: string) => void;\n  onReroute: (id: string, specialty: string) => void;\n}) {\n  const t = useTranslations("Doctor");'
    },
    {
        'file': 'src/app/[locale]/dashboard/doctor/audit/page.tsx',
        'find': 'export default async function AuditLedgerPage({\n  params,\n}: {\n  params: Promise<{ locale: string }>;\n}) {',
        'repl': 'export default async function AuditLedgerPage({\n  params,\n}: {\n  params: Promise<{ locale: string }>;\n}) {\n  const t = await getTranslations("Doctor");'
    },
    {
        'file': 'src/app/[locale]/dashboard/doctor/patients/page.tsx',
        'find': 'export default async function PatientsPage({\n  params,\n}: {\n  params: Promise<{ locale: string }>;\n}) {',
        'repl': 'export default async function PatientsPage({\n  params,\n}: {\n  params: Promise<{ locale: string }>;\n}) {\n  const t = await getTranslations("Doctor");'
    },
    {
        'file': 'src/app/[locale]/dashboard/doctor/settings/page.tsx',
        'find': 'export default function DoctorSettingsPage() {',
        'repl': 'export default function DoctorSettingsPage() {\n  const t = useTranslations("Doctor");'
    }
]

for fix in fixes:
    fpath = f"d:/E/diagnoverse.ai/{fix['file']}"
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(fix['find'], fix['repl'])
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
print('Fixed missing t variables')
