'use client';

import { useRouter } from "next/navigation";

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
    const router = useRouter();

    const switchLanguage = async (newLocale: string) => {
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
    };

    return (
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
            <button
                onClick={() => switchLanguage('en')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                    currentLocale === 'en' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
                EN
            </button>
            <button
                onClick={() => switchLanguage('de')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                    currentLocale === 'de' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
                DE
            </button>
        </div>
    );
}
