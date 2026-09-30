export default function Stats({ theme: _theme }: { theme?: string }) {
  return (
    <section className="py-16 bg-amber-500/5 border-t border-b border-amber-500/20">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div>
          <div className="text-4xl font-black text-amber-400 mb-1">$42.8B+</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Trading Volume</div>
        </div>
        <div>
          <div className="text-4xl font-black text-amber-400 mb-1">0.1ms</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Execution Speed</div>
        </div>
        <div>
          <div className="text-4xl font-black text-amber-400 mb-1">99.99%</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Uptime SLA</div>
        </div>
        <div>
          <div className="text-4xl font-black text-amber-400 mb-1">180+</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Global Institutions</div>
        </div>
      </div>
    </section>
  );
}
