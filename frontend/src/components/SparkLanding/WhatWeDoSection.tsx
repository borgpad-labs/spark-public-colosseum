import { Rocket, Coins, Droplet, TrendingUp } from "lucide-react";

export default function WhatWeDoSection() {
  const services = [
    {
      icon: Rocket,
      title: "Launch Tokens",
      description: "Tokenomics, narrative, and launch execution.",
    },
    {
      icon: Coins,
      title: "Raise Capital",
      description: "Fundraising through our launchpad and partners.",
    },
    {
      icon: Droplet,
      title: "Deploy Liquidity",
      description: "OnChainLiquidity design, market making, and exchange access.",
    },
    {
      icon: TrendingUp,
      title: "Scale Growth",
      description: "Community, partnerships, and market expansion.",
    },
  ];

  return (
    <section id="work" className="max-w-6xl mx-auto px-6 py-24 border-t border-white/5">
      <div className="space-y-12">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">What We Do</h2>
          <p className="text-neutral-500 leading-relaxed max-w-2xl mx-auto">
            We take projects from tokenomics to thriving markets. Strategy, capital, liquidity, growth — all aligned for long-term success.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={index}
                className="p-6 rounded-xl border border-white/10 bg-neutral-900/20 hover:border-orange-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-orange-500" strokeWidth="1.5" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{service.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{service.description}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center py-8">
          <p className="text-xl text-white font-medium">
            Our goal is not hype. Our goal is sustainable markets.
          </p>
        </div>
      </div>
    </section>
  );
}
