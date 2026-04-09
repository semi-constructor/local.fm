'use client';

import { Disc, ListMusic, Music, User, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function TopTab({ 
    topTracks, topArtists, topAlbums, topGenres, 
    formatDuration, common, timeframe, setTimeframe, 
    topSubTab, setTopSubTab, isVisible 
}: any) {
    
    const timeframes = ['day', 'week', 'month', 'year'];
    const subTabs = [
        { id: 'tracks', icon: <Music className="w-4 h-4" />, label: common?.common?.tracks },
        { id: 'artists', icon: <User className="w-4 h-4" />, label: common?.common?.artists },
        { id: 'albums', icon: <Disc className="w-4 h-4" />, label: common?.common?.albums },
        { id: 'genres', icon: <ListMusic className="w-4 h-4" />, label: common?.common?.genres }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header / Selectors */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="bg-secondary/50 p-1 rounded-xl border border-border/50 flex gap-1">
                    {timeframes.map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf as any)}
                            className={cn(
                                "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                timeframe === tf ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tf}
                        </button>
                    ))}
                </div>

                <div className="bg-secondary/50 p-1 rounded-xl border border-border/50 flex gap-1">
                    {subTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setTopSubTab(tab.id as any)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                topSubTab === tab.id ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab.icon}
                            <span className="hidden sm:block">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Rendering */}
            {topSubTab === 'tracks' && isVisible('topItems') && (
                <Card premium className="p-4 sm:p-8">
                    <div className="space-y-1">
                        {topTracks?.map((track: any, i: number) => (
                            <Link 
                                key={track?.id || i} 
                                href={`/track/${track?.id}`}
                                className="group flex items-center gap-4 sm:gap-6 p-3 hover:bg-primary/5 rounded-xl transition-all"
                            >
                                <div className="text-muted-foreground font-black text-sm w-6 text-center opacity-30 group-hover:text-primary group-hover:opacity-100 transition-all">{i + 1}</div>
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-border/50 flex-shrink-0 shadow-sm">
                                    {track?.album?.imageUrl ? (
                                        <img src={track.album.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : <div className="w-full h-full bg-secondary flex items-center justify-center"><Music className="w-4 h-4" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm sm:text-base truncate group-hover:text-primary transition">{track?.name}</h4>
                                    <p className="text-xs text-muted-foreground truncate">{track?.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}</p>
                                </div>
                                <div className="text-right tabular-nums">
                                    <p className="font-black text-sm sm:text-lg group-hover:text-primary transition-colors">{track?.playCount || 0}</p>
                                    <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest">{common?.common?.streams}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </Card>
            )}

            {topSubTab === 'artists' && isVisible('topItems') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topArtists?.map((artist: any, i: number) => (
                        <Link 
                            key={artist?.id || i} 
                            href={`/artist/${artist?.id}`}
                            className="group p-4 bg-card border border-border/50 rounded-2xl hover:shadow-md hover:border-border transition-all flex items-center gap-4"
                        >
                            <div className="text-muted-foreground font-black text-sm w-6 opacity-30">{i + 1}</div>
                            <div className="w-16 h-16 rounded-full overflow-hidden border border-border/50 flex-shrink-0 shadow-sm bg-secondary">
                                {artist?.imageUrl ? (
                                    <img src={artist.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-base truncate group-hover:text-primary transition">{artist?.name}</h4>
                                <p className="text-xs text-muted-foreground font-bold">{formatDuration(artist?.totalDuration || 0)}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {topSubTab === 'albums' && isVisible('topItems') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topAlbums?.map((album: any, i: number) => (
                        <Link 
                            key={album?.id || i} 
                            href={`/album/${album?.id}`}
                            className="group p-4 bg-card border border-border/50 rounded-2xl hover:shadow-md hover:border-border transition-all flex items-center gap-4"
                        >
                            <div className="text-muted-foreground font-black text-sm w-6 opacity-30">{i + 1}</div>
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-border/50 flex-shrink-0 shadow-sm bg-secondary">
                                {album?.imageUrl ? (
                                    <img src={album.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : <div className="w-full h-full flex items-center justify-center"><Disc className="w-6 h-6" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-base truncate group-hover:text-primary transition">{album?.name}</h4>
                                <p className="text-xs text-muted-foreground truncate font-bold">{album?.artistName}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {topSubTab === 'genres' && isVisible('genres') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topGenres?.map((genre: any, i: number) => (
                        <div 
                            key={genre?.name || i} 
                            className="group p-6 bg-card border border-border/50 rounded-2xl hover:shadow-md hover:border-border transition-all flex flex-col justify-between relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ListMusic className="w-12 h-12" />
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="text-muted-foreground font-black text-sm w-6 opacity-30">{i + 1}</div>
                                <h4 className="font-black text-lg capitalize truncate group-hover:text-primary transition">{genre?.name}</h4>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <span>{formatDuration(genre?.duration || 0)}</span>
                                    <span>{Math.round((genre?.duration / (topGenres[0]?.duration || 1)) * 100)}%</span>
                                </div>
                                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-foreground rounded-full transition-all duration-1000 ease-out" 
                                        style={{ width: `${(genre?.duration / (topGenres[0]?.duration || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {((['tracks', 'artists', 'albums'].includes(topSubTab) && !isVisible('topItems')) || (topSubTab === 'genres' && !isVisible('genres'))) && (
                <div className="py-20 text-center space-y-4 opacity-50">
                    <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto">
                        <Trophy className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-black tracking-tighter">Section Hidden</h3>
                    <p className="text-sm font-bold text-muted-foreground">You've disabled this section in settings.</p>
                </div>
            )}
        </div>
    );
}
