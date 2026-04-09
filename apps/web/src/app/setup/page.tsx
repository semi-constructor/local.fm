'use client';

import { useState, useEffect } from "react";
import { Music, ArrowRight, Settings, ExternalLink, Check, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

export default function SetupPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const router = useRouter();

    const [formData, setFormData] = useState({
        spotifyClientId: '',
        spotifyClientSecret: '',
        databaseUrl: 'postgresql://postgres:password@localhost:5432/localfm',
        redisUrl: 'redis://localhost:6379',
        frontendUrl: 'http://localhost:3000',
        apiUrl: 'http://localhost:3001'
    });

    useEffect(() => {
        // Try to auto-detect if we're running in docker or local
        const hostname = window.location.hostname;
        setFormData(prev => ({
            ...prev,
            frontendUrl: `${window.location.protocol}//${hostname}:3000`,
            apiUrl: `${window.location.protocol}//${hostname}:3001`
        }));

        fetch(`${API_BASE_URL}/setup/status`)
            .then(r => r.json())
            .then(data => {
                if (data.isConfigured) {
                    router.push('/');
                }
            })
            .catch(console.error)
            .finally(() => setIsChecking(false));
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Validate DB and Redis first
            const valRes = await fetch(`${API_BASE_URL}/setup/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    databaseUrl: formData.databaseUrl, 
                    redisUrl: formData.redisUrl 
                })
            });
            
            if (!valRes.ok) {
                const valData = await valRes.json();
                alert("Connection Test Failed: " + (valData.error || "Unknown error"));
                setIsLoading(false);
                return;
            }

            // 2. Save if validation passed
            const res = await fetch(`${API_BASE_URL}/setup/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (data.success) {
                alert(data.message + " Waiting 5 seconds before reloading.");
                setTimeout(() => {
                    window.location.href = '/';
                }, 5000);
            } else {
                alert(data.error || "Failed to save configuration.");
                setIsLoading(false);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to save configuration. Check console.");
            setIsLoading(false);
        }
    };

    if (isChecking) return null;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col p-6 relative">
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <div className="max-w-3xl w-full mx-auto mt-10 z-10">
                <div className="mb-8">
                    <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                        <Settings className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter mb-3">Welcome to local.fm</h1>
                    <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                        Let's get your self-hosted music dashboard set up. We need a few environment variables to start.
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="bg-card/40 backdrop-blur-xl border border-border p-8 sm:p-10 rounded-[32px] shadow-2xl space-y-8">
                    
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-black tracking-tight mb-2 flex items-center gap-2">
                                <Music className="w-5 h-5 text-green-500" />
                                Spotify Credentials
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                You need to create an application in the Spotify Developer Dashboard.
                                <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-primary hover:underline ml-2 inline-flex items-center gap-1">
                                    Open Dashboard <ExternalLink className="w-3 h-3" />
                                </a>
                                <br />
                                <strong>Important:</strong> Set the Redirect URI in your Spotify app to: <code className="bg-secondary px-1 py-0.5 rounded">{formData.frontendUrl}/api/auth/callback/spotify</code>
                            </p>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Client ID</label>
                                <input 
                                    required
                                    type="text" 
                                    value={formData.spotifyClientId}
                                    onChange={e => setFormData({...formData, spotifyClientId: e.target.value})}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    placeholder="e.g. 8a4b3c..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Client Secret</label>
                                <input 
                                    required
                                    type="password" 
                                    value={formData.spotifyClientSecret}
                                    onChange={e => setFormData({...formData, spotifyClientSecret: e.target.value})}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    placeholder="e.g. 9f2e1d..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border/50 pt-8 space-y-4">
                        <div>
                            <h3 className="text-lg font-black tracking-tight mb-2 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-blue-500" />
                                Database & Architecture
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                The default values assume you are running the local.fm Postgres and Redis instances via Docker or local ports. If you are using Docker Compose, change `localhost` to `db` and `redis`.
                            </p>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Database URL</label>
                                <input 
                                    required
                                    type="text" 
                                    value={formData.databaseUrl}
                                    onChange={e => setFormData({...formData, databaseUrl: e.target.value})}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Redis URL</label>
                                <input 
                                    required
                                    type="text" 
                                    value={formData.redisUrl}
                                    onChange={e => setFormData({...formData, redisUrl: e.target.value})}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border/50 pt-8">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 shadow-lg"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Save & Initialize</span>
                                    <Check className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
