export default function Hero({ onGetStarted, onShowcase }: any) {
  return (
    <section className="py-24 px-6 text-center max-w-5xl mx-auto">
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
        Institutional-Grade <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Crypto Trading</span>
      </h1>
      <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto">
        High-frequency execution, AI-powered predictive market insights, and sovereign asset vaults built for elite traders and institutions.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button onClick={onGetStarted} className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded-xl shadow-xl hover:opacity-90 transition">
          Launch Trading Terminal
        </button>
        <button onClick={onShowcase} className="px-8 py-4 bg-slate-900 border border-slate-800 text-white font-bold rounded-xl hover:bg-slate-800 transition">
          Explore Platform
        </button>
      </div>
    </section>
  );
}
