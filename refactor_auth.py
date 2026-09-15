import re
import os

files_to_fix = [
    'src/app/[locale]/auth/doctor/login/page.tsx',
    'src/app/[locale]/auth/doctor/register/page.tsx',
    'src/app/[locale]/auth/patient/login/page.tsx',
    'src/app/[locale]/auth/patient/register/page.tsx'
]

for f in files_to_fix:
    fpath = f"d:/E/diagnoverse.ai/{f}"
    if not os.path.exists(fpath):
        continue
    
    with open(fpath, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if 'const t = ' not in content:
        if 'use client' in content:
            if 'useTranslations' not in content:
                content = content.replace('"use client";', '"use client";\nimport { useTranslations } from "next-intl";')
            content = re.sub(r'(export default function[^{]+{)', r'\1\n  const t = useTranslations("Auth");\n', content)
        else:
            if 'getTranslations' not in content:
                content = 'import { getTranslations } from "next-intl/server";\n' + content
            content = re.sub(r'(export default async function[^{]+{)', r'\1\n  const t = await getTranslations("Auth");\n', content)
            
    # basic safe replacements without breaking JSX
    reps = {
        '>Sign In<': '>{t("login")}<',
        '>Sign in<': '>{t("login")}<',
        '>Sign up<': '>{t("register")}<',
        '>Sign Up<': '>{t("register")}<',
        '>Email<': '>{t("email")}<',
        '>Password<': '>{t("password")}<',
        '>Submit<': '>{t("submit")}<',
    }
    
    for old, new in reps.items():
        content = content.replace(old, new)

    with open(fpath, 'w', encoding='utf-8') as file:
        file.write(content)

print("Auth refactored safely")
