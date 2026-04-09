import type { Metadata } from "next";
import { Geist, Geist_Mono, Archivo_Black, Crimson_Pro } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                // 1. Font Family
                const font = localStorage.getItem('font-family') || 'sans';
                const fonts = {
                  sans: 'var(--font-geist-sans)',
                  mono: 'var(--font-geist-mono)',
                  serif: 'var(--font-crimson-pro)',
                  black: 'var(--font-archivo-black)'
                };
                document.documentElement.style.setProperty('--font-family', fonts[font] || fonts.sans);

                // 2. Accent Color
                const accent = localStorage.getItem('accent-color') || 'violet';
                const accents = {
                  violet: '262 83% 58%',
                  green: '142 71% 45%',
                  blue: '217 91% 60%',
                  amber: '38 92% 50%'
                };
                document.documentElement.style.setProperty('--primary', accents[accent] || accents.violet);
              } catch (e) {}
            })()
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${archivoBlack.variable} ${crimsonPro.variable} antialiased selection:bg-green-500/30 bg-background text-foreground`}
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
