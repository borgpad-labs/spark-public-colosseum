import { Link } from "react-router-dom";
import { Lightbulb, Code } from "lucide-react";

export default function HackathonsSection() {
  return (
    <section className="py-24 border-t border-white/5 bg-[linear-gradient(to_bottom,rgba(0,0,0,0),rgba(249,115,22,0.05))]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Launchpad Ideas */}
          <div className="p-8 rounded-xl border border-white/10 bg-neutral-900/20">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-orange-500" />
              <span className="inline-block px-3 py-1 rounded-full bg-orange-500/20 text-orange-500 text-xs font-medium">Live</span>
            </div>
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-4">Launchpad Ideas</h2>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Share your ideas, vote on features, and help shape the future of Web3. Our community-driven platform lets you submit and discuss product improvements.
            </p>
            <Link
              to="/ideas"
              className="inline-flex items-center gap-2 text-sm font-medium text-white border border-white/10 bg-white/5 px-5 py-2.5 rounded-full hover:bg-white/10 hover:border-orange-500/50 transition-all duration-300"
            >
              Explore Ideas
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* Hackathons */}
          <div className="p-8 rounded-xl border border-white/10 bg-neutral-900/20">
            <div className="flex items-center gap-3 mb-4">
              <Code className="w-6 h-6 text-orange-500" />
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium">Coming soon</span>
            </div>
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-4">Hackathons</h2>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              We are launching builder-focused hackathons to turn early ideas into real Web3 startups.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
