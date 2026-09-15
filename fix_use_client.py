import os

files = [
    'src/app/[locale]/auth/doctor/login/page.tsx',
    'src/app/[locale]/auth/doctor/register/page.tsx',
    'src/app/[locale]/auth/patient/login/page.tsx',
    'src/app/[locale]/auth/patient/register/page.tsx'
]

for f in files:
    fpath = os.path.join('d:/E/diagnoverse.ai', f)
    if not os.path.exists(fpath): continue
    
    with open(fpath, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    # Filter out 'use client'; directives
    new_lines = []
    has_use_client = False
    
    for line in lines:
        stripped = line.strip()
        if stripped in ["'use client';", '"use client";', "'use client'", '"use client"']:
            has_use_client = True
        else:
            new_lines.append(line)
            
    # Add it to the top if it was present
    if has_use_client:
        new_lines.insert(0, "'use client';\n")
        
    with open(fpath, 'w', encoding='utf-8') as file:
        file.writelines(new_lines)

print('Fixed use client directive placement.')
