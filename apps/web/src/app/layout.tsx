import type { Metadata } from "next";
import { Geist, Geist_Mono, Archivo_Black, Crimson_Pro } from "next/font/google";
import { headers } from "next/headers";
import { authClient } from "@/lib/auth";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  weight: "400",
  variable: "--font-archivo-black",
  subsets: ["latin"],
});

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "local.fm | Your Music Stats",
  description: "Self-hostable music statistics platform.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      cache: 'no-store'
    }
  });

  const accent = session?.user?.accentColor || 'violet';
  const font = session?.user?.fontFamily || 'sans';

  const accents: Record<string, string> = {
    violet: '262 83% 58%',
    green: '142 71% 45%',
    blue: '217 91% 60%',
    amber: '38 92% 50%'
  };

  const fonts: Record<string, string> = {
    sans: 'var(--font-geist-sans)',
    mono: 'var(--font-geist-mono)',
    serif: 'var(--font-crimson-pro)',
    black: 'var(--font-archivo-black)'
  };

  const primaryColor = accents[accent] || accents.violet;
  const fontFamily = fonts[font] || fonts.sans;

  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${archivoBlack.variable} ${crimsonPro.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary: ${primaryColor};
              --font-family: ${fontFamily};
            }
          `
        }} />
      </head>
      <body
        className="antialiased selection:bg-primary/30 bg-background text-foreground"
        style={{ fontFamily: 'var(--font-family)' }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
