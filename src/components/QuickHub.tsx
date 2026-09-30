export default function QuickHub({ onPreferenceChange }: any) {
  return (
    <div className="fixed bottom-6 right-6 z-40 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl flex items-center gap-3">
      <span className="text-xs text-slate-400">Quick Settings:</span>
      <button onClick={() => onPreferenceChange('theme', 'dark')} className="px-3 py-1 bg-slate-800 text-xs text-amber-400 rounded-lg">Dark</button>
      <button onClick={() => onPreferenceChange('theme', 'light')} className="px-3 py-1 bg-slate-800 text-xs text-slate-300 rounded-lg">Light</button>
    </div>
  );
}
