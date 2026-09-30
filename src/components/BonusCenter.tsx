export default function BonusCenter({ onBack }: any) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-4xl mx-auto">
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm">&larr; Back</button>
      <h1 className="text-3xl font-bold mb-4">Bonus & Rewards Center</h1>
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-xl font-bold text-amber-400 mb-2">Institutional Deposit Bonus</h3>
        <p className="text-slate-400 text-sm mb-4">Claim up to $10,000 in trading credits on your next block deposit.</p>
        <button className="px-6 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-sm">Claim Bonus</button>
      </div>
    </div>
  );
}
