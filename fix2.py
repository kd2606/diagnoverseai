import os

def fix_file(filepath, client):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    lines = [line for line in lines if 'const t = ' not in line]

    for i in range(len(lines)):
        if '}) {' in lines[i] or ') {' in lines[i]:
            if 'export ' in lines[i-5] or 'export ' in lines[i-4] or 'export ' in lines[i-3] or 'export ' in lines[i-2] or 'export ' in lines[i-1] or 'export ' in lines[i]:
                hook = '  const t = useTranslations("Doctor");\n' if client else '  const t = await getTranslations("Doctor");\n'
                lines[i] = lines[i].replace('{', '{\n' + hook, 1)
                break

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)

fix_file('d:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/_components/case-preview-panel.tsx', True)
fix_file('d:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/audit/page.tsx', False)
fix_file('d:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/patients/page.tsx', False)
fix_file('d:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/settings/page.tsx', True)
print('Fixed')
