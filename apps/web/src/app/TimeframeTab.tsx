'use client';

import { Activity, Calendar, Clock, Music, Play, User } from "lucide-react";
import { Card, StatCard } from "@/components/ui/card";
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip 
} from 'recharts';
import { cn } from "@/lib/utils";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border/50 p-3 rounded-xl shadow-xl backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                <p className="text-sm font-black tracking-tight">{payload[0].value.toLocaleString()} Streams</p>
            </div>
        );
    }
    return null;
};

export function TimeframeTab({ 
    summary, habits, topGenres, formatDuration, common, locale, timeframe, setTimeframe, session 
}: any) {
    if (!summary || !habits) return null;

    const isVisible = (sectionId: string) => {
        const prefs = session?.user?.dashboardPrefs;
        if (!prefs || typeof prefs !== 'object') return true;
        return prefs[sectionId] !== false;
    };

    const clockChartData = habits?.hourly?.map((h: any) => {
        const ampm = h.hour >= 12 ? 'PM' : 'AM';
        const displayHour = h.hour % 12 || 12;
        return {
            subject: `${displayHour}${ampm}`,
            streams: h.streams || 0,
        };
    }) || [];

    const weekdayLabels = locale === 'de' ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayData = habits?.weekday?.map((w: any) => ({
        name: weekdayLabels[w.day] || '?',
        streams: w.streams || 0
    })) || [];

    const timeframes = ['day', 'week', 'month', 'year'];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Timeframe Selector */}
            <div className="flex justify-center">
                <div className="bg-secondary/50 p-1 rounded-xl border border-border/50 flex gap-1 shadow-sm">
                    {timeframes.map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf as any)}
                            className={cn(
                                "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                timeframe === tf ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title={common?.common?.streams} 
                    value={summary?.totalStreams?.toLocaleString() || 0} 
                    icon={<Play className="w-4 h-4 text-blue-500" />} 
                    colorClass="bg-blue-500/10"
                />
                <StatCard 
                    title={common?.common?.tracks} 
                    value={summary?.distinctSongs?.toLocaleString() || 0} 
                    icon={<Music className="w-4 h-4 text-purple-500" />} 
                    colorClass="bg-purple-500/10"
                />
                <StatCard 
                    title={common?.common?.artists} 
                    value={summary?.distinctArtists?.toLocaleString() || 0} 
                    icon={<User className="w-4 h-4 text-orange-500" />} 
                    colorClass="bg-orange-500/10"
                />
                <StatCard 
                    title={common?.common?.minutes} 
                    value={formatDuration(summary?.totalDurationMs || 0)} 
                    icon={<Clock className="w-4 h-4 text-green-500" />} 
                    colorClass="bg-green-500/10"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card premium className="p-8">
                    <h3 className="font-black text-lg mb-8 flex items-center gap-2 tracking-tighter">
                        <Clock className="w-5 h-5 text-muted-foreground" /> 
                        Activity by Hour
                    </h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={clockChartData}>
                                <PolarGrid stroke="currentColor" className="text-border" strokeDasharray="4 4" />
                                <PolarAngleAxis 
                                    dataKey="subject" 
                                    tick={{ fill: 'currentColor', fontSize: 10, fontWeight: '800' }} 
                                    className="text-muted-foreground"
                                />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                <Radar 
                                    name="Streams" 
                                    dataKey="streams" 
                                    stroke="var(--foreground)" 
                                    fill="currentColor" 
                                    className="text-foreground"
                                    fillOpacity={0.1} 
                                />
                                <Tooltip content={<CustomTooltip />} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card premium className="p-8">
                    <h3 className="font-black text-lg mb-8 flex items-center gap-2 tracking-tighter">
                        <Activity className="w-5 h-5 text-muted-foreground" /> 
                        Streams by Weekday
                    </h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weekdayData}>
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 'bold' }} 
                                    className="text-muted-foreground"
                                />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{ fill: 'currentColor', opacity: 0.05 }} 
                                    content={<CustomTooltip />}
                                />
                                <Bar 
                                    dataKey="streams" 
                                    fill="currentColor" 
                                    className="text-foreground"
                                    radius={[6, 6, 0, 0]} 
                                    barSize={32} 
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
            {/* ... top genres ... */}

            {/* Top Genres */}
            <Card premium className="p-8">
                <h3 className="font-black text-lg mb-10 flex items-center gap-2 tracking-tighter">
                    <Calendar className="w-5 h-5 text-muted-foreground" /> 
                    Top Genres for this period
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {topGenres?.map((genre: any, i: number) => {
                        const maxDuration = topGenres[0]?.duration || 1;
                        const percentage = (genre.duration / maxDuration) * 100;
                        return (
                            <div key={genre?.name || i} className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                    <span className="flex items-center gap-3">
                                        <span className="text-muted-foreground opacity-30">0{i + 1}</span>
                                        <span className="truncate max-w-[150px]">{genre?.name || 'Unknown'}</span>
                                    </span>
                                    <span className="text-muted-foreground">{formatDuration(genre?.duration || 0)}</span>
                                </div>
                                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-foreground rounded-full transition-all duration-1000 ease-out" 
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
