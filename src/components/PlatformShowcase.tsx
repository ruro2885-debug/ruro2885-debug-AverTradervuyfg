export default function PlatformShowcase({ onBack, onGetStarted }: any) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-5xl mx-auto">
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm">&larr; Back</button>
      <h1 className="text-4xl font-bold mb-4">AVER Platform Showcase</h1>
      <p className="text-slate-400 mb-8">Explore our institutional liquidity aggregation and AI-driven predictive trading engines.</p>
      <button onClick={onGetStarted} className="px-6 py-3 bg-amber-500 text-slate-950 font-bold rounded-xl">Get Started Now</button>
    </div>
  );
}
