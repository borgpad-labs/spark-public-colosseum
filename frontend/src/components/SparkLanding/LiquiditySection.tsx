import { Activity, Anchor, BarChart, ShieldCheck, ArrowUpRight } from "lucide-react";

export default function LiquiditySection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        
        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 text-orange-500 text-xs font-semibold uppercase tracking-wider mb-4">
              <Activity className="w-4 h-4" strokeWidth="1.5" />
              Liquidity and Growth
            </div>
            <p className="text-neutral-400 leading-relaxed mb-8">
              We help projects source liquidity from institutions, users and communities. We focus on building strong markets, attracting long-term participants and securing strategic partners and listings. And we help them to manage and generate revenue from their liquidity.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                <Anchor className="w-4 h-4 text-white" strokeWidth="1.5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">Liquidity Design</p>
                <p className="text-sm text-neutral-400">Custom depth and spread optimization.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                <BarChart className="w-4 h-4 text-white" strokeWidth="1.5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">LP Optimization</p>
                <p className="text-sm text-neutral-400">Incentive structures for community.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                <ShieldCheck className="w-4 h-4 text-white" strokeWidth="1.5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">Market Stability</p>
                <p className="text-sm text-neutral-400">Reducing volatility for sustainable growth.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Case Study Card */}
        <a 
          href="https://borgpad.com/launch-pools/gold-yield" 
          target="_blank"
          rel="noopener noreferrer"
          className="relative group mt-8 md:mt-0 block cursor-pointer"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative p-8 bg-black border border-white/10 rounded-xl">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest border border-white/10 px-2 py-1 rounded">Case Study</span>
              <ArrowUpRight className="w-5 h-5 text-orange-500" strokeWidth="1.5" />
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/omnipair.png" 
                alt="Omnipair logo" 
                className="w-12 h-12 rounded-full object-cover"
              />
              <h3 className="text-2xl font-semibold text-white tracking-tight">Omnipair</h3>
            </div>
            <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
              We supported their DEX launch with liquidity +($250k), partners access and communication.
            </p>

            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
              <div>
                <span className="block text-xl font-semibold text-white">Full</span>
                <span className="text-xs text-neutral-500">Liquidity Design</span>
              </div>
              <div>
                <span className="block text-xl font-semibold text-white">Access</span>
                <span className="text-xs text-neutral-500">Strategic Partners</span>
              </div>
            </div>
          </div>
        </a>

      </div>
    </section>
  );
}
