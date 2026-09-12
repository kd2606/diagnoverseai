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
      { source: '/:locale/dashboard/patient/skin-scan', destination: '/:locale/dashboard/patient/scanner', permanent: true },
      { source: '/:locale/dashboard/patient/vision-scan', destination: '/:locale/dashboard/patient/scanner', permanent: true },
      { source: '/:locale/dashboard/patient/eye-scan', destination: '/:locale/dashboard/patient/scanner', permanent: true },
      { source: '/:locale/dashboard/patient/cough-analysis', destination: '/:locale/dashboard/patient/respiratory', permanent: true },
      { source: '/:locale/dashboard/patient/mental-health', destination: '/:locale/dashboard/patient/assessments', permanent: true },
      { source: '/:locale/dashboard/patient/cardio-wellness', destination: '/:locale/dashboard/patient/assessments', permanent: true },
      { source: '/:locale/dashboard/patient/health-records', destination: '/:locale/dashboard/patient/vault', permanent: true },
      { source: '/:locale/dashboard/patient/reminders', destination: '/:locale/dashboard/patient/vault', permanent: true },
      { source: '/:locale/dashboard/patient/govt-schemes', destination: '/:locale/dashboard/patient/vault', permanent: true },
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
