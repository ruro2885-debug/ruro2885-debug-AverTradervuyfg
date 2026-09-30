import fs from 'fs';
let content = fs.readFileSync('./src/components/admin/views/AdminSupport.tsx', 'utf8');

content = content.replace(
  '  return (\n    <div className="w-full min-h-screen bg-[#0B0E14] text-slate-100 font-sans flex flex-col overflow-hidden relative selection:bg-emerald-500/30 selection:text-emerald-200">',
  '  const isDark = theme === \'dark\';\n\n  return (\n    <div className={`space-y-4 sm:space-y-8 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 h-[calc(100vh-8rem)] flex flex-col ${isDark ? "text-slate-100" : "text-slate-900"}`}>'
);

fs.writeFileSync('./src/components/admin/views/AdminSupport.tsx', content);
