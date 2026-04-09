import { getDictionary, getLocale } from "@/lib/i18n";
import { authClient } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "./DashboardShell";
import { API_BASE_URL } from "@/lib/api";

export default async function Page() {
    try {
        const res = await fetch(`${API_BASE_URL}/setup/status`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (!data.isConfigured) {
                redirect("/setup");
            }
        }
    } catch (e) {
        console.error("Failed to check setup status:", e);
    }

    const { data: session } = await authClient.getSession({
        fetchOptions: {
            headers: await headers(),
            cache: 'no-store'
        }
    });

    if (!session) {
        redirect("/login");
    }

    const dict = await getDictionary("dashboard");
    const common = await getDictionary("common");
    const historyDict = await getDictionary("history");
    const settingsDict = await getDictionary("settings");
    const locale = await getLocale();

    return (
        <DashboardShell 
            session={session} 
            dict={dict} 
            common={common} 
            historyDict={historyDict}
            settingsDict={settingsDict}
            locale={locale} 
        />
    );
}
