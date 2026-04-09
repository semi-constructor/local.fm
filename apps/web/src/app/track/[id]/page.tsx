'use client';

import { authClient } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import { useEffect, useState, use } from "react";
import axios from "axios";
import { Music, Clock, Calendar, ArrowLeft, Play, Disc, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function TrackDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session, isPending } = authClient.useSession();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isPending && !session) router.push('/login');
    }, [session, isPending, router]);

    useEffect(() => {
        if (session) {
            axios.get(`${API_BASE_URL}/stats/track/${id}`, { withCredentials: true })
                .then(res => setData(res.data))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [session, id]);

    if (loading || isPending) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
    );

    if (!data) return <div>Track not found</div>;

    const formatDuration = (ms: number) => {
        const mins = Math.floor(ms / 60000);
        const hours = Math.floor(mins / 60);
        if (hours > 0) return `${hours}h ${mins % 60}m`;
        return `${mins}m`;
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition" />
                        <span className="font-bold">Back to Dashboard</span>
                    </Link>
                    <ThemeToggle />
                </div>
            </nav>

            <main className="max-w-5xl mx-auto pt-28 pb-20 px-6">
                <div className="flex flex-col md:flex-row gap-10 items-center md:items-end mb-16">
                    <div className="w-64 h-64 rounded-[40px] overflow-hidden shadow-2xl shadow-green-500/10">
                        {data.track.album.imageUrl ? (
                            <img src={data.track.album.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-secondary flex items-center justify-center">
                                <Music className="w-20 h-20 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">{data.track.name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-lg font-bold text-muted-foreground">
                            <Link href={`/artist/${data.track.artist.id}`} className="hover:text-green-500 transition flex items-center gap-2">
                                <User className="w-5 h-5" />
                                {data.track.artist.name}
                            </Link>
                            <span className="opacity-30">•</span>
                            <span className="flex items-center gap-2">
                                <Disc className="w-5 h-5" />
                                {data.track.album.name}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="bg-card border border-border p-6 rounded-[24px]">
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">Streams</p>
                        <h3 className="text-3xl font-black">{data.playCount}</h3>
                    </div>
                    <div className="bg-card border border-border p-6 rounded-[24px]">
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">Time Listened</p>
                        <h3 className="text-3xl font-black">{formatDuration(data.totalDuration)}</h3>
                    </div>
                    <div className="bg-card border border-border p-6 rounded-[24px]">
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">First Played</p>
                        <h3 className="text-xl font-black">{new Date(data.firstPlayed).toLocaleDateString()}</h3>
                    </div>
                    <div className="bg-card border border-border p-6 rounded-[24px]">
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">Last Played</p>
                        <h3 className="text-xl font-black">{new Date(data.lastPlayed).toLocaleDateString()}</h3>
                    </div>
                </div>

                <div className="bg-card border border-border p-8 rounded-[32px] shadow-sm mb-12">
                    <h3 className="font-black text-lg mb-8 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        Listening History
                    </h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.history}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="var(--muted-foreground)" 
                                    fontSize={10} 
                                    fontWeight="bold"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                />
                                <YAxis stroke="var(--muted-foreground)" fontSize={10} fontWeight="bold" />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                                    labelFormatter={(val) => new Date(val).toLocaleDateString([], { dateStyle: 'full' })}
                                />
                                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </main>
        </div>
    );
}
