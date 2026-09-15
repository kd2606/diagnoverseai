import os
import re
import json
import hashlib

def get_hash(s):
    return "k_" + hashlib.md5(s.encode('utf-8')).hexdigest()[:8]

def auto_refactor(filepath, namespace):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all strings inside >...<
    # We want to match >Text< where Text does not contain < or > or { or }
    # Also ignore whitespace-only strings
    matches = re.finditer(r'>([^<{}]+)<', content)
    
    replacements = []
    new_keys = {}
    
    for m in matches:
        text = m.group(1)
        stripped = text.strip()
        if stripped and not stripped.isdigit() and len(stripped) > 1 and stripped not in ['/>', '-->']:
            key = get_hash(stripped)
            new_keys[key] = stripped
            # Replace exactly the original string but wrapped in {t("key")} while preserving surrounding spaces
            original = text
            replaced = original.replace(stripped, f'{{t("{key}")}}')
            replacements.append((f'>{original}<', f'>{replaced}<'))

    if not new_keys:
        return {}

    # Sort replacements by length descending to avoid partial matches
    replacements.sort(key=lambda x: len(x[0]), reverse=True)
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    is_client = 'use client' in content
    if is_client and 'useTranslations' not in content:
        content = re.sub(r'(\"use client\";?|\'use client\';?)', r'\1\nimport { useTranslations } from "next-intl";', content)
    elif not is_client and 'getTranslations' not in content:
        content = 'import { getTranslations } from "next-intl/server";\n' + content
        
    if is_client and 'const t = useTranslations' not in content:
        content = re.sub(r'(export default function[^{]+{)', f'\\1\n  const t = useTranslations("{namespace}");\n', content)
    elif not is_client and 'const t = await getTranslations' not in content:
        content = re.sub(r'(export default async function[^{]+{)', f'\\1\n  const t = await getTranslations("{namespace}");\n', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    return new_keys

files_to_process = [
    'src/app/[locale]/dashboard/patient/vault/page.tsx',
    'src/app/[locale]/dashboard/patient/assessments/page.tsx',
    'src/app/[locale]/auth/doctor/login/page.tsx',
    'src/app/[locale]/auth/doctor/register/page.tsx',
    'src/app/[locale]/auth/patient/login/page.tsx',
    'src/app/[locale]/auth/patient/register/page.tsx'
]

all_new_keys = {}
for f in files_to_process:
    fpath = f"d:/E/diagnoverse.ai/{f}"
    if os.path.exists(fpath):
        keys = auto_refactor(fpath, 'Auto')
        all_new_keys.update(keys)

# Add to en.json
with open('d:/E/diagnoverse.ai/messages/en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)

if 'Auto' not in en_data:
    en_data['Auto'] = {}

for k, v in all_new_keys.items():
    if k not in en_data['Auto']:
        en_data['Auto'][k] = v

with open('d:/E/diagnoverse.ai/messages/en.json', 'w', encoding='utf-8') as f:
    json.dump(en_data, f, indent=2)

print(f"Refactored. Added {len(all_new_keys)} keys to Auto namespace.")
