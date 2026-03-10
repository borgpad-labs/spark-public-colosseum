import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { CONTRACT_ADDRESS } from "../../utils/sparkUtils";
import GlowButton from "./GlowButton";
import { Copy } from "lucide-react";

export default function SparkTokenSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [copied, setCopied] = useState(false);

  const copyCA = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section ref={ref} id="spark-token" className="py-24 px-6 border-t border-white/5">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8 }}
        className="max-w-6xl mx-auto"
      >
        {/* Title - centered with image positioned to the right */}
        <div className="relative mb-6">
          <div className="flex flex-col items-center">
            <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight text-center">
              $SPARK Token
            </h2>
          </div>
          {/* Image - positioned absolutely to the right on desktop, higher up */}
          <div className="hidden md:block absolute -top-24 right-0">
            <img
              src="/spark-coin.png"
              alt="$SPARK Token Coin"
              className="h-48 md:h-60 lg:h-72 w-auto object-contain"
            />
          </div>
          {/* Image for mobile - below title */}
          <div className="md:hidden flex justify-center mt-6">
            <img
              src="/spark-coin.png"
              alt="$SPARK Token Coin"
              className="h-56 w-auto object-contain"
            />
          </div>
        </div>
        
        {/* Subtitle and description - centered independently */}
        <div className="mb-10 text-center">
          <p className="text-xl text-orange-500 font-medium mb-6">
            Own a piece of the ecosystem.
          </p>
          <p className="text-lg text-neutral-400 leading-relaxed max-w-3xl mx-auto">
            Our vision is simple: we don't see token holders as a community — we see you as partners. We're actively transitioning toward a model where $SPARK represents true ownership in everything we build.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 text-center">
          <div
            onClick={copyCA}
            className="flex items-center gap-3 bg-neutral-900/60 border border-white/10 rounded-lg px-5 py-3 cursor-pointer hover:border-orange-500/30 transition-colors"
          >
            <span className="text-sm text-neutral-500">CA:</span>
            <span className="text-sm text-white">{CONTRACT_ADDRESS}</span>
            <Copy className="w-4 h-4 text-neutral-500 hover:text-orange-500 transition-colors" />
            {copied && <span className="text-xs text-orange-500">Copied!</span>}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <GlowButton
              onClick={() => window.open(`https://jup.ag/tokens/${CONTRACT_ADDRESS}`, "_blank")}
              variant="primary"
              className="shiny-button text-white w-48 h-12 cursor-pointer"
            >
              BUY $SPARK
            </GlowButton>
            <a
              href="https://t.me/sparkdotfun"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 text-sm font-medium text-neutral-400 hover:text-white border border-white/10 rounded-full transition-colors"
            >
              Telegram for Members
            </a>
          </div>
        </div>
      </motion.div>

      <style>{`
        .shiny-button {
          position: relative;
          overflow: hidden;
          background: linear-gradient(45deg, #F29F04, #F25C05, #F29F04);
          background-size: 200% 200%;
          animation: glow-pulse 2s ease-in-out infinite;
        }

        .shiny-button::after {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          bottom: -50%;
          left: -50%;
          background: linear-gradient(to bottom, rgba(229, 172, 142, 0), rgba(255,255,255,0.5) 50%, rgba(229, 172, 142, 0));
          transform: rotateZ(60deg) translate(-5em, 7.5em);
          animation: sheen 2s infinite linear;
          pointer-events: none;
        }

        @keyframes glow-pulse {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes sheen {
          0% {
            transform: rotateZ(60deg) translate(-5em, 7.5em);
          }
          100% {
            transform: rotateZ(60deg) translate(5em, -7.5em);
          }
        }
      `}</style>
    </section>
  );
}
