import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section id="apply" className="py-32 bg-black relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
        <div className="w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[120px]"></div>
      </div>
      
      <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
        <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-8">
          Build With Spark
        </h2>
        <p className="text-xl text-white mb-10">
          Let's launch something real.
        </p>
        <a 
          href="https://t.me/Mathis_btc"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center justify-center px-8 py-4 bg-orange-500 text-black font-semibold text-sm rounded-lg overflow-hidden transition-all hover:bg-orange-400"
        >
          <span className="relative flex items-center gap-2">
            Apply now
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth="1.5" />
          </span>
        </a>
      </div>
    </section>
  );
}
