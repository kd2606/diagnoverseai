import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["genkit", "@genkit-ai/googleai", "firebase-admin"],
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/:locale/symptom-checker', destination: '/:locale/dashboard/patient/assessments', permanent: true },
      { source: '/:locale/vision-scan', destination: '/:locale/dashboard/patient/scanner', permanent: true },
      { source: '/:locale/skin-scan', destination: '/:locale/dashboard/patient/scanner', permanent: true },
      { source: '/:locale/cough-analysis', destination: '/:locale/dashboard/patient/respiratory', permanent: true },
      { source: '/:locale/mental-health', destination: '/:locale/dashboard/patient/assessments', permanent: true },
      { source: '/:locale/cardio-check', destination: '/:locale/dashboard/patient/assessments', permanent: true },
      { source: '/:locale/health-trends', destination: '/:locale/dashboard/patient/vault', permanent: true },
      { source: '/:locale/health-records', destination: '/:locale/dashboard/patient/vault', permanent: true },
      { source: '/:locale/govt-schemes', destination: '/:locale/dashboard/patient/vault', permanent: true },
      { source: '/:locale/reminders', destination: '/:locale/dashboard/patient/vault', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
