'use client';

import { authClient } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export default function TopTracksPage() {
    const { data: session, isPending } = authClient.useSession();
    const router = useRouter();
    const [tracks, setTracks] = useState([]);
    const [timeframe, setTimeframe] = useState('lifetime');

    useEffect(() => {
        if (!isPending && !session) router.push('/login');
    }, [session, isPending, router]);

    useEffect(() => {
        if (session) fetchTracks();
    }, [session, timeframe]);

    const fetchTracks = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/stats/top-tracks?timeframe=${timeframe}&limit=50`, { withCredentials: true });
            setTracks(res.data);
        } catch (error) {
            console.error("Failed to fetch tracks", error);
        }
    };

    const formatDuration = (ms: number) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (isPending || !session) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8 transition-colors duration-300">
            <header className="max-w-6xl mx-auto mb-12 flex justify-between items-start">
                <div>
                    <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-8 w-fit">
                        <ChevronLeft className="w-5 h-5" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-black tracking-tighter">Top Tracks</h1>
                    <p className="text-muted-foreground mt-2 font-medium">Your most played songs over time.</p>
                </div>
                <ThemeToggle />
            </header>

            <main className="max-w-6xl mx-auto">
                <div className="flex flex-wrap gap-4 mb-8 bg-card/50 p-2 rounded-2xl w-fit border border-border shadow-sm">
                    {['lifetime', 'year', 'month', 'week', 'day'].map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                                timeframe === tf ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                            }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>

                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-widest bg-secondary/30">
                                <th className="px-6 py-5 font-bold w-16">#</th>
                                <th className="px-6 py-5 font-bold">Track</th>
                                <th className="px-6 py-5 font-bold">Album</th>
                                <th className="px-6 py-5 font-bold text-right">Plays</th>
                                <th className="px-6 py-5 font-bold text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {tracks.map((track: any, i) => (
                                <tr key={track.id} className="hover:bg-secondary/30 transition-colors group cursor-default">
                                    <td className="px-6 py-4 text-muted-foreground font-black text-lg">{i + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-foreground group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors">{track.name}</div>
                                        <div className="text-sm text-muted-foreground font-medium">{track.artist?.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{track.album?.name}</td>
                                    <td className="px-6 py-4 text-right font-black text-foreground">{track.playCount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-sm text-muted-foreground uppercase font-bold tracking-wider">{formatDuration(track.totalDuration)}</td>
                                </tr>
                            ))}
                            {tracks.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                                        No tracks found for this timeframe.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
