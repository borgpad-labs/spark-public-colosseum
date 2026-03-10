import { Zap } from "lucide-react";

export default function HeroSection() {
  return (
    <header className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 hero-glow pointer-events-none"></div>
      
      <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-500 text-xs font-medium mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          Web3 Ecosystem Builder
        </div>

        <h1 className="text-5xl md:text-7xl font-semibold text-white tracking-tight mb-6 leading-[1.1]">
          Spark
        </h1>
        
        <h2 className="text-xl md:text-3xl text-white font-medium tracking-tight mb-6">
          We build, launch and scale Web3 projects
        </h2>
        
        <p className="text-base md:text-lg text-neutral-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Spark partners with Web3 teams from the first idea to active, liquid markets. We handle strategy, launch, liquidity and growth so founders can focus on building.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a 
            href="https://t.me/Mathis_btc"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3 bg-white text-black font-semibold text-sm rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
          >
            Build with Spark
            <Zap className="w-4 h-4 fill-black" strokeWidth="1.5" />
          </a>
        </div>
      </div>

      <style>{`
        .hero-glow {
          background: radial-gradient(circle at center, rgba(249, 115, 22, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
        }
      `}</style>
    </header>
  );
}
