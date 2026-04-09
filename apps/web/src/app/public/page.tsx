import { getDictionary, getLocale } from "@/lib/i18n";
import PublicStatsView from "./[id]/PublicStatsView";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

export default async function GenericPublicProfilePage() {
    const dict = await getDictionary("dashboard");
    const common = await getDictionary("common");
    const locale = await getLocale();

    let initialData = null;
    let error = null;

    try {
        const res = await axios.get(`${API_BASE_URL}/stats/public/profile?timeframe=lifetime`);
        initialData = res.data;
    } catch (e: any) {
        error = e.response?.data?.error || "No public profile found";
    }

    if (error || !initialData) {
        return (
           <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
               <h1 className="text-4xl font-black tracking-tighter mb-4 text-primary">Access Denied</h1>
               <p className="text-muted-foreground font-bold max-w-md">
                   {error || "This profile is private or does not exist."}
               </p>
               <a href="/" className="mt-8 px-8 py-3 bg-foreground text-background rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">
                   Go Back Home
               </a>
           </div>
        );
    }

    return (
        <PublicStatsView 
            id="profile"
            initialData={initialData}
            dict={dict}
            common={common}
            locale={locale}
        />
    );
}
