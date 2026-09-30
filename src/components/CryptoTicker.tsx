export default function CryptoTicker() {
  return (
    <div className="bg-slate-900 border-b border-slate-800 py-2 px-6 flex items-center justify-between text-xs text-slate-400 overflow-x-auto whitespace-nowrap">
      <div className="flex items-center gap-6">
        <span>BTC/USD: <strong className="text-emerald-400">$94,280.00 (+3.4%)</strong></span>
        <span>ETH/USD: <strong className="text-emerald-400">$3,540.20 (+2.1%)</strong></span>
        <span>SOL/USD: <strong className="text-emerald-400">$188.50 (+5.8%)</strong></span>
        <span>AVR/USD: <strong className="text-amber-400">$14.85 (+12.4%)</strong></span>
      </div>
      <span className="text-amber-500 font-semibold">Institutional Liquidity Active</span>
    </div>
  );
}
