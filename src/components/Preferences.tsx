export default function Preferences({ onBack }: any) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-3xl mx-auto">
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm">&larr; Back</button>
      <h1 className="text-3xl font-bold mb-4">Platform Preferences & Security</h1>
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div>
          <h3 className="font-bold text-amber-400 mb-1">Two-Factor Authentication (2FA)</h3>
          <p className="text-sm text-slate-400 mb-3">TOTP Hardware Key Authentication is active.</p>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg border border-emerald-500/30">Secured</span>
        </div>
      </div>
    </div>
  );
}
