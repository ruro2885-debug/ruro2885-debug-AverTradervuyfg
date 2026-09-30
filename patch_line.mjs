import fs from 'fs';

let content = fs.readFileSync('./src/components/admin/views/AdminSupport.tsx', 'utf8');

content = content.replace(
    '<div className={`space-y-4 sm:space-y-8 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 h-[calc(100vh-8rem)] flex flex-col ${isDark ? "${isDark ? \\"text-slate-100\\" : \\"text-slate-900\\"}" : "text-slate-900"}`}>',
    '<div className={`space-y-4 sm:space-y-8 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 h-[calc(100vh-8rem)] flex flex-col ${isDark ? "text-slate-100" : "text-slate-900"}`}>'
);

fs.writeFileSync('./src/components/admin/views/AdminSupport.tsx', content);
