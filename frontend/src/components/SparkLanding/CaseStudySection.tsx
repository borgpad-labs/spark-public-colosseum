import { Trophy, ExternalLink } from "lucide-react";

export default function CaseStudySection() {

  const caseStudies = [
    {
      title: "Solana Wrapped 2025",
      description: "We built the definitive on-chain recap for the Solana ecosystem. It delivers a personalized experience that highlights transaction history, NFTs and DeFi activity. Solana shared us.",
      features: [
        "Shared twice by @solana",
      ],
      stats: [
        { value: "+150k", label: "Impressions" },
        { value: "2k+", label: "Users Onboarded" },
      ],
      url: "https://x.com/sparkdotfun/status/1997244911318712762?s=20",
      logo: null,
    },
    {
      title: "VNX",
      description: "Spark supported the $VNX token sale with strategic guidance and launch infrastructure. The collaboration resulted in a highly successful execution, selling out in just 13 seconds.",
      features: [
        "LaunchPad",
        "TGE",
        "Liquidity Management",
      ],
      stats: [
        { value: "$500k", label: "Raise" },
      ],
      url: "https://www.vnx.li/",
      logo: "/vnx.png",
      subtitle: "RWA Issuer - regulated in Europe",
    },
    {
      title: "Omnipair",
      description: "We supported their DEX launch with liquidity +($200k), partners access and communication.",
      features: [
        "Capital Access",
        "Strategic Partners",
      ],
      stats: [
        { value: "$200k", label: "Liquidity" },
      ],
      url: "https://borgpad.com/launch-pools/gold-yield",
      logo: "/omnipair.png",
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-6 py-24 border-t border-white/5">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Case Studies</h2>
        <p className="text-neutral-500 text-sm">Real projects, real results</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {caseStudies.map((study, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/40 p-1 flex flex-col"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-50"></div>
            <div className="relative flex flex-col p-6 gap-4 flex-1">
              <div className="flex items-center gap-2 text-orange-500 text-xs font-semibold uppercase tracking-wider">
                <Trophy className="w-4 h-4" strokeWidth="1.5" />
                Case Study
              </div>
              <div className="flex items-center gap-3">
                {study.logo && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                    <img
                      src={study.logo}
                      alt={`${study.title} logo`}
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-white tracking-tight">{study.title}</h3>
                  {study.subtitle && (
                    <p className="text-xs text-orange-500/80 mt-0.5">{study.subtitle}</p>
                  )}
                </div>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed">{study.description}</p>
              {study.features && (
                <div className="flex flex-wrap gap-2">
                  {study.features.map((feature, featureIndex) => (
                    <span
                      key={featureIndex}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/10">
                {study.stats.map((stat, statIndex) => (
                  <div key={statIndex}>
                    <div className="text-2xl font-semibold text-white tracking-tight">{stat.value}</div>
                    <div className="text-xs text-neutral-500 mt-0.5 font-medium uppercase tracking-wide">{stat.label}</div>
                  </div>
                ))}
              </div>
              {study.url && (
                <a
                  href={study.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-medium text-orange-500 hover:text-orange-400 transition-colors mt-2"
                >
                  Learn more
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
