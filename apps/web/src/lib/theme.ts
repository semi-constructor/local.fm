export const ACCENT_COLORS: Record<string, string> = {
    violet: '262 83% 58%',
    green: '142 71% 45%',
    blue: '217 91% 60%',
    amber: '38 92% 50%'
};

export const FONTS: Record<string, string> = {
    sans: 'var(--font-geist-sans)',
    mono: 'var(--font-geist-mono)',
    serif: 'var(--font-crimson-pro)',
    black: 'var(--font-archivo-black)'
};

export const applyAccentColor = (color: string) => {
    if (typeof document === 'undefined') return;
    const hsl = ACCENT_COLORS[color] || ACCENT_COLORS.violet;
    document.documentElement.style.setProperty('--primary', hsl);
};

export const applyFontFamily = (font: string) => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--font-family', FONTS[font] || FONTS.sans);
};
