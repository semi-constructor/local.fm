import { getDictionary, getLocale } from "@/lib/i18n";
import PublicStatsView from "./PublicStatsView";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const dict = await getDictionary("dashboard");
    const common = await getDictionary("common");
    const locale = await getLocale();

    let initialData = null;
    let error = null;

    try {
        const res = await axios.get(`${API_BASE_URL}/stats/public/${id}/profile?timeframe=lifetime`);
        initialData = res.data;
    } catch (e: unknown) {
        // Fallback or specific error handling
        if (axios.isAxiosError(e)) {
            error = e.response?.data?.error || "User not found or profile is private";
        } else {
            error = "An unexpected error occurred";
        }
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter">404</h1>
                    <p className="text-muted-foreground font-bold">{error}</p>
                    <Link href="/" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <PublicStatsView 
            id={id}
            initialData={initialData}
            dict={dict}
            common={common}
            locale={locale}
        />
    );
}
