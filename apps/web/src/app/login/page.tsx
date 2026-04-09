'use client';

import { authClient } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Music, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch(`${API_BASE_URL}/setup/status`)
            .then(r => r.json())
            .then(data => {
                if (!data.isConfigured) router.push('/setup');
            })
            .catch(console.error);
    }, [router]);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await authClient.signIn.social({
                provider: "spotify",
                callbackURL: "http://127.0.0.1:3000/",
            });
        } catch (error) {
            console.error("Login failed:", error);
            alert("Connection failed. Check if your API is running and Dev Tunnel is open.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Theme Toggle Top Right */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/10 dark:bg-green-500/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/20 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-[440px] relative z-10">
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-16 h-16 bg-card border border-border rounded-2xl flex items-center justify-center mb-6 shadow-xl dark:shadow-2xl">
                        <Music className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter mb-3">local.fm</h1>
                    <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                        Your music journey, <span className="text-foreground">decoded.</span>
                    </p>
                </div>
                
                <div className="bg-card/40 dark:bg-card/20 backdrop-blur-xl border border-border p-10 rounded-[32px] shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                    <div className="space-y-6 mb-10">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 bg-green-500/20 p-2 rounded-lg text-green-600 dark:text-green-500">
                                <Zap className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-foreground">Real-time Insights</h3>
                                <p className="text-xs text-muted-foreground">Every stream synced instantly.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="mt-1 bg-blue-500/20 p-2 rounded-lg text-blue-600 dark:text-blue-500">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-foreground">Privacy Focused</h3>
                                <p className="text-xs text-muted-foreground">Self-hosted. Your data, your rules.</p>
                            </div>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="group w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 shadow-lg"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Connect Spotify</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                    
                    <p className="mt-8 text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        Ready for launch
                    </p>
                </div>

                <footer className="mt-12 text-center text-muted-foreground text-xs">
                    &copy; 2026 local.fm &bull; Built for enthusiasts
                </footer>
            </div>
        </div>
    );
}
