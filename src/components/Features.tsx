export default function Features({ theme: _theme }: { theme?: string }) {
  return (
    <section className="py-20 px-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-12 text-white">Institutional Features</h2>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-xl font-bold text-amber-400 mb-2">AI Market Scanners</h3>
          <p className="text-slate-400 text-sm">Real-time sentiment and order-book imbalance detection across global exchanges.</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-xl font-bold text-amber-400 mb-2">Sovereign Vaults</h3>
          <p className="text-slate-400 text-sm">Cold-storage level custody with multi-sig approval workflows.</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-xl font-bold text-amber-400 mb-2">Advanced Liquidity</h3>
          <p className="text-slate-400 text-sm">Deep liquidity pools ensuring zero slippage on high-volume block trades.</p>
        </div>
      </div>
    </section>
  );
}
