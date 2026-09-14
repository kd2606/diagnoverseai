"use client";

import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useState, useTransition } from "react";

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const changeLanguage = (nextLocale: string) => {
    setIsOpen(false);
    startTransition(() => {
      // Replaces the current locale in the URL (e.g., /en/dashboard -> /hi/dashboard)
      const segments = pathname.split('/');
      segments[1] = nextLocale;
      router.replace(segments.join('/'));
    });
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center justify-center p-2 rounded-full hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/[0.08] text-white/70 hover:text-white"
      >
        <Globe className="h-5 w-5"/>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 origin-top-right rounded-xl border border-white/[0.08] bg-[#0a0a0a] shadow-lg shadow-black/50 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            <button
              onClick={() => changeLanguage('en')}
              className="block w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/[0.05] hover:text-white"
            >
              English
            </button>
            <button
              onClick={() => changeLanguage('hi')}
              className="block w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/[0.05] hover:text-white"
            >
              हिंदी (Hindi)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
