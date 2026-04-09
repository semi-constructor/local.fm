'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Music, Activity, Trophy, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PublicStatsView({ id, initialData, dict, common, locale }: any) {
    const [timeframe, setTimeframe] = useState('lifetime');
    const [data, setData] = useState(initialData);
    const [topTracks, setTopTracks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTopTracks();
    }, [timeframe]);

    const fetchTopTracks = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/stats/public/${id}/top-tracks?timeframe=${timeframe}&limit=5`);
            setTopTracks(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchSummary = async (tf: string) => {
        setLoading(true);
        setTimeframe(tf);
        try {
            const res = await axios.get(`${API_BASE_URL}/stats/public/${id}/summary?timeframe=${tf}`);
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
        { id: 'lifetime', label: common?.nav?.lifetime },
        { id: 'year', label: 'Year' },
        { id: 'month', label: 'Month' },
        { id: 'week', label: 'Week' },
        { id: 'day', label: 'Day' }
    ];

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <header className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    <div className="w-24 h-24 rounded-full border-4 border-primary/20 p-1 flex-shrink-0">
                        {data.user?.image ? (
                            <img src={data.user.image} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <div className="w-full h-full bg-secondary rounded-full flex items-center justify-center">
                                <Music className="w-8 h-8 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-4xl font-black tracking-tighter mb-2">{data.user?.name}'s Music Stats</h1>
                        <p className="text-muted-foreground font-bold flex items-center justify-center md:justify-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Sharing listening habits on local.fm
                        </p>
                    </div>
                    <a href="/" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
                        local.fm <ExternalLink className="w-3 h-3" />
                    </a>
                </header>

                {/* Timeframe Filter */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    {timeframes.map((tf) => (
                        <button
                            key={tf.id}
                            onClick={() => fetchSummary(tf.id)}
                            className={cn(
                                "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                timeframe === tf.id ? "bg-primary text-primary-foreground shadow-lg" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
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
                        value={data.totalStreams.toLocaleString()} 
                        loading={loading}
                    />
                    <StatCard 
                        icon={<Clock className="w-4 h-4" />} 
                        label="Time Listened" 
                        value={formatDuration(data.totalDurationMs)} 
                        loading={loading}
                    />
                    <StatCard 
                        icon={<Music className="w-4 h-4" />} 
                        label="Tracks" 
                        value={data.distinctSongs.toLocaleString()} 
                        loading={loading}
                    />
                    <StatCard 
                        icon={<Trophy className="w-4 h-4" />} 
                        label="Artists" 
                        value={data.distinctArtists.toLocaleString()} 
                        loading={loading}
                    />
                </div>

                {/* Top Tracks */}
                <Card premium className="p-8">
                    <h2 className="text-2xl font-black tracking-tighter mb-8 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-muted-foreground" />
                        Top Tracks
                    </h2>
                    <div className="space-y-4">
                        {topTracks.map((track: any, i) => (
                            <div key={track.id} className="flex items-center gap-6 group">
                                <span className="text-2xl font-black italic opacity-20 w-8">{i + 1}</span>
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                    <img src={track.album?.imageUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold truncate">{track.name}</h4>
                                    <p className="text-xs text-muted-foreground truncate">{track.artists?.[0]?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black tabular-nums">{track.playCount}x</p>
                                </div>
                            </div>
                        ))}
                        {topTracks.length === 0 && (
                            <p className="text-center py-8 text-muted-foreground font-bold italic">No tracks recorded for this period.</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, loading }: any) {
    return (
        <Card premium className={cn("p-6 transition-all", loading && "opacity-50 blur-[2px]")}>
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
                {icon}
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <h3 className="text-3xl font-black tracking-tighter">{value}</h3>
        </Card>
    );
}
