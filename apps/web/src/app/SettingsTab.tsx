'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { 
    Palette, Globe, Link2, LayoutDashboard, 
    Zap, ShieldCheck, Cpu, Check, Sun, Moon, 
    Monitor, RefreshCw, Download, ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import axios from 'axios';
import { LanguageSwitcher } from '@/components/language-switcher';

const ACCENT_COLORS: Record<string, string> = {
    violet: '262 83% 58%',
    green: '142 71% 45%',
    blue: '217 91% 60%',
    amber: '38 92% 50%'
};

export function SettingsTab({ dict, locale, spotifyStatus, disconnect, activeSection: initialSection, session }: any) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [activeSection, setActiveSection] = useState(initialSection || 'appearance');
    const [accentColor, setAccentColor] = useState('violet');
    const [fontFamily, setFontFamily] = useState('sans');
    const [dashboardPrefs, setDashboardPrefs] = useState<any>({
        summary: true,
        currentlyPlaying: true,
        recentlyPlayed: true,
        habits: true,
        topItems: true,
        heatmap: true,
        genres: true
    });
    const [recapPrefs, setRecapPrefs] = useState<any>({
        year: new Date().getFullYear(),
        showGenres: true,
        showActiveDay: true,
        animation: true
    });
    const [systemHealth, setSystemHealth] = useState<any>(null);
    const [isPublic, setIsPublic] = useState(false);
    const [publicId, setPublicId] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (initialSection) {
            setActiveSection(initialSection);
        }
    }, [initialSection]);

    useEffect(() => {
        setMounted(true);
        const storedAccent = localStorage.getItem('accent-color') || 'violet';
        setAccentColor(storedAccent);
        applyAccentColor(storedAccent);
        
        const storedFont = localStorage.getItem('font-family') || 'sans';
        setFontFamily(storedFont);
        applyFontFamily(storedFont);

        // Load user settings
        if (session?.user) {
            setPublicId(session.user.publicId || '');
            setIsPublic(!!session.user.isPublicStats);
            if (session.user.fontFamily) setFontFamily(session.user.fontFamily);
            if (session.user.dashboardPrefs) setDashboardPrefs(session.user.dashboardPrefs);
            if (session.user.recapPrefs) setRecapPrefs(session.user.recapPrefs);
        }

        fetchSystemHealth();
    }, [session]);

    const fetchSystemHealth = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
            setSystemHealth(res.data);
        } catch (e) { console.error(e); }
    };

    const togglePublicStats = async () => {
        const newValue = !isPublic;
        setIsPublic(newValue);
        try {
            await axios.post(`${API_BASE_URL}/user/update`, { isPublicStats: newValue }, { withCredentials: true });
        } catch (e) { 
            console.error(e);
            setIsPublic(!newValue);
        }
    };

    const copyLink = () => {
        const url = `${window.location.origin}/u/${publicId}`;
        navigator.clipboard.writeText(url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const applyAccentColor = (color: string) => {
        const hsl = ACCENT_COLORS[color] || ACCENT_COLORS.violet;
        document.documentElement.style.setProperty('--primary', hsl);
        localStorage.setItem('accent-color', color);
    };

    const applyFontFamily = (font: string) => {
        const FONTS: Record<string, string> = {
            sans: 'var(--font-geist-sans)',
            mono: 'var(--font-geist-mono)',
            serif: 'serif',
            black: 'Archivo Black, sans-serif'
        };
        document.documentElement.style.setProperty('--font-family', FONTS[font] || FONTS.sans);
        localStorage.setItem('font-family', font);
    };

    const updateAccentColor = async (color: string) => {
        setAccentColor(color);
        applyAccentColor(color);
        try {
            await axios.post(`${API_BASE_URL}/user/update`, { accentColor: color }, { withCredentials: true });
        } catch (e) { console.error(e); }
    };

    const updateFontFamily = async (font: string) => {
        setFontFamily(font);
        applyFontFamily(font);
        try {
            await axios.post(`${API_BASE_URL}/user/update`, { fontFamily: font }, { withCredentials: true });
        } catch (e) { console.error(e); }
    };

    const updateDashboardPrefs = async (key: string) => {
        const newPrefs = { ...dashboardPrefs, [key]: !dashboardPrefs[key] };
        setDashboardPrefs(newPrefs);
        try {
            await axios.post(`${API_BASE_URL}/user/update`, { dashboardPrefs: newPrefs }, { withCredentials: true });
        } catch (e) { console.error(e); }
    };

    const updateRecapPrefs = async (key: string, value: any) => {
        const newPrefs = { ...recapPrefs, [key]: value };
        setRecapPrefs(newPrefs);
        try {
            await axios.post(`${API_BASE_URL}/user/update`, { recapPrefs: newPrefs }, { withCredentials: true });
        } catch (e) { console.error(e); }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await axios.post(`${API_BASE_URL}/connect/sync`, {}, { withCredentials: true });
            setTimeout(() => setIsSyncing(false), 2000);
        } catch (e) {
            console.error(e);
            setIsSyncing(false);
        }
    };

    const handleExport = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/user/export-data`, { withCredentials: true });
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `localfm-export-${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (e) { console.error(e); }
    };

    const handleDeleteData = async () => {
        if (!confirm(dict.data.confirmDelete + "? This cannot be undone.")) return;
        try {
            await axios.post(`${API_BASE_URL}/user/delete-data`, {}, { withCredentials: true });
            alert("All data has been deleted.");
            window.location.reload();
        } catch (e) { console.error(e); }
    };

    const sections = [
        { id: 'appearance', icon: <Palette className="w-4 h-4" />, label: dict.sections.appearance },
        { id: 'localization', icon: <Globe className="w-4 h-4" />, label: dict.sections.localization },
        { id: 'spotify', icon: <Link2 className="w-4 h-4" />, label: dict.sections.spotify },
        { id: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: dict.sections.dashboard },
        { id: 'recap', icon: <Zap className="w-4 h-4" />, label: dict.sections.recap },
        { id: 'privacy', icon: <ShieldCheck className="w-4 h-4" />, label: dict.sections.privacy },
        { id: 'advanced', icon: <Cpu className="w-4 h-4" />, label: dict.sections.advanced }
    ];

    if (!mounted) return null;

    return (
        <div className="flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 space-y-1">
                <div className="px-4 mb-4">
                    <h2 className="text-2xl font-black tracking-tighter">{dict.title}</h2>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{dict.subtitle}</p>
                </div>
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                            activeSection === section.id 
                                ? "bg-primary text-primary-foreground shadow-lg" 
                                : "text-muted-foreground hover:bg-secondary/50"
                        )}
                    >
                        {section.icon}
                        {section.label}
                    </button>
                ))}
            </aside>

            {/* Content Area */}
            <div className="flex-1 max-w-3xl">
                <Card premium className="p-8">
                    {activeSection === 'appearance' && (
                        <div className="space-y-10">
                            <section>
                                <h3 className="text-lg font-black tracking-tight mb-6 flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-muted-foreground" />
                                    {dict.appearance.theme.title}
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'light', icon: <Sun className="w-4 h-4" />, label: dict.appearance.theme.light },
                                        { id: 'dark', icon: <Moon className="w-4 h-4" />, label: dict.appearance.theme.dark },
                                        { id: 'system', icon: <Monitor className="w-4 h-4" />, label: dict.appearance.theme.system }
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTheme(t.id)}
                                            className={cn(
                                                "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all group",
                                                theme === t.id 
                                                    ? "border-foreground bg-secondary/30" 
                                                    : "border-transparent bg-secondary/10 hover:bg-secondary/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                                                theme === t.id ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                                            )}>
                                                {t.icon}
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-black tracking-tight mb-6 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-muted-foreground" />
                                    {dict.appearance.font.title}
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        { id: 'sans', label: dict.appearance.font.sans, class: 'font-sans' },
                                        { id: 'mono', label: dict.appearance.font.mono, class: 'font-mono' },
                                        { id: 'serif', label: dict.appearance.font.serif, class: 'font-serif' },
                                        { id: 'black', label: dict.appearance.font.black, class: 'font-black' }
                                    ].map((f) => (
                                        <button
                                            key={f.id}
                                            onClick={() => updateFontFamily(f.id)}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                                fontFamily === f.id 
                                                    ? "border-primary bg-primary/5" 
                                                    : "border-transparent bg-secondary/10 hover:bg-secondary/20"
                                            )}
                                        >
                                            <span className={cn("text-xl", f.class)}>Aa</span>
                                            <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">{f.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-black tracking-tight mb-6 flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-muted-foreground" />
                                    {dict.appearance.accent.title}
                                </h3>
                                <div className="flex flex-wrap gap-4">
                                    {[
                                        { id: 'green', color: 'bg-green-500', label: dict.appearance.accent.green },
                                        { id: 'violet', color: 'bg-violet-500', label: dict.appearance.accent.violet },
                                        { id: 'blue', color: 'bg-blue-500', label: dict.appearance.accent.blue },
                                        { id: 'amber', color: 'bg-amber-500', label: dict.appearance.accent.amber }
                                    ].map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => updateAccentColor(c.id)}
                                            className={cn(
                                                "group flex items-center gap-3 px-4 py-2 rounded-full border transition-all",
                                                accentColor === c.id ? "bg-secondary border-primary/50" : "bg-secondary/20 border-transparent hover:border-border"
                                            )}
                                        >
                                            <div className={cn("w-4 h-4 rounded-full shadow-sm", c.color)} />
                                            <span className={cn(
                                                "text-xs font-bold transition-colors",
                                                accentColor === c.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                            )}>{c.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {activeSection === 'localization' && (
                        <div className="space-y-10">
                            <section>
                                <h3 className="text-lg font-black tracking-tight mb-6">Language</h3>
                                <LanguageSwitcher currentLocale={locale} />
                            </section>
                            <section className="opacity-50">
                                <h3 className="text-lg font-black tracking-tight mb-4 italic">Format Options</h3>
                                <p className="text-sm font-bold text-muted-foreground">Regional date and time formats are coming soon.</p>
                            </section>
                        </div>
                    )}

                    {activeSection === 'spotify' && (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between p-6 bg-secondary/20 rounded-3xl border border-border/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#1DB954] rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                                        <Link2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg">{dict.spotify.connected}</h4>
                                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                                            <Check className="w-3 h-3 text-green-500" />
                                            Active Session
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleSync}
                                        disabled={isSyncing}
                                        className="p-3 bg-secondary/50 rounded-xl hover:bg-secondary transition-all disabled:opacity-50"
                                        title={dict.spotify.syncNow}
                                    >
                                        <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                    </button>
                                    <button 
                                        onClick={() => disconnect('spotify')}
                                        className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                                    >
                                        {dict.data.delete}
                                    </button>
                                </div>
                            </div>

                            <section className="p-6 border border-dashed border-border/50 rounded-3xl opacity-50">
                                <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">Other Integrations</h4>
                                <p className="text-xs font-bold text-muted-foreground italic">More connections coming soon.</p>
                            </section>
                        </div>
                    )}

                    {activeSection === 'privacy' && (
                        <div className="space-y-8">
                            <section className="space-y-6">
                                <div className="flex items-center justify-between p-6 bg-secondary/20 rounded-3xl border border-border/50">
                                    <div className="flex-1">
                                        <h4 className="font-black text-lg">{dict.privacy.public.label}</h4>
                                        <p className="text-xs font-bold text-muted-foreground">{dict.privacy.public.desc}</p>
                                    </div>
                                    <button 
                                        onClick={togglePublicStats}
                                        className={cn(
                                            "w-14 h-8 rounded-full p-1 transition-all duration-300",
                                            isPublic ? "bg-primary" : "bg-muted"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 transform",
                                            isPublic ? "translate-x-6" : "translate-x-0"
                                        )} />
                                    </button>
                                </div>

                                {isPublic && (
                                    <div className="p-6 bg-secondary/10 rounded-3xl border border-dashed border-border/50 animate-in zoom-in-95 duration-300">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">
                                            {dict.privacy.link.label}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-background px-4 py-3 rounded-xl border border-border/50 text-xs font-mono truncate">
                                                {typeof window !== 'undefined' && `${window.location.origin}/u/${publicId}`}
                                            </div>
                                            <button 
                                                onClick={copyLink}
                                                className="px-4 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                            >
                                                {isCopied ? dict.privacy.link.copied : dict.privacy.link.copy}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className="space-y-4 pt-8 border-t border-border/50">
                                <h3 className="text-lg font-black tracking-tight">{dict.data.export}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button 
                                        onClick={handleExport}
                                        className="flex items-center gap-4 p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/30 transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center border border-border/50 group-hover:border-foreground transition-colors">
                                            <Download className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-black tracking-tight">{dict.data.exportJson}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Everything</p>
                                        </div>
                                    </button>
                                </div>
                            </section>

                            <section className="pt-8 border-t border-border/50">
                                <div className="bg-red-500/5 border border-red-500/10 rounded-[32px] p-8">
                                    <h3 className="text-red-500 text-lg font-black tracking-tight mb-2">{dict.data.delete}</h3>
                                    <p className="text-sm font-medium text-muted-foreground mb-6 max-w-md">{dict.data.deleteDesc}</p>
                                    <button 
                                        onClick={handleDeleteData}
                                        className="px-6 py-3 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/10 active:scale-95"
                                    >
                                        {dict.data.confirmDelete}
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeSection === 'dashboard' && (
                        <div className="space-y-10">
                            <section>
                                <div className="mb-8">
                                    <h3 className="text-lg font-black tracking-tight mb-1">{dict.dashboard.title}</h3>
                                    <p className="text-xs font-bold text-muted-foreground">{dict.dashboard.description}</p>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { id: 'summary', label: dict.dashboard.sections.summary },
                                        { id: 'currentlyPlaying', label: dict.dashboard.sections.currentlyPlaying },
                                        { id: 'recentlyPlayed', label: dict.dashboard.sections.recentlyPlayed },
                                        { id: 'habits', label: dict.dashboard.sections.habits },
                                        { id: 'topItems', label: dict.dashboard.sections.topItems },
                                        { id: 'heatmap', label: dict.dashboard.sections.heatmap },
                                        { id: 'genres', label: dict.dashboard.sections.genres }
                                    ].map((s) => (
                                        <div key={s.id} className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl border border-border/50">
                                            <span className="text-sm font-bold">{s.label}</span>
                                            <button 
                                                onClick={() => updateDashboardPrefs(s.id)}
                                                className={cn(
                                                    "w-12 h-7 rounded-full p-1 transition-all duration-300",
                                                    dashboardPrefs[s.id] ? "bg-primary" : "bg-muted"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 bg-white rounded-full transition-all duration-300 transform",
                                                    dashboardPrefs[s.id] ? "translate-x-5" : "translate-x-0"
                                                )} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}
                    {activeSection === 'recap' && (
                        <div className="space-y-10">
                            <section>
                                <div className="mb-8">
                                    <h3 className="text-lg font-black tracking-tight mb-1">{dict.recap.title}</h3>
                                    <p className="text-xs font-bold text-muted-foreground">{dict.recap.description}</p>
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="p-6 bg-secondary/10 rounded-3xl border border-border/50">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">
                                            {dict.recap.year}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {[2023, 2024, 2025, 2026].map((y) => (
                                                <button
                                                    key={y}
                                                    onClick={() => updateRecapPrefs('year', y)}
                                                    className={cn(
                                                        "px-6 py-2 rounded-xl text-xs font-black transition-all",
                                                        recapPrefs.year === y 
                                                            ? "bg-primary text-primary-foreground shadow-lg" 
                                                            : "bg-background text-muted-foreground hover:bg-secondary"
                                                    )}
                                                >
                                                    {y}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {[
                                            { id: 'showGenres', label: dict.recap.showGenres },
                                            { id: 'showActiveDay', label: dict.recap.showActiveDay },
                                            { id: 'animation', label: dict.recap.animation }
                                        ].map((s) => (
                                            <div key={s.id} className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl border border-border/50">
                                                <span className="text-sm font-bold">{s.label}</span>
                                                <button 
                                                    onClick={() => updateRecapPrefs(s.id, !recapPrefs[s.id])}
                                                    className={cn(
                                                        "w-12 h-7 rounded-full p-1 transition-all duration-300",
                                                        recapPrefs[s.id] ? "bg-primary" : "bg-muted"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 bg-white rounded-full transition-all duration-300 transform",
                                                        recapPrefs[s.id] ? "translate-x-5" : "translate-x-0"
                                                    )} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                    {activeSection === 'advanced' && (
                        <div className="space-y-10">
                            <section>
                                <div className="mb-8">
                                    <h3 className="text-lg font-black tracking-tight mb-1">{dict.advanced.title}</h3>
                                    <p className="text-xs font-bold text-muted-foreground">{dict.advanced.description}</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-6 bg-secondary/10 rounded-3xl border border-border/50 space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                                                {dict.advanced.system.version}
                                            </label>
                                            <p className="text-sm font-mono font-bold">v1.0.0-stable</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                                                {dict.advanced.system.environment}
                                            </label>
                                            <p className="text-sm font-bold capitalize">{session?.user?.id ? 'Production' : 'Development'}</p>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-secondary/10 rounded-3xl border border-border/50 space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                                                {dict.advanced.system.database}
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                <p className="text-sm font-bold">Connected</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                                                {dict.advanced.system.redis}
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", systemHealth?.redis === 'ready' ? "bg-green-500" : "bg-amber-500")} />
                                                <p className="text-sm font-bold capitalize">{systemHealth?.redis || 'Checking...'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="opacity-50">
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">{dict.advanced.logs.title}</h3>
                                <button disabled className="w-full text-left p-4 bg-secondary/10 rounded-2xl border border-dashed border-border/50">
                                    <p className="text-xs font-bold text-muted-foreground italic">{dict.advanced.logs.view} (Coming Soon)</p>
                                </button>
                            </section>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
