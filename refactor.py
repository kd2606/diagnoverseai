import re
import os

def refactor_file(file_path, replacements, namespace):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add useTranslations import if client component, else use getTranslations
    is_client = 'use client' in content
    
    # We will just assume client component for these specific pages based on hooks, 
    # but let's check correctly:
    if is_client and 'useTranslations' not in content:
        content = re.sub(r'(\"use client\";?|\'use client\';?)', r'\1\nimport { useTranslations } from "next-intl";', content)
    elif not is_client and 'getTranslations' not in content:
        # Some server components use getTranslations
        pass # we'll handle this manually or just inject useTranslations if it's not a server component. Wait, these are probably client components.
        
    if is_client and 'const t = useTranslations' not in content:
        content = re.sub(r'(export default function[^{]+{)', f'\\1\n  const t = useTranslations("{namespace}");\n', content)

    for old, new in replacements:
        content = content.replace(old, new)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. Respiratory
refactor_file(
    'src/app/[locale]/dashboard/patient/respiratory/page.tsx',
    [
        ('>Tap the microphone, then cough twice.<', '>{t("tapMicrophone")}<'),
        ('>recording<', '>{t("recording")}<'),
        ('>ai triage<', '>{t("aiTriage")}<'),
        ('>Processing AI Triage…<', '>{t("processingAi")}<'),
        ('>Processing AI Triage<', '>{t("processingAi")}<'),
        ('>complete<', '>{t("complete")}<'),
        ('>Your clip has been analyzed.<', '>{t("analyzed")}<'),
        ('>Synced to your Clinical Vault.<', '>{t("syncedVault")}<')
    ],
    'Respiratory'
)

# 2. Scanner
refactor_file(
    'src/app/[locale]/dashboard/patient/scanner/page.tsx',
    [
        ('>live<', '>{t("live")}<'),
        ('>scanning<', '>{t("scanning")}<'),
        ('>complete<', '>{t("complete")}<')
    ],
    'Scanner'
)

print('Refactored respiratory and scanner')
