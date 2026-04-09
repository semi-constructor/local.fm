'use client';

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { Music, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export function HistoryTab({ dict, locale }: { dict: any, locale: string }) {
    const [streams, setStreams] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/stats/recently-played?page=${page}&limit=50`, { withCredentials: true })
            .then(res => setStreams(res?.data || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [page]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <header>
                <h2 className="text-3xl font-black tracking-tighter mb-2">{dict?.title || 'History'}</h2>
                <p className="text-muted-foreground font-medium">{dict?.subtitle || 'Your listening journey'}</p>
            </header>

            <Card premium className="overflow-hidden">
                <div className="divide-y divide-border/50">
                    {loading ? (
                        <div className="p-32 flex flex-col items-center justify-center text-muted-foreground">
                            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mb-4" />
                            <p className="font-bold text-xs uppercase tracking-widest opacity-50">Loading...</p>
                        </div>
                    ) : streams.length > 0 ? streams.map((stream: any, i) => (
                        <Link 
                            key={(stream?.id || i) + '-' + i} 
                            href={`/track/${stream?.track?.id}`}
                            className="flex items-center gap-6 p-5 hover:bg-secondary/40 transition-all group"
                        >
                            <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/50 flex-shrink-0 shadow-sm bg-secondary">
                                {stream?.track?.album?.imageUrl ? (
                                    <img src={stream.track.album.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : <div className="w-full h-full flex items-center justify-center"><Music className="w-6 h-6 text-muted-foreground" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-lg truncate group-hover:text-primary transition tracking-tight">{stream?.track?.name || 'Unknown Track'}</h4>
                                <p className="text-sm text-muted-foreground font-bold truncate opacity-80">{stream?.track?.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}</p>
                            </div>
                            <div className="text-right hidden sm:block">
                                <div className="flex items-center justify-end gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                    <Calendar className="w-3.5 h-3.5 opacity-40" />
                                    <span className="text-xs font-black tabular-nums">{stream?.playedAt ? new Date(stream.playedAt).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US') : '-'}</span>
                                </div>
                                <div className="flex items-center justify-end gap-2 text-muted-foreground mt-1.5 opacity-60">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black tabular-nums">{stream?.playedAt ? new Date(stream.playedAt).toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                </div>
                            </div>
                        </Link>
                    )) : (
                        <div className="p-20 text-center text-muted-foreground font-bold italic opacity-50">
                            No history found.
                        </div>
                    )}
                </div>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-6">
                <button 
                    disabled={page === 1}
                    onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="flex items-center gap-2 px-8 py-3 bg-card border border-border/50 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] disabled:opacity-30 hover:bg-secondary/50 transition-all shadow-sm active:scale-95"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {dict?.pagination?.prev || 'Prev'}
                </button>
                <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10">
                     <span className="font-black text-lg tabular-nums text-primary">{page}</span>
                </div>
                <button 
                    onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="flex items-center gap-2 px-8 py-3 bg-card border border-border/50 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-secondary/50 transition-all shadow-sm active:scale-95"
                >
                    {dict?.pagination?.next || 'Next'}
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
