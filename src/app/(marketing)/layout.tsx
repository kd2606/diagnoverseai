import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-sans-devanagari",
  weight: ["400", "500", "600", "700"],
  subsets: ["devanagari"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://diagnoverse.ai"),
  title: "DiagnoVerse AI - Next Generation AI-First Healthcare",
  description:
    "DiagnoVerse AI is an advanced SaaS platform bringing multimodal AI triage and seamless patient-clinician experiences to modern healthcare.",
  icons: {
    icon: "/icon.svg",
  },
  alternates: {
    languages: {
      "en-IN": "https://diagnoverse.ai/en",
      "hi-IN": "https://diagnoverse.ai/hi",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "DiagnoVerse AI",
        url: "https://diagnoverse.ai",
        logo: "https://diagnoverse.ai/icon.svg",
        description:
          "DiagnoVerse AI is an advanced SaaS platform bringing multimodal AI triage and seamless patient-clinician experiences to modern healthcare.",
      },
      {
        "@type": "MedicalWebPage",
        name: "DiagnoVerse AI - Next Generation AI-First Healthcare",
        description:
          "DiagnoVerse AI is an advanced SaaS platform bringing multimodal AI triage and seamless patient-clinician experiences to modern healthcare.",
        url: "https://diagnoverse.ai",
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${notoSansDevanagari.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
