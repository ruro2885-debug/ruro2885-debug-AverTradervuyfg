import fs from 'fs';
let content = fs.readFileSync('./src/components/admin/views/AdminSupport.tsx', 'utf8');

content = content.replace(/bg-slate-800\/80 hover:bg-slate-700/g, '${isDark ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"}');
fs.writeFileSync('./src/components/admin/views/AdminSupport.tsx', content);
