export default function EventsPromosPage({ onBack }: any) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-5xl mx-auto">
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm">&larr; Back</button>
      <h1 className="text-3xl font-bold mb-4">Global Competitions & Promos</h1>
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="font-bold text-amber-400 mb-2">Q3 Global Trading Championship</h3>
        <p className="text-slate-400 text-sm">Prize pool: $1,000,000 in USDT and Gold bullion.</p>
      </div>
    </div>
  );
}
