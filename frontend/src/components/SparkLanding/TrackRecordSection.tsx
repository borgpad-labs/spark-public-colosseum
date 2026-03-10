import { Star } from "lucide-react";
import { useEffect, useRef } from "react";

export default function TrackRecordSection() {
  const statsScrollRef = useRef<HTMLDivElement>(null);
  const stats = [
    {
      value: "$3M+",
      label: "Raised",
    },
    {
      value: "12",
      label: "Projects Launched",
    },
    {
      value: "5,000+",
      label: "Investors",
    },
    {
      value: "$500K+",
      label: "Revenue Generated",
    },
  ];

  const testimonials = [
    {
      name: "VNX",
      image: "/vnx.png",
      description: "RWA Issuer - regulated in Europe",
      url: "https://www.vnx.li/",
      stars: 5,
      comment: "Spark supported the $VNX token sale with strategic guidance and launch infrastructure from pre-launch through post-TGE. The collaboration resulted in a highly successful execution, selling out in just 13 seconds. Thank you, team ! you're the best!",
    },
    {
      name: "ZeroSpread",
      image: "/zerospread.png",
      description: "MarketMaker - 100M AUM",
      url: "https://zerospread.io/",
      stars: 5,
      comment: "For over a year, we've been working with BorgPad on project launches as well as secondary listings. Efficient and dedicated It's rare to find partners so professional and committed in Web3. A real pleasure!",
    },
    {
      name: "Anthony",
      image: "/antho.png",
      description: "CSO - Founder Swissborg",
      url: "https://x.com/AnthoLGSB",
      stars: 5,
      comment: "I've seen them evolve and iterate from the beginning with a healthy approach to tokenomics / LP / launch, both for projects and for users. A dedicated team on a mission to see our ecosystem evolve positively.",
    },
  ];

  useEffect(() => {
    const statsContainer = statsScrollRef.current;

    if (!statsContainer) return;

    let statsAnimationId: number | null = null;
    let statsScrollPosition = 0;

    const scrollStats = () => {
      if (!statsContainer) return;
      
      statsScrollPosition += 1;
      const maxScroll = statsContainer.scrollWidth / 2; // Diviser par 2 car on a dupliqué le contenu
      
      if (statsScrollPosition >= maxScroll) {
        statsScrollPosition = 0;
      }
      
      statsContainer.scrollLeft = statsScrollPosition;
      statsAnimationId = requestAnimationFrame(scrollStats);
    };

    // Démarrer le scroll après un court délai pour s'assurer que le DOM est prêt
    const startScrolling = () => {
      setTimeout(() => {
        statsAnimationId = requestAnimationFrame(scrollStats);
      }, 100);
    };

    startScrolling();

    return () => {
      if (statsAnimationId !== null) cancelAnimationFrame(statsAnimationId);
    };
  }, []);

  return (
    <section className="border-y border-white/5 bg-neutral-950">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Track Record</h2>
          <p className="text-neutral-500 text-sm">Real results from real projects</p>
        </div>

        {/* Stats */}
        <div className="mb-16 -mx-6 px-6">
          <div
            ref={statsScrollRef}
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4"
          >
            {/* Dupliquer les stats pour un défilement infini */}
            {[...stats, ...stats].map((stat, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[calc(50%-0.5rem)] md:w-[calc(25%-1.125rem)] p-6 md:p-8 rounded-xl border border-white/10 bg-gradient-to-br from-neutral-900/40 to-neutral-900/20 hover:border-orange-500/30 transition-all duration-300 text-center relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-2">{stat.value}</div>
                  <div className="text-xs md:text-sm text-neutral-400 font-medium">{stat.label}</div>
                  {stat.label === "Revenue Generated" && (
                    <div className="text-[10px] text-neutral-600 mt-2 leading-tight">for projects through our post-launch LP management</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-8">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-8 text-center">Trusted by</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <a
                key={index}
                href={testimonial.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-6 rounded-xl border border-white/10 bg-neutral-900/20 hover:border-orange-500/30 transition-all duration-300 cursor-pointer block"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">{testimonial.name}</h4>
                    {testimonial.description && (
                      <p className="text-xs text-orange-500/80 mt-0.5">{testimonial.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(testimonial.stars)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-orange-500 text-orange-500" strokeWidth={0} />
                      ))}
                      <span className="text-xs text-neutral-500 ml-1">{testimonial.stars}/5</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed">{testimonial.comment}</p>
              </a>
            ))}
          </div>
        </div>
        
        <p className="text-xs text-neutral-600 text-center">We work with real founders and deliver real results.</p>
      </div>
    </section>
  );
}
