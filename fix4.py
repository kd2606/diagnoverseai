filepath = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/patients/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('async function PatientPanelLoader() {', 'async function PatientPanelLoader() {\n  const t = await getTranslations("Doctor");')
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed Loader')
