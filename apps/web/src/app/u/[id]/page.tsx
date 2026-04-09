import { getDictionary, getLocale } from "@/lib/i18n";
import PublicStatsView from "./PublicStatsView";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const dict = await getDictionary("dashboard");
    const common = await getDictionary("common");
    const locale = await getLocale();

    let initialData = null;
    let error = null;

    try {
        const res = await axios.get(`${API_BASE_URL}/stats/public/${id}/summary?timeframe=lifetime`);
        initialData = res.data;
    } catch (e: any) {
        // If not found, try to find ANY public user (for single user convenience)
        try {
            const fallback = await axios.get(`${API_BASE_URL}/stats/public/any/summary?timeframe=lifetime`);
            initialData = fallback.data;
            // We should probably redirect to the correct ID but for now just show data
        } catch (e2) {
            error = e.response?.data?.error || "User not found or profile is private";
        }
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter">404</h1>
                    <p className="text-muted-foreground font-bold">{error}</p>
                    <a href="/" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest">
                        Go Home
                    </a>
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
