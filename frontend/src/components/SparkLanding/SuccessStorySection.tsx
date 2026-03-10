import { Trophy } from "lucide-react";
import { useEffect, useRef } from "react";

export default function SuccessStorySection() {
  const tweetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeTwitterWidget = () => {
      // Check if Twitter widgets script is already loaded
      const existingScript = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
      
      const loadWidgets = () => {
        const twttr = (window as any).twttr;
        if (twttr && twttr.ready) {
          twttr.ready(() => {
            if (twttr.widgets && tweetContainerRef.current) {
              twttr.widgets.load(tweetContainerRef.current);
            }
          });
        } else if (twttr && twttr.widgets && tweetContainerRef.current) {
          twttr.widgets.load(tweetContainerRef.current);
        }
      };
      
      if (!existingScript) {
        // Create and load the Twitter widgets script
        const script = document.createElement("script");
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        script.charset = "utf-8";
        script.id = "twitter-wjs";
        
        script.onload = () => {
          setTimeout(loadWidgets, 300);
        };
        
        document.head.appendChild(script);
      } else {
        // Script already exists, try to load widgets
        setTimeout(loadWidgets, 300);
      }
    };

    // Wait for component to mount and DOM to be ready
    const timer = setTimeout(initializeTwitterWidget, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-6 mb-24">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/40 p-1">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-50"></div>
        <div className="relative flex flex-col md:flex-row items-center justify-between p-8 gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2 text-orange-500 text-xs font-semibold uppercase tracking-wider">
              <Trophy className="w-4 h-4" strokeWidth="1.5" />
              Latest Viral Launch
            </div>
            <h3 className="text-2xl font-semibold text-white tracking-tight">Solana Wrapped 2025</h3>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-lg">
              We built the definitive on-chain recap for the Solana ecosystem. It delivers a personalized experience that highlights transaction history, NFTs and DeFi activity. Solana shared us.
            </p>
          </div>
          <div className="flex flex-row gap-6 md:gap-8 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-12 w-full md:w-auto justify-start md:justify-end">
            <div>
              <div className="text-3xl font-semibold text-white tracking-tight">+150k</div>
              <div className="text-xs text-neutral-500 mt-1 font-medium uppercase tracking-wide">Impressions</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-white tracking-tight">2k+</div>
              <div className="text-xs text-neutral-500 mt-1 font-medium uppercase tracking-wide">Users Onboarded</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Twitter Tweet Embed */}
      <div ref={tweetContainerRef} className="mt-8 flex justify-center">
        <blockquote className="twitter-tweet" data-theme="dark" data-dnt="true">
          <p lang="en" dir="ltr">
            Your <a href="https://twitter.com/solana?ref_src=twsrc%5Etfw">@solana</a> Wallet, Wrapped.<br/><br/>
            We just launched a Spotify Wrapped–style recap for your Solana wallet.<br/><br/>
            No wallet connection needed.<br/>
            • Drop a wallet address<br/>
            • Get a clean on-chain recap<br/>
            • Share it with friends<br/><br/>
            👉 <a href="https://t.co/DzpYH3EqwK">https://t.co/DzpYH3EqwK</a><br/><br/>
            Made with 💜 for the Solana Community. <a href="https://t.co/OM6lzFw4vS">pic.twitter.com/OM6lzFw4vS</a>
          </p>
          &mdash; Spark ✨ (@sparkdotfun) <a href="https://twitter.com/sparkdotfun/status/1997244911318712762?ref_src=twsrc%5Etfw">December 6, 2025</a>
        </blockquote>
      </div>
    </section>
  );
}
