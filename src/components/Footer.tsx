export default function Footer({ onNavigate }: any) {
  return (
    <footer className="py-12 border-t border-slate-800 bg-slate-950 px-6 text-center text-slate-500 text-sm">
      <div className="mb-4 flex items-center justify-center gap-6">
        <button onClick={() => onNavigate('home')} className="hover:text-white">Home</button>
        <button onClick={() => onNavigate('dashboard')} className="hover:text-white">Dashboard</button>
        <button onClick={() => onNavigate('showcase')} className="hover:text-white">Showcase</button>
      </div>
      <p>&copy; {new Date().getFullYear()} AVER Institutional Trading Systems. All rights reserved.</p>
    </footer>
  );
}
