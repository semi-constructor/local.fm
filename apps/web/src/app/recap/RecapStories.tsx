'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Music, Clock, X, ChevronRight, ChevronLeft, Share2, Trophy, Flame, User } from 'lucide-react';
import Link from 'next/link';

const SLIDE_DURATION = 5000; // 5 seconds per slide

interface RecapData {
    year: number;
    totalMinutes: number;
    topArtist: {
        name: string;
        imageUrl?: string | null;
    };
    topTrack: {
        name: string;
        imageUrl?: string | null;
        artistName: string;
    };
    topGenres: string[];
    mostActiveDay: {
        date: string;
        count: number;
    };
}

interface RecapStoriesProps {
    data: RecapData;
    dict: any; // Ideally this would be typed too
    prefs: {
        animation?: boolean;
        showGenres?: boolean;
        showActiveDay?: boolean;
    };
}

export default function RecapStories({ data, dict, prefs }: RecapStoriesProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);

    useEffect(() => {
        startTimeRef.current = Date.now();
    }, []);

    const useAnimations = prefs.animation !== false;

    const allSlides = [
        {
            id: 'intro',
            bg: "from-green-600 to-black",
            render: () => (
                <div className="text-center px-6">
                    <motion.div initial={useAnimations ? { opacity: 0, scale: 0.8 } : {}} animate={{ opacity: 1, scale: 1 }} className="mb-8 flex justify-center">
                         <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/20">
                            <Music className="w-10 h-10 text-white" />
                         </div>
                    </motion.div>
                    <motion.h2 initial={useAnimations ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-xl font-black uppercase tracking-[0.3em] text-green-400 mb-2">{dict.intro.title}</motion.h2>
                    <motion.h1 initial={useAnimations ? { opacity: 0, scale: 0.8 } : {}} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="text-9xl font-black tracking-tighter text-white drop-shadow-2xl">{data.year}</motion.h1>
                    <motion.p initial={useAnimations ? { opacity: 0 } : {}} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-12 text-zinc-400 font-bold italic text-sm">{dict.intro.subtitle}</motion.p>
                </div>
            )
        },
        {
            id: 'minutes',
            bg: "from-blue-600 to-black",
            render: () => (
                <div className="text-center px-10">
                    <motion.div initial={useAnimations ? { scale: 0 } : {}} animate={{ scale: 1 }} className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-10">
                        <Clock className="w-12 h-12 text-blue-400" />
                    </motion.div>
                    <motion.h2 initial={useAnimations ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-3xl font-black text-white tracking-tight leading-tight mb-8">
                        {dict.minutes.title}
                    </motion.h2>
                    <motion.div initial={useAnimations ? { opacity: 0, scale: 0.5 } : {}} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring' }} className="text-8xl font-black text-white tracking-tighter mb-4 tabular-nums drop-shadow-lg">
                        {data.totalMinutes.toLocaleString()}
                    </motion.div>
                    <motion.p initial={useAnimations ? { opacity: 0 } : {}} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-blue-200/70 text-lg font-bold">
                        {dict.minutes.subtitle}
                    </motion.p>
                </div>
            )
        },
        {
            id: 'artist',
            bg: "from-purple-700 to-black",
            render: () => (
                <div className="text-center px-6 flex flex-col items-center">
                    <motion.p initial={useAnimations ? { opacity: 0 } : {}} animate={{ opacity: 1 }} className="text-purple-300 font-black uppercase tracking-[0.3em] text-xs mb-16">{dict.artist.title}</motion.p>
                    <motion.div 
                        initial={useAnimations ? { y: 50, opacity: 0, scale: 0.8 } : {}} 
                        animate={{ y: 0, opacity: 1, scale: 1 }} 
                        transition={{ duration: 0.8, type: 'spring' }}
                        className="relative w-72 h-72 mb-12"
                    >
                        <div className="absolute inset-0 bg-purple-500 rounded-full blur-3xl opacity-30 animate-pulse" />
                        <div className="w-full h-full rounded-full border-8 border-purple-400/30 overflow-hidden shadow-2xl relative z-10 p-2">
                             <div className="w-full h-full rounded-full overflow-hidden">
                                {data.topArtist?.imageUrl ? (
                                    <img src={data.topArtist.imageUrl} alt="" className="w-full h-full object-cover scale-110" />
                                ) : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User className="w-20 h-20 text-zinc-600" /></div>}
                             </div>
                        </div>
                    </motion.div>
                    <motion.h1 initial={useAnimations ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-5xl font-black text-white tracking-tighter mb-4">
                        {data.topArtist?.name}
                    </motion.h1>
                    <motion.p initial={useAnimations ? { opacity: 0 } : {}} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-purple-200/60 font-black text-sm uppercase tracking-widest">
                        {dict.artist.subtitle}
                    </motion.p>
                </div>
            )
        },
        {
            id: 'track',
            bg: "from-orange-600 to-black",
            render: () => (
                <div className="text-center px-10 flex flex-col items-center">
                    <motion.p initial={useAnimations ? { opacity: 0 } : {}} animate={{ opacity: 1 }} className="text-orange-300 font-black uppercase tracking-[0.3em] text-xs mb-16">{dict.track.title}</motion.p>
                    <motion.div 
                        initial={useAnimations ? { rotate: -15, opacity: 0, scale: 0.5 } : {}} 
                        animate={{ rotate: 0, opacity: 1, scale: 1 }} 
                        transition={{ duration: 0.8, type: 'spring' }}
                        className="w-72 h-72 mb-12 rounded-[64px] overflow-hidden shadow-2xl relative border-4 border-orange-400/20"
                    >
                        {data.topTrack?.imageUrl ? (
                            <img src={data.topTrack.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Music className="w-20 h-20 text-zinc-600" /></div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </motion.div>
                    <motion.h1 initial={useAnimations ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-4xl font-black text-white tracking-tight mb-3">
                        {data.topTrack?.name}
                    </motion.h1>
                    <motion.p initial={useAnimations ? { opacity: 0 } : {}} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-orange-200/60 font-bold text-lg">
                        {dict.track.subtitle.replace('{artist}', data.topTrack?.artistName)}
                    </motion.p>
                </div>
            )
        },
        {
            id: 'genres',
            bg: "from-pink-600 to-black",
            render: () => (
                <div className="text-center px-10 w-full max-w-sm">
                    <motion.p initial={useAnimations ? { opacity: 0 } : {}} animate={{ opacity: 1 }} className="text-pink-300 font-black uppercase tracking-[0.3em] text-xs mb-16">{dict.genres.title}</motion.p>
                    <div className="space-y-4">
                        {data.topGenres.slice(0, 5).map((genre: string, i: number) => (
                            <motion.div 
                                key={genre}
                                initial={useAnimations ? { x: -100, opacity: 0 } : {}}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 50 }}
                                className="bg-white/5 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 text-xl font-black text-white flex justify-between items-center group hover:bg-white/10 transition-colors"
                            >
                                <span className="capitalize tracking-tight">{genre}</span>
                                <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 text-sm">#{i + 1}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )
        },
        {
            id: 'activeDay',
            bg: "from-red-600 to-black",
            render: () => (
                <div className="text-center px-10 flex flex-col items-center">
                    <motion.div initial={useAnimations ? { scale: 0 } : {}} animate={{ scale: 1 }} className="w-24 h-24 bg-red-500/20 rounded-[32px] flex items-center justify-center mx-auto mb-10">
                        <Flame className="w-12 h-12 text-red-400" />
                    </motion.div>
                    <motion.h2 initial={useAnimations ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-3xl font-black text-white tracking-tight leading-tight mb-8">
                        Most Active Day
                    </motion.h2>
                    <motion.div initial={useAnimations ? { opacity: 0, scale: 0.5 } : {}} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring' }} className="text-6xl font-black text-white tracking-tighter mb-4 drop-shadow-lg">
                        {data.mostActiveDay?.date}
                    </motion.div>
                    <motion.p initial={useAnimations ? { opacity: 0 } : {}} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-red-200/70 text-lg font-bold">
                        {data.mostActiveDay?.count} streams in a single day
                    </motion.p>
                </div>
            )
        },
        {
            id: 'summary',
            bg: "from-zinc-900 to-black",
            render: () => (
                <div className="w-full max-w-[340px] bg-zinc-950 border border-zinc-800/50 rounded-[56px] overflow-hidden shadow-2xl relative p-1 mt-4">
                    <div className="p-8 pt-12 text-center relative z-10 bg-gradient-to-b from-zinc-900/50 to-black rounded-[50px]">
                        <div className="flex items-center justify-center gap-2 mb-10">
                            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-lg"><Music className="w-5 h-5 text-black" /></div>
                            <span className="text-white font-black tracking-tighter text-2xl">local.fm</span>
                        </div>
                        
                        <div className="w-32 h-32 mx-auto mb-8 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl p-1 bg-zinc-800">
                             <div className="w-full h-full rounded-full overflow-hidden">
                                {data.topArtist?.imageUrl && <img src={data.topArtist.imageUrl} alt="" className="w-full h-full object-cover" />}
                             </div>
                        </div>
                        
                        <h2 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{dict.summary.title}</h2>
                        <p className="text-white text-3xl font-black mb-10 tracking-tighter">{data.topArtist?.name}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <div className="bg-white/5 backdrop-blur-md p-5 rounded-[32px] border border-white/5">
                                <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">{dict.summary.minutes}</p>
                                <p className="text-white text-xl font-black tabular-nums tracking-tighter">{data.totalMinutes.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md p-5 rounded-[32px] border border-white/5 overflow-hidden">
                                <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">{dict.summary.track}</p>
                                <p className="text-white text-[10px] font-black truncate">{data.topTrack?.name}</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => window.print()}
                            className="w-full bg-white text-black py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-zinc-200 transition active:scale-95 shadow-xl shadow-white/5"
                        >
                            <Share2 className="w-4 h-4" />
                            {dict.summary.share}
                        </button>
                    </div>
                    <Flame className="absolute right-[-20px] top-[-20px] w-48 h-48 text-white/5 rotate-12 -z-10" />
                </div>
            )
        }
    ];

    const slides = allSlides.filter(s => {
        if (s.id === 'genres' && prefs.showGenres === false) return false;
        if (s.id === 'activeDay' && prefs.showActiveDay === false) return false;
        return true;
    });

    const next = useCallback(() => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
            setProgress(0);
            startTimeRef.current = Date.now();
        } else {
            // End of stories
            setIsPaused(true);
        }
    }, [currentSlide, slides.length]);

    const prev = useCallback(() => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
            setProgress(0);
            startTimeRef.current = Date.now();
        }
    }, [currentSlide]);

    // Autoplay logic
    useEffect(() => {
        if (isPaused) {
            if (timerRef.current) clearInterval(timerRef.current);
            pausedTimeRef.current = Date.now();
            return;
        }

        startTimeRef.current = Date.now() - (progress / 100) * SLIDE_DURATION;
        
        timerRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTimeRef.current;
            const newProgress = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
            
            setProgress(newProgress);
            
            if (newProgress >= 100) {
                next();
            }
        }, 30);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, next, currentSlide, progress]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === ' ') setIsPaused(p => !p);
            if (e.key === 'Escape') window.location.href = '/';
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [next, prev]);

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center overflow-hidden touch-none select-none">
            {/* Background Transitions */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className={`absolute inset-0 bg-gradient-to-b ${slides[currentSlide].bg}`}
                />
            </AnimatePresence>

            {/* Top Navigation / Progress */}
            <div className="absolute top-0 left-0 right-0 z-50 p-6 pt-8 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex gap-1.5 mb-6">
                    {slides.map((_, i) => (
                        <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-white transition-[width] ease-linear duration-30"
                                style={{ 
                                    width: i === currentSlide ? `${progress}%` : i < currentSlide ? "100%" : "0%" 
                                }}
                            />
                        </div>
                    ))}
                </div>
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                            <Music className="w-4 h-4 text-white" />
                         </div>
                         <span className="text-white text-xs font-black tracking-widest uppercase opacity-80">Recap 2026</span>
                    </div>
                    <Link href="/" className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition border border-white/10">
                        <X className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            {/* Slide Content */}
            <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.1, y: -30 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full flex justify-center py-20"
                    >
                        {slides[currentSlide].render()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Interactive Regions */}
            <div className="absolute inset-0 z-20 flex">
                <div 
                    className="flex-1 cursor-w-resize" 
                    onClick={prev}
                    onMouseDown={() => setIsPaused(true)}
                    onMouseUp={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                />
                <div 
                    className="flex-1 cursor-e-resize" 
                    onClick={next}
                    onMouseDown={() => setIsPaused(true)}
                    onMouseUp={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                />
            </div>

            {/* Side Buttons (Desktop) */}
            <button onClick={prev} className="absolute left-8 top-1/2 -translate-y-1/2 z-40 p-4 bg-white/5 backdrop-blur-md rounded-full text-white border border-white/5 opacity-0 hover:opacity-100 transition-opacity hidden md:block">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={next} className="absolute right-8 top-1/2 -translate-y-1/2 z-40 p-4 bg-white/5 backdrop-blur-md rounded-full text-white border border-white/5 opacity-0 hover:opacity-100 transition-opacity hidden md:block">
                <ChevronRight className="w-6 h-6" />
            </button>
        </div>
    );
}
