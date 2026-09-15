import os

def insert_after(filepath, search_str, insert_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        if search_str in line:
            # We want to find the opening brace for the function
            # If search_str is the function name, we find the next '{'
            j = i
            while j < len(lines) and '{' not in lines[j]:
                j += 1
            if j < len(lines):
                # find the index of '{'
                # But what if there are multiple braces? Usually the last one on that line or just after props.
                # In `CasePreviewPanel({ ... }) {`, the body brace is the SECOND brace.
                brace_idx = lines[j].rfind('{')
                lines[j] = lines[j][:brace_idx+1] + '\n' + insert_str + lines[j][brace_idx+1:]
                break
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)

insert_after('d:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/_components/case-preview-panel.tsx', 'export function CasePreviewPanel(', '  const t = useTranslations("Doctor");\n')
insert_after('d:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/audit/page.tsx', 'export default async function AuditLedgerPage(', '  const t = await getTranslations("Doctor");\n')
insert_after('d:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/patients/page.tsx', 'export default async function PatientsPage(', '  const t = await getTranslations("Doctor");\n')
insert_after('d:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/settings/page.tsx', 'export default function DoctorSettingsPage(', '  const t = useTranslations("Doctor");\n')
print('Injected t')
