'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Music, Activity, Trophy, Clock, ExternalLink, Calendar, Disc } from 'lucide-react';
import { cn } from '@/lib/utils';
import { applyAccentColor, applyFontFamily } from '@/lib/theme';

interface PublicUser {
    name: string;
    image?: string | null;
    publicId: string;
    accentColor?: string | null;
    fontFamily?: string | null;
}

interface Summary {
    totalStreams: number;
    totalDurationMs: number;
    distinctSongs: number;
    distinctArtists: number;
}

interface TopTrack {
    id: string;
    name: string;
    playCount: number;
    totalDuration: number;
    album?: { imageUrl?: string };
    artists?: { name: string }[];
}

interface TopArtist {
    id: string;
    name: string;
    imageUrl?: string | null;
    playCount: number;
}

interface RecentTrack {
    id: string;
    track?: {
        name: string;
        album?: { imageUrl?: string };
    };
    playedAt: string;
}

interface PublicProfileData {
    user: PublicUser;
    summary: Summary;
    topTracks: TopTrack[];
    topArtists: TopArtist[];
    recentTracks: RecentTrack[];
}

interface PublicStatsViewProps {
    id: string;
    initialData: PublicProfileData;
    common: any;
    dict: any;
    locale: string;
}

export default function PublicStatsView({ id, initialData, common, dict, locale }: PublicStatsViewProps) {
    const [timeframe, setTimeframe] = useState('lifetime');
    const [data, setData] = useState<PublicProfileData>(initialData);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (data.user?.accentColor) applyAccentColor(data.user.accentColor);
        if (data.user?.fontFamily) applyFontFamily(data.user.fontFamily);
    }, [data.user]);

    const fetchProfile = async (tf: string) => {
        setLoading(true);
        setTimeframe(tf);
        try {
            const url = id === 'profile' ? `${API_BASE_URL}/stats/public/profile?timeframe=${tf}` : `${API_BASE_URL}/stats/public/${id}/profile?timeframe=${tf}`;
            const res = await axios.get(url);
            setData(res.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const formatDuration = (ms: number) => {
        if (!ms) return "0m";
        const totalMins = Math.floor(ms / 60000);
        const hours = Math.floor(totalMins / 60);
        if (hours > 0) return `${hours}h ${totalMins % 60}m`;
        return `${totalMins}m`;
    };

    const timeframes = [
        { id: 'lifetime', label: common?.nav?.lifetime || 'Lifetime' },
        { id: 'year', label: 'Year' },
        { id: 'month', label: 'Month' },
        { id: 'week', label: 'Week' },
        { id: 'day', label: 'Day' }
    ];

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30">
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {/* Header */}
                <header className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left p-8 bg-secondary/10 rounded-[40px] border border-border/50">
                    <div className="w-32 h-32 rounded-3xl border-4 border-primary/20 p-1 flex-shrink-0 rotate-3 shadow-2xl shadow-primary/10">
                        {data.user?.image ? (
                            <img src={data.user.image} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                            <div className="w-full h-full bg-secondary rounded-2xl flex items-center justify-center">
                                <Music className="w-12 h-12 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                            <span className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-primary/20">Public Stats</span>
                            <span className="px-3 py-1 bg-secondary text-muted-foreground text-[10px] font-black uppercase tracking-widest rounded-full">@{data.user?.publicId}</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter mb-4">{data.user?.name}&apos;s Music Stats</h1>
                        <p className="text-muted-foreground font-bold flex items-center justify-center md:justify-start gap-2">
                            <Activity className="w-4 h-4 text-primary animate-pulse" />
                            Sharing listening habits on local.fm
                        </p>
                    </div>
                    <a href="https://github.com/semi-constructor/local.fm" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-foreground text-background px-6 py-3 rounded-2xl hover:scale-105 active:scale-95 transition-all">
                        Join local.fm <ExternalLink className="w-3 h-3"/>
                    </a>
                </header>

                {/* Timeframe Filter */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 p-1 bg-secondary/10 rounded-full w-fit mx-auto md:mx-0">
                    {timeframes.map((tf) => (
                        <button
                            key={tf.id}
                            onClick={() => fetchProfile(tf.id)}
                            className={cn(
                                "px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                timeframe === tf.id ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                {/* Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        icon={<Activity className="w-4 h-4" />} 
                        label="Streams" 
                        value={data.summary.totalStreams.toLocaleString()} 
                        loading={loading}
                    />
                    <StatCard 
                        icon={<Clock className="w-4 h-4" />} 
                        label="Time Listened" 
                        value={formatDuration(data.summary.totalDurationMs)} 
                        loading={loading}
                    />
                    <StatCard 
                        icon={<Music className="w-4 h-4" />} 
                        label="Tracks" 
                        value={data.summary.distinctSongs.toLocaleString()} 
                        loading={loading}
                    />
                    <StatCard 
                        icon={<Trophy className="w-4 h-4" />} 
                        label="Artists" 
                        value={data.summary.distinctArtists.toLocaleString()} 
                        loading={loading}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Top Tracks */}
                    <Card premium className="lg:col-span-7 p-8 rounded-[32px]">
                        <h2 className="text-2xl font-black tracking-tighter mb-8 flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-primary" />
                            Top Tracks
                        </h2>
                        <div className="space-y-6">
                            {data.topTracks.map((track, i) => (
                                <div key={track.id} className="flex items-center gap-6 group">
                                    <span className="text-3xl font-black italic opacity-10 w-8">{i + 1}</span>
                                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg shadow-black/20 transition-transform group-hover:scale-105">
                                        <img src={track.album?.imageUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold truncate text-lg leading-tight mb-1">{track.name}</h4>
                                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest truncate">{track.artists?.[0]?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black tabular-nums">{track.playCount}x</p>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{formatDuration(track.totalDuration)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Right Column: Top Artists & Recent */}
                    <div className="lg:col-span-5 space-y-8">
                        <Card premium className="p-8 rounded-[32px]">
                            <h2 className="text-2xl font-black tracking-tighter mb-8 flex items-center gap-2">
                                <Disc className="w-6 h-6 text-primary" />
                                Top Artists
                            </h2>
                            <div className="space-y-5">
                                {data.topArtists.slice(0, 10).map((artist) => (
                                    <div key={artist.id} className="flex items-center gap-4 group">
                                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-secondary group-hover:border-primary transition-colors">
                                            {artist.imageUrl ? (
                                                <img src={artist.imageUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-secondary flex items-center justify-center">
                                                    <Music className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold truncate">{artist.name}</h4>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">{artist.playCount} streams</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card premium className="p-8 rounded-[32px]">
                            <h2 className="text-xl font-black tracking-tighter mb-8 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                Recently Played
                            </h2>
                            <div className="space-y-4">
                                {data.recentTracks.map((stream) => (
                                    <div key={stream.id} className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 grayscale hover:grayscale-0 transition-all">
                                            <img src={stream.track?.album?.imageUrl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold truncate mb-0.5">{stream.track?.name}</h4>
                                            <p className="text-[10px] text-muted-foreground truncate">{new Date(stream.playedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    loading: boolean;
}

function StatCard({ icon, label, value, loading }: StatCardProps) {
    return (
        <Card premium className={cn("p-8 rounded-[32px] transition-all relative overflow-hidden group", loading && "opacity-50 blur-[2px]")}>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700">
                {icon && <div className="scale-[4]">{icon}</div>}
            </div>
            <div className="flex items-center gap-3 text-muted-foreground mb-4">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">{icon}</div>
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <h3 className="text-4xl font-black tracking-tighter leading-none">{value}</h3>
        </Card>
    );
}
