'use client';

import { authClient } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import { useEffect, useState, use } from "react";
import axios from "axios";
import { Music, Clock, Calendar, ArrowLeft, Play, User, ListMusic } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function ArtistDetail({ params }: { params: Promise<{ id: string }> }) {
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
            axios.get(`${API_BASE_URL}/stats/artist/${id}`, { withCredentials: true })
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

    if (!data) return <div>Artist not found</div>;

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
                    <div className="w-64 h-64 rounded-full overflow-hidden shadow-2xl shadow-purple-500/10 border-4 border-border">
                        {data.artist.imageUrl ? (
                            <img src={data.artist.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-secondary flex items-center justify-center">
                                <User className="w-24 h-24 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">{data.artist.name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            {data.artist.genres?.map((genre: string) => (
                                <span key={genre} className="px-4 py-1.5 bg-secondary rounded-full text-xs font-black uppercase tracking-widest text-muted-foreground">
                                    {genre}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <div className="bg-card border border-border p-8 rounded-[32px]">
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">Total Streams</p>
                        <h3 className="text-4xl font-black text-purple-500">{data.playCount}</h3>
                    </div>
                    <div className="bg-card border border-border p-8 rounded-[32px]">
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">Time Listened</p>
                        <h3 className="text-4xl font-black text-green-500">{formatDuration(data.totalDuration)}</h3>
                    </div>
                    <div className="bg-card border border-border p-8 rounded-[32px]">
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">Discovered</p>
                        <h3 className="text-2xl font-black">{new Date(data.discoveryDate).toLocaleDateString([], { month: 'long', year: 'numeric' })}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                    <div className="lg:col-span-7 bg-card border border-border p-8 rounded-[32px] shadow-sm">
                        <h3 className="font-black text-lg mb-8 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            Monthly Activity
                        </h3>
                        <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis 
                                        dataKey="month" 
                                        stroke="var(--muted-foreground)" 
                                        fontSize={10} 
                                        fontWeight="bold"
                                        tickFormatter={(val) => {
                                            const [y, m] = val.split('-');
                                            return new Date(parseInt(y), parseInt(m)-1).toLocaleDateString([], { month: 'short' });
                                        }}
                                    />
                                    <YAxis stroke="var(--muted-foreground)" fontSize={10} fontWeight="bold" />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                                        labelFormatter={(val) => {
                                            const [y, m] = val.split('-');
                                            return new Date(parseInt(y), parseInt(m)-1).toLocaleDateString([], { month: 'long', year: 'numeric' });
                                        }}
                                    />
                                    <Bar dataKey="count" fill="#a855f7" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="lg:col-span-5 bg-card border border-border p-8 rounded-[32px] shadow-sm">
                        <h3 className="font-black text-lg mb-8 flex items-center gap-2">
                            <ListMusic className="w-5 h-5 text-muted-foreground" />
                            Top Tracks
                        </h3>
                        <div className="space-y-4">
                            {data.topTracks.map((track: any, i: number) => (
                                <Link 
                                    key={track.id} 
                                    href={`/track/${track.id}`}
                                    className="flex items-center gap-4 group p-3 hover:bg-secondary/50 rounded-2xl transition-all"
                                >
                                    <span className="text-muted-foreground font-black text-xs w-4">0{i+1}</span>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm truncate group-hover:text-purple-500 transition">{track.name}</h4>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">{track.playCount} Streams</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

import { ChevronRight } from "lucide-react";
