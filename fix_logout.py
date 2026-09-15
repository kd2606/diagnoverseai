import os
import re

def fix_file(filepath, btn_regex, replacement_btn):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add imports if they don't exist
    if 'import { supabase } from' not in content:
        content = content.replace("import React", "import React\nimport { supabase } from '@/lib/supabase/client';")
        if 'import { supabase } from' not in content:
            content = "import { supabase } from '@/lib/supabase/client';\n" + content

    if 'import { useRouter } from' not in content:
        if 'next/navigation' in content:
            pass # we'll assume it has it or we replace
        else:
            content = "import { useRouter } from 'next/navigation';\n" + content

    # Add router initialization
    if 'const router = useRouter();' not in content:
        # find the function definition
        content = re.sub(r'(export function [^{]+{)', r'\1\n  const router = useRouter();', content)
        content = re.sub(r'(export default function [^{]+{)', r'\1\n  const router = useRouter();', content)
        content = re.sub(r'(const [a-zA-Z0-9_]+ = \([^)]*\) => {)', r'\1\n  const router = useRouter();', content)

    # replace button
    content = re.sub(btn_regex, replacement_btn, content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


# 1. clinician-topnav.tsx
topnav = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/_components/clinician-topnav.tsx'
btn1 = r'(<button[^>]+role="menuitem"[^>]+>)\s*<LogOut[^>]+/>\s*End secure session\s*</button>'
rep1 = r'''\1 onClick={async () => { await supabase.auth.signOut(); router.push('/'); router.refresh(); }}>
                    <LogOut className="h-3.5 w-3.5" aria-hidden />
                    End secure session
                  </button>'''
fix_file(topnav, btn1, rep1)


# 2. clinician-sidebar.tsx
sidebar = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/doctor/_components/clinician-sidebar.tsx'
btn2 = r'<button type="button" aria-label="Sign out"[^>]+>\s*<LogOut[^>]+/>\s*</button>'
rep2 = r'''<button type="button" aria-label="Sign out" onClick={async () => { await supabase.auth.signOut(); router.push('/'); router.refresh(); }} className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-rose-300">
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>'''
fix_file(sidebar, btn2, rep2)

# 3. patient-nav.tsx
patientnav = 'd:/E/diagnoverse.ai/src/app/[locale]/dashboard/patient/_components/patient-nav.tsx'
btn3 = r'<button\s*onClick={\(\) => {\s*setProfileOpen\(false\);\s*}}\s*className="flex w-full items-center px-4 py-2.5 text-sm text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"\s*>\s*\{t\(\'signOut\'\)\}\s*</button>'
rep3 = r'''<button
                      onClick={async () => {
                        setProfileOpen(false);
                        await supabase.auth.signOut();
                        router.push('/');
                        router.refresh();
                      }}
                      className="flex w-full items-center px-4 py-2.5 text-sm text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                    >
                      {t('signOut')}
                    </button>'''
fix_file(patientnav, btn3, rep3)

print("Fixed logout handlers.")
