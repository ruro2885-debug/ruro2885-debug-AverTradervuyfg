export default function Navbar({ onNavigate, onShowcase, onAdminAccess }: any) {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
        <span className="text-2xl font-black bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">AVER</span>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate('dashboard')} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">Dashboard</button>
        <button onClick={onShowcase} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">Showcase</button>
        <button onClick={onAdminAccess} className="px-3 py-1.5 bg-slate-800 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/30">Admin</button>
        <button onClick={() => onNavigate('auth')} className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded-xl text-sm shadow-lg">Sign In</button>
      </div>
    </nav>
  );
}
