import json

v_f = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/patient/vault/page.tsx'
with open(v_f, 'r', encoding='utf-8') as f:
    vc = f.read()

# Fix the JSX attribute braces
vc = vc.replace('title=t("', 'title={t("').replace('body=t("', 'body={t("').replace('label: t("', 'label: t("')
# wait, 'label: t("' is in an object `{ label: t("...") }` so it's already in JS context, that's fine.
# But for `title=t("noMatchingRecords")` it should be `title={t("noMatchingRecords")}`.
# I will use regex to fix `attr=t(...)` to `attr={t(...)}`
import re
vc = re.sub(r'(title|body)=t\("([^"]+)"\)', r'\1={t("\2")}', vc)

with open(v_f, 'w', encoding='utf-8') as f:
    f.write(vc)
print("Fixed attributes")
