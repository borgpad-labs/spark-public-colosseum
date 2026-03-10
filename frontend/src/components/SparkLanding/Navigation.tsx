export default function Navigation() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <img
            src="/sparklogo.png"
            alt="Spark"
            className="h-8 w-auto object-contain"
          />
        </a>
        <a 
          href="https://t.me/Mathis_btc"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-2 text-xs font-medium text-white border border-white/10 bg-white/5 px-4 py-2 rounded-full hover:bg-white/10 hover:border-orange-500/50 transition-all duration-300"
        >
          Build with Spark
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>
    </nav>
  );
}
