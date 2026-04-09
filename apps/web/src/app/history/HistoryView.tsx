'use client';

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, Music, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HistoryView({ dict, locale }: { dict: any, locale: string }) {
    const [streams, setStreams] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/stats/recently-played?page=${page}&limit=50`, { withCredentials: true })
            .then(res => setStreams(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [page]);

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <header className="fixed top-0 left-0 right-0 z-50 glass border-b">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
                    <Link href="/" className="flex items-center gap-2 group text-sm font-bold text-muted-foreground hover:text-foreground transition-all">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        {dict.backToDashboard}
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto pt-32 pb-20 px-6">
                <header className="mb-12">
                    <h1 className="text-5xl font-black tracking-tighter mb-4 text-gradient">{dict.title}</h1>
                    <p className="text-muted-foreground text-lg font-medium">{dict.subtitle}</p>
                </header>

                <Card premium className="overflow-hidden bg-card border border-border/50">
                    <div className="divide-y divide-border/50">
                        {loading ? (
                            <div className="p-32 flex flex-col items-center justify-center text-muted-foreground">
                                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mb-4" />
                                <p className="font-bold text-xs uppercase tracking-widest opacity-50">Laden...</p>
                            </div>
                        ) : streams.map((stream: any, i) => (
                            <Link 
                                key={stream.id + i} 
                                href={`/track/${stream.track.id}`}
                                className="flex items-center gap-6 p-5 hover:bg-secondary/40 transition-all group"
                            >
                                <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/50 flex-shrink-0 shadow-sm bg-secondary">
                                    {stream.track.album?.imageUrl ? (
                                        <img src={stream.track.album.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : <div className="w-full h-full flex items-center justify-center"><Music className="w-6 h-6 text-muted-foreground" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-lg truncate group-hover:text-primary transition tracking-tight">{stream.track.name}</h4>
                                    <p className="text-sm text-muted-foreground font-bold truncate opacity-80">{stream.track.artists?.map((a: any) => a.name).join(', ')}</p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <div className="flex items-center justify-end gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                        <Calendar className="w-3.5 h-3.5 opacity-40" />
                                        <span className="text-xs font-black tabular-nums">{new Date(stream.playedAt).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US')}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 text-muted-foreground mt-1.5 opacity-60">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black tabular-nums">{new Date(stream.playedAt).toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </Card>

                {/* Pagination */}
                <div className="mt-12 flex items-center justify-center gap-6">
                    <button 
                        disabled={page === 1}
                        onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="flex items-center gap-2 px-8 py-3 bg-card border border-border/50 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] disabled:opacity-30 hover:bg-secondary/50 transition-all shadow-sm active:scale-95"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {dict.pagination.prev}
                    </button>
                    <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10">
                         <span className="font-black text-lg tabular-nums text-primary">{page}</span>
                    </div>
                    <button 
                        onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="flex items-center gap-2 px-8 py-3 bg-card border border-border/50 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-secondary/50 transition-all shadow-sm active:scale-95"
                    >
                        {dict.pagination.next}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </main>
        </div>
    );
}
