import { getDictionary } from "@/lib/i18n";
import { authClient } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import RecapStories from "./RecapStories";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

export default async function Page() {
    const session = await authClient.getSession({
        fetchOptions: {
            headers: await headers()
        }
    });

    if (!session) {
        redirect("/login");
    }

    const dict = await getDictionary("recap");
    
    const recapPrefs = (session.user as any)?.recapPrefs || { year: new Date().getFullYear(), showGenres: true, showActiveDay: true, animation: true };
    const year = recapPrefs.year;

    // Fetch recap data server-side
    let data = null;
    try {
        const res = await axios.get(`${API_BASE_URL}/stats/recap?year=${year}`, { 
            headers: {
                Cookie: (await headers()).get('cookie') || ""
            }
        });
        data = res.data;
    } catch (e) {
        console.error("Failed to fetch recap data", e);
    }

    if (!data) {
        return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black uppercase tracking-widest">{dict.summary.noData}</div>;
    }

    return (
        <RecapStories data={data} dict={dict} prefs={recapPrefs} />
    );
}
