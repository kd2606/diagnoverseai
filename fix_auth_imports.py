import os
files = [
    'src/app/[locale]/auth/doctor/login/page.tsx',
    'src/app/[locale]/auth/doctor/register/page.tsx',
    'src/app/[locale]/auth/patient/login/page.tsx',
    'src/app/[locale]/auth/patient/register/page.tsx'
]
for f in files:
    fpath = 'd:/E/diagnoverse.ai/' + f
    if not os.path.exists(fpath): continue
    with open(fpath, 'r', encoding='utf-8') as file:
        content = file.read()
    if 'import { useTranslations }' not in content:
        content = "import { useTranslations } from 'next-intl';\n" + content
    with open(fpath, 'w', encoding='utf-8') as file:
        file.write(content)
print('Fixed Auth imports completely')
