export default function ReferralCenter({ onBack }: any) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-4xl mx-auto">
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm">&larr; Back</button>
      <h1 className="text-3xl font-bold mb-4">Affiliate & Referral Matrix</h1>
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-xl font-bold text-amber-400 mb-2">Your Referral Link</h3>
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-slate-300 mb-4">
          https://www.avertrader.space/auth?ref=AVER99
        </div>
        <p className="text-sm text-slate-400">Earn 20% commission on all referred institutional trading fees.</p>
      </div>
    </div>
  );
}
