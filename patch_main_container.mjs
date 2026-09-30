import fs from 'fs';

let content = fs.readFileSync('./src/components/admin/views/AdminSupport.tsx', 'utf8');

const mainStartStr = '      <main className={`flex-1 flex flex-col overflow-hidden ${isDark ? "bg-transparent" : "bg-transparent"} relative`}>';
const newMainStartStr = '      <main className={`flex-1 flex flex-col overflow-hidden rounded-[2rem] border ${isDark ? "bg-white/5 border-white/5" : "bg-white border-slate-200 shadow-sm"} relative`}>';

content = content.replace(mainStartStr, newMainStartStr);

fs.writeFileSync('./src/components/admin/views/AdminSupport.tsx', content);
