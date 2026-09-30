export default function MarketHighlightsPage({ onBack }: any) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-5xl mx-auto">
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm">&larr; Back</button>
      <h1 className="text-3xl font-bold mb-4">Market Highlights & Alpha Screener</h1>
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <p className="text-slate-400">Real-time volatility and momentum index across top 100 crypto assets.</p>
      </div>
    </div>
  );
}
