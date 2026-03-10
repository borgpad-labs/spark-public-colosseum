import { Star } from "lucide-react";

export default function TrustedBySection() {
  const testimonials = [
    {
      name: "VNX",
      image: "/vnx.png",
      description: "$100m AUM",
      url: "https://www.vnx.li/",
      stars: 5,
      comment: "Spark supported the $VNX token sale with strategic guidance and launch infrastructure from pre-launch through post-TGE. The collaboration resulted in a highly successful execution, selling out in just 13 seconds. Thank you, team ! you're the best!",
    },
    {
      name: "ZeroSpread",
      image: "/zerospread.png",
      description: "Market Maker",
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

  return (
    <section className="border-y border-white/5 bg-neutral-950">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-12 text-center">Trusted by</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
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
        
        <p className="text-xs text-neutral-600 text-center">We work with real founders and deliver real results.</p>
      </div>
    </section>
  );
}
