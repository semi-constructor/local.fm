'use client';

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { Music, Clock, BarChart3, ChevronRight, Play, Flame, LayoutDashboard, Calendar, Trophy, ListMusic, User, Disc, Activity, RotateCcw, Settings, LogOut, ExternalLink, Link2, Unlink } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Card, StatCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip 
} from 'recharts';

import { LifetimeTab } from "./LifetimeTab";
import { TimeframeTab } from "./TimeframeTab";
import { TopTab } from "./TopTab";
import { HistoryTab } from "./HistoryTab";
import { SettingsTab } from "./SettingsTab";
import { applyAccentColor, applyFontFamily } from "@/lib/theme";

export default function DashboardShell({ session, dict, common, historyDict, settingsDict, locale }: { 
    session: any, 
    dict: any, 
    common: any, 
    historyDict: any,
    settingsDict: any,
    locale: string 
}) {
    // Tabs
    const [mainTab, setMainTab] = useState<'main' | 'lifetime' | 'timeframe' | 'top' | 'history' | 'settings'>('main');
    const [settingsSection, setSettingsSection] = useState('appearance');
    const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('month');
    const [topSubTab, setTopSubTab] = useState<'tracks' | 'artists' | 'albums' | 'genres'>('tracks');
    
    // UI State
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<'settings' | 'connections' | 'import' | null>(null);
    
    // Data State
    const [spotifyStatus, setSpotifyStatus] = useState<any>(null);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<any>(null);
    const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [habits, setHabits] = useState<any>(null);
    const [topTracks, setTopTracks] = useState<any[]>([]);
    const [topArtists, setTopArtists] = useState<any[]>([]);
    const [topAlbums, setTopAlbums] = useState<any[]>([]);
    const [topGenres, setTopGenres] = useState<any[]>([]);
    const [heatmap, setHeatmap] = useState<any[]>([]);
    const [imports, setImports] = useState<any[]>([]);

    // Polling Currently Playing and Status
    useEffect(() => {
        if (session?.user?.accentColor) applyAccentColor(session.user.accentColor);
        if (session?.user?.fontFamily) applyFontFamily(session.user.fontFamily);
        
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const tick = () => {
            fetchCurrentlyPlaying();
            fetchSpotifyStatus();
            fetchImports();
        };

        const slowTick = () => {
            if (mainTab === 'main') {
                axios.get(`${API_BASE_URL}/stats/recently-played`, { withCredentials: true }).then(r => setRecentlyPlayed(r.data));
                axios.get(`${API_BASE_URL}/stats/summary?timeframe=day&timezone=${timezone}`, { withCredentials: true }).then(r => setSummary(r.data));
            }
        };

        tick();
        slowTick();

        const interval = setInterval(tick, 10000);
        const slowInterval = setInterval(slowTick, 60000);

        return () => {
            clearInterval(interval);
            clearInterval(slowInterval);
        };
    }, [mainTab, session]); // Re-run when tab changes or session updates

    const isVisible = (sectionId: string) => {
        let prefs = session?.user?.dashboardPrefs;
        if (typeof prefs === 'string') {
            try {
                prefs = JSON.parse(prefs);
            } catch (e) {}
        }
        if (!prefs || typeof prefs !== 'object') return true;
        return prefs[sectionId] !== false;
    };

    const fetchImports = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/import/list`, { withCredentials: true });
            const newImports = res?.data || [];
            
            // Check if any import just finished
            const wasProcessing = imports.some((i: any) => i.status === 'PROCESSING' || i.status === 'PENDING');
            const isDone = newImports.some((i: any) => i.status === 'COMPLETED' && imports.find((old: any) => old.id === i.id)?.status !== 'COMPLETED');
            
            if (wasProcessing && isDone) {
                console.log("Import detected as completed, refreshing stats...");
                fetchMainData();
            }
            
            setImports(newImports);
        } catch (error) { console.error(error); }
    };

    const fetchMainData = () => {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (mainTab === 'main') {
            axios.get(`${API_BASE_URL}/stats/recently-played`, { withCredentials: true }).then(r => setRecentlyPlayed(r.data));
            axios.get(`${API_BASE_URL}/stats/summary?timeframe=day&timezone=${timezone}`, { withCredentials: true }).then(r => setSummary(r.data));
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${API_BASE_URL}/import/upload`, formData, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Upload successful! Import is now processing.");
            fetchImports();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.error || "Upload failed");
        }
    };

    const fetchSpotifyStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/connect/spotify/status`, { withCredentials: true });
            setSpotifyStatus(res?.data || null);
        } catch (error) { console.error(error); }
    };

    const fetchCurrentlyPlaying = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/stats/currently-playing`, { withCredentials: true });
            setCurrentlyPlaying(res?.data || null);
        } catch (error) { console.error(error); }
    };

    // Fetch Data based on Tabs
    useEffect(() => {
        const fetchMain = async () => {
            try {
                const [recentRes, summaryRes, genresRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/stats/recently-played`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/stats/summary?timeframe=day`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/stats/top-genres?timeframe=month&limit=5`, { withCredentials: true })
                ]);
                setRecentlyPlayed(recentRes?.data || []);
                setTopGenres(genresRes?.data || []);
                if (mainTab === 'main') setSummary(summaryRes?.data || null);
            } catch (e) { console.error(e); }
        };

        const fetchStats = async (tf: string) => {
            try {
                const [summaryRes, habitsRes, genresRes, heatmapRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/stats/summary?timeframe=${tf}`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/stats/habits?timeframe=${tf}`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/stats/top-genres?timeframe=${tf}&limit=6`, { withCredentials: true }),
                    tf === 'lifetime' ? axios.get(`${API_BASE_URL}/stats/heatmap`, { withCredentials: true }) : Promise.resolve({ data: [] })
                ]);
                setSummary(summaryRes?.data || null);
                setHabits(habitsRes?.data || null);
                setTopGenres(genresRes?.data || []);
                if (tf === 'lifetime') setHeatmap(heatmapRes?.data || []);
            } catch (e) { console.error(e); }
        };

        const fetchTop = async (tf: string) => {
            try {
                const [tracksRes, artistsRes, albumsRes, genresRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/stats/top-tracks?timeframe=${tf}&limit=50`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/stats/top-artists?timeframe=${tf}&limit=50`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/stats/top-albums?timeframe=${tf}&limit=50`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/stats/top-genres?timeframe=${tf}&limit=50`, { withCredentials: true })
                ]);
                setTopTracks(tracksRes?.data || []);
                setTopArtists(artistsRes?.data || []);
                setTopAlbums(albumsRes?.data || []);
                setTopGenres(genresRes?.data || []);
            } catch (e) { console.error(e); }
        };

        if (mainTab === 'main') fetchMain();
        else if (mainTab === 'lifetime') fetchStats('lifetime');
        else if (mainTab === 'timeframe') fetchStats(timeframe);
        else if (mainTab === 'top') fetchTop(timeframe);
    }, [mainTab, timeframe]);

    const formatDuration = (ms: number) => {
        if (!ms) return "0m";
        const totalMins = Math.floor(ms / 60000);
        const hours = Math.floor(totalMins / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${totalMins % 60}m`;
        return `${totalMins}m`;
    };

    const navItems = [
        { id: 'main', icon: <LayoutDashboard className="w-4 h-4" />, label: common?.nav?.main },
        { id: 'history', icon: <Clock className="w-4 h-4" />, label: common?.nav?.history },
        { id: 'lifetime', icon: <Activity className="w-4 h-4" />, label: common?.nav?.lifetime },
        { id: 'timeframe', icon: <Calendar className="w-4 h-4" />, label: common?.nav?.timeframe },
        { id: 'top', icon: <Trophy className="w-4 h-4" />, label: common?.nav?.top },
        { id: 'recap', icon: <Flame className="w-4 h-4 text-orange-500" />, label: common?.nav?.recaps, isLink: true, href: '/recap' }
    ];

    const disconnect = async (provider: string) => {
        try {
            await axios.post(`${API_BASE_URL}/connect/disconnect`, { providerId: provider }, { withCredentials: true });
            fetchSpotifyStatus();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
            {/* Header / Nav */}
            <header className="fixed top-0 left-0 right-0 z-50 glass border-b">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
                    <div className="flex items-center gap-10">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 shadow-primary/20">
                                <Music className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="text-lg font-black tracking-tighter hidden sm:block">local.fm</span>
                        </Link>

                        <nav className="hidden lg:flex items-center gap-1">
                            {navItems.map(item => (
                                item.isLink ? (
                                    <Link key={item.id} href={item.href || '#'} className="px-4 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground transition-all flex items-center gap-2">
                                        {item.icon} {item.label}
                                    </Link>
                                ) : (
                                    <button 
                                        key={item.id} 
                                        onClick={() => setMainTab(item.id as any)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                            mainTab === item.id ? "bg-primary/10 text-primary shadow-sm shadow-primary/5" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {item.icon} {item.label}
                                    </button>
                                )
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <LanguageSwitcher currentLocale={locale} />
                        <ThemeToggle />
                        
                        <div className="relative">
                            <button 
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex items-center gap-2 bg-secondary/50 pl-3 pr-1 py-1 rounded-full border border-border/50 hover:bg-secondary transition-all"
                            >
                                <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        spotifyStatus?.status === 'connected' ? "bg-green-500 animate-pulse" :
                                        spotifyStatus?.status === 'expired' ? "bg-red-500" : "bg-muted-foreground"
                                    )} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:block">
                                        {spotifyStatus?.status || 'checking'}
                                    </span>
                                </div>
                                <div className="w-7 h-7 rounded-full border border-border/50 overflow-hidden flex items-center justify-center bg-background">
                                    {session?.user?.image ? <img src={session.user.image} alt="" className="w-full h-full object-cover" /> : <User className="w-3.5 h-3.5" />}
                                </div>
                            </button>

                            <AnimatePresence>
                                {isProfileMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-2 w-64 bg-card border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                        >
                                            <div className="p-4 border-b border-border/50 bg-secondary/20">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Signed in as</p>
                                                <p className="font-bold truncate">{session?.user?.name || session?.user?.email}</p>
                                            </div>
                                            <div className="p-2">
                                                <button 
                                                    onClick={() => { setMainTab('settings'); setIsProfileMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-secondary transition-colors flex items-center gap-3"
                                                >
                                                    <Settings className="w-4 h-4" /> Settings
                                                </button>
                                                <button 
                                                    onClick={() => { setMainTab('settings'); setSettingsSection('spotify'); setIsProfileMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-secondary transition-colors flex items-center gap-3"
                                                >
                                                    <Link2 className="w-4 h-4" /> Connections
                                                </button>
                                                <button 
                                                    onClick={() => { setMainTab('settings'); setSettingsSection('privacy'); setIsProfileMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-secondary transition-colors flex items-center gap-3"
                                                >
                                                    <RotateCcw className="w-4 h-4" /> Import Data
                                                </button>
                                            </div>
                                            <div className="p-2 bg-secondary/10 border-t border-border/50">
                                                <button 
                                                    onClick={() => authClient.signOut()}
                                                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                                                >
                                                    <LogOut className="w-4 h-4" /> Sign Out
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto pt-24 pb-20 px-6">
                {/* Now Playing Hero */}
                {currentlyPlaying?.track && (
                    <Card premium className="mb-8 p-6 overflow-hidden relative group">
                        <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full" />
                        <div className="absolute top-0 left-0 h-1 bg-primary transition-all duration-1000" 
                             style={{ width: `${(currentlyPlaying.progressMs / currentlyPlaying.durationMs) * 100}%` }} 
                        />
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shadow-2xl shadow-black/20 flex-shrink-0">
                                {currentlyPlaying.track.album?.imageUrl ? (
                                    <img src={currentlyPlaying.track.album.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : <div className="w-full h-full bg-secondary flex items-center justify-center"><Music className="w-10 h-10" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className={cn("w-2 h-2 rounded-full", currentlyPlaying.isPlaying ? "bg-green-500 animate-pulse" : "bg-muted-foreground")} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                        {currentlyPlaying.isPlaying ? dict?.hero?.currentlyListening : dict?.hero?.paused}
                                    </span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter truncate group-hover:text-primary transition-colors">
                                    {currentlyPlaying.track.name}
                                </h1>
                                <p className="text-muted-foreground font-bold flex items-center gap-2 truncate">
                                    {currentlyPlaying.track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}
                                    <span className="w-1 h-1 bg-border rounded-full" />
                                    <span className="opacity-70">{currentlyPlaying.track.album?.name}</span>
                                </p>
                            </div>
                            <div className="hidden md:flex items-center gap-4">
                                <button className="p-3 bg-primary text-primary-foreground rounded-full hover:scale-105 transition active:scale-95 shadow-lg">
                                    <Play className="w-6 h-6 fill-current" />
                                </button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Main Content Area */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                    {mainTab === 'main' && (
                        <div className="space-y-8">
                            {/* Recap Banner */}
                            {isVisible('recap') && (
                                <Link href="/recap" className="block relative overflow-hidden rounded-[32px] p-8 group shadow-2xl shadow-orange-500/10 border border-orange-500/20 bg-gradient-to-br from-orange-500 to-pink-600">
                                    <div className="relative z-10 max-w-lg">
                                        <h2 className="text-white text-3xl font-black mb-2 tracking-tighter italic drop-shadow-sm">
                                            {dict?.recap?.title}
                                        </h2>
                                        <p className="text-white/80 font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
                                            {dict?.recap?.subtitle}
                                            <ChevronRight className="w-4 h-4" />
                                        </p>
                                    </div>
                                    <Flame className="absolute right-[-20px] bottom-[-20px] w-48 h-48 text-white/10 group-hover:scale-110 transition-transform duration-700" />
                                </Link>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {isVisible('summary') && (
                                    <Card premium className="p-8">
                                        <h2 className="text-2xl font-black tracking-tighter mb-8 flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-muted-foreground" />
                                            {dict?.today?.title}
                                        </h2>
                                        <div className="grid grid-cols-2 gap-10 mb-10">
                                            <div>
                                                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2">{dict?.today?.streams}</p>
                                                <h3 className="text-5xl font-black tabular-nums tracking-tighter">{summary?.totalStreams?.toLocaleString() || 0}</h3>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2">{dict?.today?.timeListened}</p>
                                                <h3 className="text-5xl font-black tabular-nums tracking-tighter">{formatDuration(summary?.totalDurationMs || 0)}</h3>
                                            </div>
                                        </div>

                                        {isVisible('genres') && topGenres.length > 0 && (
                                            <div className="pt-8 border-t border-border/50">
                                                <div className="flex items-center justify-between mb-4">
                                                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{dict?.genres?.title}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground italic opacity-50">{dict?.genres?.subtitle}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {topGenres.map((genre: any) => (
                                                        <div 
                                                            key={genre.name} 
                                                            className="px-3 py-1.5 bg-secondary/30 rounded-lg border border-border/30 hover:border-primary/30 transition-all cursor-default group"
                                                        >
                                                            <span className="text-xs font-bold group-hover:text-primary transition-colors">{genre.name}</span>
                                                            <span className="ml-2 text-[10px] font-black text-muted-foreground opacity-40">{formatDuration(genre.duration)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                )}

                                {isVisible('recentlyPlayed') && (
                                    <Card premium className="p-8 flex flex-col">
                                        <div className="flex items-center justify-between mb-8">
                                            <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                                                <RotateCcw className="w-5 h-5 text-muted-foreground" />
                                                {dict?.recent?.title}
                                            </h2>
                                            <button onClick={() => setMainTab('history')} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition">
                                                {common?.common?.viewAll}
                                            </button>
                                        </div>
                                        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                                            {recentlyPlayed.map((stream: any, i) => (
                                                <Link key={(stream?.id || i) + '-' + i} href={`/track/${stream?.track?.id}`} className="flex items-center gap-4 group hover:bg-secondary/50 p-2 rounded-xl transition-all">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border/50 shadow-sm">
                                                        {stream?.track?.album?.imageUrl ? (
                                                            <img src={stream.track.album.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : <Music className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-sm truncate group-hover:text-primary transition">{stream?.track?.name || 'Unknown Track'}</h4>
                                                        <p className="text-xs text-muted-foreground truncate">{stream?.track?.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}</p>
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-bold tabular-nums">
                                                        {stream?.playedAt ? new Date(stream.playedAt).toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}

                    {mainTab === 'history' && (
                        <HistoryTab dict={historyDict} locale={locale} />
                    )}

                    {mainTab === 'lifetime' && (
                        <LifetimeTab 
                            summary={summary} 
                            habits={habits} 
                            heatmap={heatmap} 
                            topGenres={topGenres} 
                            formatDuration={formatDuration} 
                            common={common} 
                            locale={locale} 
                        />
                    )}

                    {mainTab === 'timeframe' && (
                        <TimeframeTab 
                            summary={summary} 
                            habits={habits} 
                            topGenres={topGenres} 
                            formatDuration={formatDuration} 
                            common={common} 
                            locale={locale} 
                            timeframe={timeframe} 
                            setTimeframe={setTimeframe} 
                        />
                    )}

                    {mainTab === 'top' && (
                        <TopTab 
                            topTracks={topTracks} 
                            topArtists={topArtists} 
                            topAlbums={topAlbums} 
                            topGenres={topGenres} 
                            formatDuration={formatDuration} 
                            common={common} 
                            timeframe={timeframe} 
                            setTimeframe={setTimeframe} 
                            topSubTab={topSubTab} 
                            setTopSubTab={setTopSubTab} 
                            isVisible={isVisible}
                        />
                    )}

                    {mainTab === 'settings' && (
                        <SettingsTab 
                            dict={settingsDict} 
                            locale={locale} 
                            spotifyStatus={spotifyStatus} 
                            disconnect={disconnect}
                            activeSection={settingsSection}
                            session={session}
                        />
                    )}
                </div>
            </main>

            {/* Modals */}
            <AnimatePresence>
                {activeModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveModal(null)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-xl bg-card border border-border shadow-2xl rounded-[32px] overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="p-8 border-b border-border flex items-center justify-between">
                                <h3 className="text-2xl font-black tracking-tighter capitalize">{activeModal}</h3>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                    <LogOut className="w-5 h-5 rotate-180" />
                                </button>
                            </div>
                            
                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                {activeModal === 'connections' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-6 bg-secondary/30 rounded-[24px] border border-border/50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-[#1DB954] rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                                                    <Music className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black">Spotify</h4>
                                                    <p className={cn("text-xs font-bold", spotifyStatus?.status === 'connected' ? "text-green-500" : "text-muted-foreground")}>
                                                        {spotifyStatus?.status === 'connected' ? 'Connected' : 'Disconnected'}
                                                    </p>
                                                </div>
                                            </div>
                                            {spotifyStatus?.status === 'connected' ? (
                                                <button onClick={() => disconnect('spotify')} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">Disconnect</button>
                                            ) : (
                                                <button onClick={() => authClient.signIn.social({ provider: 'spotify', callbackURL: '/' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">Connect</button>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between p-6 bg-secondary/30 rounded-[24px] border border-border/50 opacity-50 cursor-not-allowed">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-[#FA243C] rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
                                                    <Music className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black">Apple Music</h4>
                                                    <p className="text-xs font-bold text-muted-foreground italic">Coming Soon</p>
                                                </div>
                                            </div>
                                            <button disabled className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-black uppercase tracking-widest">Connect</button>
                                        </div>
                                    </div>
                                )}

                                {activeModal === 'settings' && (
                                    <div className="space-y-6">
                                        <p className="text-muted-foreground font-bold italic">Dashboard customization is coming in the next update.</p>
                                    </div>
                                )}

                                {activeModal === 'import' && (
                                    <div className="space-y-8 py-4">
                                        <div className="text-center">
                                            <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-6">
                                                <RotateCcw className="w-10 h-10 text-muted-foreground" />
                                            </div>
                                            <h4 className="text-xl font-black tracking-tight">Import your history</h4>
                                            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8 font-medium">
                                                Upload your Spotify (JSON) or Apple Music (CSV) export ZIP to sync your data.
                                            </p>
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                                <input 
                                                    type="file" 
                                                    id="zip-upload" 
                                                    className="hidden" 
                                                    accept=".zip" 
                                                    onChange={handleFileUpload}
                                                />
                                                <button 
                                                    onClick={() => document.getElementById('zip-upload')?.click()}
                                                    className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl"
                                                >
                                                    Select ZIP File
                                                </button>
                                            </div>
                                        </div>

                                        {imports.length > 0 && (
                                            <div className="space-y-4">
                                                <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Imports</h5>
                                                <div className="space-y-2">
                                                    {imports.map((imp) => (
                                                        <div key={imp.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border/50">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-2 h-2 rounded-full",
                                                                    imp.status === 'COMPLETED' ? "bg-green-500" :
                                                                    imp.status === 'FAILED' ? "bg-red-500" : "bg-orange-500 animate-pulse"
                                                                )} />
                                                                <span className="text-sm font-bold truncate max-w-[150px]">{imp.fileName}</span>
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase opacity-50">{imp.status}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mobile Nav */}
            <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t lg:hidden">
                <div className="flex items-center justify-between px-6 py-3">
                    {navItems.filter(item => !['lifetime', 'timeframe'].includes(item.id)).map(item => (
                        item.isLink ? (
                            <Link key={item.id} href={item.href || '#'} className="flex flex-col items-center gap-1 text-muted-foreground">
                                {item.icon}
                                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                            </Link>
                        ) : (
                            <button key={item.id} onClick={() => setMainTab(item.id as any)} className={cn("flex flex-col items-center gap-1 transition-colors", mainTab === item.id ? "text-primary" : "text-muted-foreground")}>
                                {item.icon}
                                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                            </button>
                        )
                    ))}
                </div>
            </div>
        </div>
    );
}
