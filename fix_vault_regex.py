import re

v_f = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/patient/vault/page.tsx'
with open(v_f, 'r', encoding='utf-8') as f:
    vc = f.read()

# find all `title={t("something")` without `}` and add `}`
vc = re.sub(r'(title|body)=\{t\("([^"]+)"\)(?!\})', r'\1={t("\2")}', vc)

with open(v_f, 'w', encoding='utf-8') as f:
    f.write(vc)
print("Fixed braces safely")
