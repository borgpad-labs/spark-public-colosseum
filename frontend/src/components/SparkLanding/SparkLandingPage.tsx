import Navigation from "./Navigation";
import HeroSection from "./HeroSection";
import WhatWeDoSection from "./WhatWeDoSection";
import TrackRecordSection from "./TrackRecordSection";
import LaunchpadSection from "./LaunchpadSection";
import CaseStudySection from "./CaseStudySection";
import HackathonsSection from "./HackathonsSection";
import SparkTokenSection from "./SparkTokenSection";
import CTASection from "./CTASection";
import Footer from "./Footer";

export default function SparkLandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-neutral-400 antialiased selection:bg-orange-500/20 selection:text-orange-500 scroll-smooth">
      <Navigation />
      <main>
        <HeroSection />
        <WhatWeDoSection />
        <TrackRecordSection />
        <LaunchpadSection />
        <CaseStudySection />
        <HackathonsSection />
        <SparkTokenSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
