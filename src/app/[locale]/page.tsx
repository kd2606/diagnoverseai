import { AmbientBackground } from "@/components/AmbientBackground";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { Architecture } from "@/components/Architecture";
import { SecuritySection } from "@/components/SecuritySection";
import { Footer } from "@/components/Footer";
import { ScrollProgress } from "@/components/ScrollProgress";

export default function Home() {
  return (
    <>
      <AmbientBackground />
      <ScrollProgress />
      <Navbar />
      <main className="relative z-0">
        <HeroSection />

        {/* Section divider hairlines create the "expensive" vertical rhythm */}
        <div aria-hidden className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        <FeaturesGrid />

        <div aria-hidden className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        <Architecture />

        <div aria-hidden className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        <SecuritySection />
      </main>
      <Footer />
    </>
  );
}
