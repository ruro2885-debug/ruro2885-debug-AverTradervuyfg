interface LoaderProps {
  theme?: string;
  onComplete?: () => void;
}

export default function Loader({ theme: _theme, onComplete: _onComplete }: LoaderProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold tracking-wider text-amber-500 uppercase">Loading AVER Terminal...</span>
      </div>
    </div>
  );
}
