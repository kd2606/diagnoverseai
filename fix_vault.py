v_f = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/patient/vault/page.tsx'
with open(v_f, 'r', encoding='utf-8') as f:
    vc = f.read()

vc = vc.replace('title={t("noRemindersSet")', 'title={t("noRemindersSet")}')
vc = vc.replace('body={t("setGentleNudges")', 'body={t("setGentleNudges")}')
vc = vc.replace('title={t("noSchemesMatched")', 'title={t("noSchemesMatched")}')
vc = vc.replace('body={t("onceYouCompleteProfile")', 'body={t("onceYouCompleteProfile")}')
vc = vc.replace('title={t("noMatchingRecords")', 'title={t("noMatchingRecords")}')
vc = vc.replace('title={t("noHealthRecordsYet")', 'title={t("noHealthRecordsYet")}')
vc = vc.replace('body={t("tryDifferentName")', 'body={t("tryDifferentName")}')
vc = vc.replace('body={t("aiAssessmentsSync")', 'body={t("aiAssessmentsSync")}')
vc = vc.replace('}}', '}').replace('action={{', 'action={{').replace('} }', '}}') 
# wait, action={{ label: t("...") }} should not be broken, let's not do the replace }}

with open(v_f, 'w', encoding='utf-8') as f:
    f.write(vc)
print("Fixed missing braces")
