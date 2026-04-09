import { cookies } from "next/headers";

const dictionaries = {
  en: async (namespace: string) => {
    try {
      return (await import(`../../locales/en/${namespace}.json`)).default;
    } catch (e) {
      return (await import(`../../locales/en/common.json`)).default;
    }
  },
  de: async (namespace: string) => {
    try {
      return (await import(`../../locales/de/${namespace}.json`)).default;
    } catch (e) {
      return (await import(`../../locales/de/common.json`)).default;
    }
  },
};

export const getDictionary = async (namespace: string = "common") => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  return dictionaries[locale as keyof typeof dictionaries](namespace);
};

export const getLocale = async () => {
  const cookieStore = await cookies();
  return cookieStore.get("NEXT_LOCALE")?.value || "en";
};
