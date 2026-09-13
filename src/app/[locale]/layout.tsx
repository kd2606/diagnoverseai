import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Inter, Plus_Jakarta_Sans, DM_Sans, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseProvider } from "@/firebase/provider";
import { Toaster } from "@/components/ui/sonner";
import { FloatingChat } from "@/components/floating-chat";
import { Metadata } from "next";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DiagnoVerse AI — Clinical Intelligence. Anywhere on Earth.",
  description:
    "Edge-resilient multimodal AI for clinical triage. From low-bandwidth offline scans to instant clinician verification.",
  openGraph: {
    title: "DiagnoVerse AI",
    description:
      "Empowering clinicians and patients with edge-resilient multimodal AI.",
    type: "website",
  },
};

const plusJakartaSans = Plus_Jakarta_Sans({
    variable: "--font-plus-jakarta-sans",
    subsets: ["latin"],
});

const dmSans = DM_Sans({
    variable: "--font-dm-sans",
    subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
    variable: "--font-space-grotesk",
    subsets: ["latin"],
});

type Props = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    // Validate locale
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <body
                className={`${inter.variable} ${plusJakartaSans.variable} ${dmSans.variable} ${spaceGrotesk.variable} font-sans antialiased`}
                suppressHydrationWarning
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    forcedTheme="dark"
                    disableTransitionOnChange
                >
                    <NextIntlClientProvider messages={messages}>
                        <FirebaseProvider>
                            {children}
                            <FloatingChat />
                            <Toaster />
                        </FirebaseProvider>
                    </NextIntlClientProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
