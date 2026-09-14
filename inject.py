import sys

with open('src/components/floating-chat.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_stmt = "import { ConsentModal } from '@/components/patient/ConsentModal';\n"
if 'ConsentModal' not in content:
    content = content.replace("import { cn } from '@/lib/utils';", "import { cn } from '@/lib/utils';\n" + import_stmt)

state_hook = '''
  const [hasConsent, setHasConsent] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem('pulse_dpdp_consent');
      if (consent === 'true') {
        setHasConsent(true);
      }
    }
  }, []);
'''

if 'const [hasConsent' not in content:
    target_state = 'const [isOpen, setIsOpen] = useState(false);'
    content = content.replace(target_state, target_state + state_hook)

modal_injection = '''
            {!hasConsent && (
              <ConsentModal onConsent={(storeLocally) => {
                setHasConsent(true);
                localStorage.setItem('pulse_dpdp_consent', 'true');
                if (storeLocally) {
                  localStorage.setItem('pulse_store_locally', 'true');
                }
              }} />
            )}
'''

target_render = '''
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'flex flex-col overflow-hidden bg-[#050505]/85 backdrop-blur-3xl shadow-[0_0_80px_-20px_rgba(99,102,241,0.3)]',
              'fixed inset-0 w-[100vw] h-[100dvh] sm:static sm:inset-auto sm:h-[580px] sm:w-[380px] sm:rounded-2xl sm:border sm:border-white/[0.08]'
            )}
          >'''

if '!hasConsent' not in content:
    content = content.replace(target_render, target_render + modal_injection)

with open('src/components/floating-chat.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Injected ConsentModal')
