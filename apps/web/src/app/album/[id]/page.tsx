'use client';

import { authClient } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import { useEffect, useState, use } from "react";
import axios from "axios";
import { Music, Clock, Calendar, ArrowLeft, Disc, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AlbumDetail({ params }: { params: Promise<{ id: string }> }) {
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
            axios.get(`${API_BASE_URL}/stats/album/${id}`, { withCredentials: true })
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

    if (!data) return <div>Album not found</div>;

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
                    <div className="w-64 h-64 rounded-[40px] overflow-hidden shadow-2xl shadow-blue-500/10">
                        {data.album.imageUrl ? (
                            <img src={data.album.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-secondary flex items-center justify-center">
                                <Disc className="w-20 h-20 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">{data.album.name}</h1>
                        <Link href={`/artist/${data.album.artist.id}`} className="hover:text-blue-500 transition flex items-center justify-center md:justify-start gap-2 text-xl font-bold text-muted-foreground">
                            <User className="w-6 h-6" />
                            {data.album.artist.name}
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <div className="bg-card border border-border p-8 rounded-[32px]">
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">Total Streams</p>
                        <h3 className="text-4xl font-black text-blue-500">{data.playCount}</h3>
                    </div>
                    <div className="bg-card border border-border p-8 rounded-[32px]">
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">Time Listened</p>
                        <h3 className="text-4xl font-black text-green-500">{formatDuration(data.totalDuration)}</h3>
                    </div>
                    <div className="bg-card border border-border p-8 rounded-[32px]">
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">First Play</p>
                        <h3 className="text-2xl font-black">{new Date(data.discoveryDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                    </div>
                </div>

                <div className="bg-card border border-border p-8 rounded-[32px] shadow-sm">
                    <h3 className="font-black text-lg mb-8 flex items-center gap-2">
                        <Music className="w-5 h-5 text-muted-foreground" />
                        Album Tracks
                    </h3>
                    <div className="space-y-4">
                        {data.tracks.map((track: any, i: number) => (
                            <Link 
                                key={track.id} 
                                href={`/track/${track.id}`}
                                className="flex items-center gap-4 group p-4 hover:bg-secondary/50 rounded-2xl transition-all"
                            >
                                <span className="text-muted-foreground font-black text-sm w-6">0{i+1}</span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-base truncate group-hover:text-blue-500 transition">{track.name}</h4>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">{track.playCount} Streams</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition" />
                            </Link>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
