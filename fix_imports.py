import re

files = [
    'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/_components/clinician-sidebar.tsx',
    'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/_components/clinician-topnav.tsx',
    'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/patient/_components/patient-nav.tsx'
]

for p in files:
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    
    if 'import { useRouter } from "next/navigation"' not in c and 'import { useRouter } from \'next/navigation\'' not in c:
        c = "import { useRouter } from 'next/navigation';\n" + c
        
    # fix the duplicate router in patient-nav
    if c.count('const router = useRouter();') > 1:
        c = c.replace('const router = useRouter();', '', 1) # remove the first one which might be misplaced
        
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
print("Fixed useRouter imports")
