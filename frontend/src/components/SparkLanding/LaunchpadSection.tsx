import swissborgLogo from "@/assets/landingPage/swissborg-logo.png";

export default function LaunchpadSection() {
  return (
    <section
      id="launchpad"
      className="py-24 border-t border-white/5 bg-[linear-gradient(to_bottom,rgba(0,0,0,0),rgba(249,115,22,0.05))]"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-6xl mx-auto mb-12 relative">
          {/* Badge + Title - centered */}
          <div className="flex flex-col items-center mb-6">
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium mb-4">
              Launchpad and Fundraising
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight text-center">
              BorgPad
            </h2>
          </div>
          {/* Image - positioned absolutely to the left */}
          <div className="hidden md:block absolute top-0 left-0">
            <img
              src="/rocket.png"
              alt="Rocket"
              className="h-48 md:h-64 lg:h-80 w-auto object-contain"
            />
          </div>
          {/* Image for mobile - below title */}
          <div className="md:hidden flex justify-center mb-6">
            <img
              src="/rocket.png"
              alt="Rocket"
              className="h-48 w-auto object-contain"
            />
          </div>
          {/* Description text - centered independently */}
          <p className="text-neutral-400 text-lg max-w-xl mx-auto text-center">
            Our dedicated launchpad to onboard projects, structure fundraising, and run token launches with a focus on
            long-term market health.
          </p>
        </div>

        <div className="mt-10 max-w-4xl mx-auto">
            {/* Top row: 3 boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-neutral-900/40 to-neutral-900/20 hover:border-orange-500/30 transition-all duration-300 text-center">
                <div className="text-base font-medium text-white">$3m raised</div>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-neutral-900/40 to-neutral-900/20 hover:border-orange-500/30 transition-all duration-300 text-center">
                <div className="text-base font-medium text-white">12 projects launched</div>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-neutral-900/40 to-neutral-900/20 hover:border-orange-500/30 transition-all duration-300 text-center">
                <div className="text-base font-medium text-white">100% TGE on Chain</div>
              </div>
            </div>
            
            {/* Bottom row: 2 larger boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-neutral-900/40 to-neutral-900/20 hover:border-orange-500/30 transition-all duration-300 text-center">
                <div className="text-base font-medium text-white">100% listing secured on SwissBorg</div>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-neutral-900/40 to-neutral-900/20 hover:border-orange-500/30 transition-all duration-300 text-center">
                <div className="text-base font-medium text-white">$500K+ Revenue Generated for projects through our post-launch LP management</div>
              </div>
            </div>
          </div>

        <div className="mt-8 pt-8 border-t border-white/10 max-w-2xl mx-auto space-y-4 text-center">
          <p className="text-sm text-neutral-400 leading-relaxed">
            We design tokenomics, deploy custom liquidity strategies, support SwissBorg listings and manage marketing
            and launch execution.
          </p>
          <p className="text-white font-medium text-sm">
            Our goal is not hype. Our goal is sustainable markets.
          </p>
        </div>

        {/* SwissBorg Partnership */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-3 text-sm text-neutral-400">
            <div className="flex items-center gap-3">
              <span>We Partner With</span>
              <img
                src={swissborgLogo}
                alt="SwissBorg"
                className="h-6 object-contain opacity-80"
              />
            </div>
            <span className="text-xs text-neutral-500">for raise / distribution / listing</span>
          </div>
          
          <a
            href="https://borgpad.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-white border border-white/10 bg-white/5 px-5 py-2.5 rounded-full hover:bg-white/10 hover:border-orange-500/50 transition-all duration-300"
          >
            Visit BorgPad
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
