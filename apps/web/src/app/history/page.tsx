import { getDictionary, getLocale } from "@/lib/i18n";
import { authClient } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import HistoryView from "./HistoryView";

export default async function Page() {
    const { data: session } = await authClient.getSession({
        fetchOptions: {
            headers: await headers(),
            cache: 'no-store'
        }
    });

    if (!session) {
        redirect("/login");
    }

    const dict = await getDictionary("history");
    const locale = await getLocale();

    return (
        <HistoryView dict={dict} locale={locale} />
    );
}
