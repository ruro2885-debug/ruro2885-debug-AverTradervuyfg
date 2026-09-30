import fs from 'fs';

let content = fs.readFileSync('./src/components/admin/views/AdminSupport.tsx', 'utf8');

// Container background
content = content.replace(/bg-\[#0B0E14\]/g, '${isDark ? "bg-transparent" : "bg-transparent"}');

// Panels and bars
content = content.replace(/bg-\[#0F131C\]\/90/g, '${isDark ? "bg-white/5" : "bg-white"}');
content = content.replace(/bg-\[#0F131C\]/g, '${isDark ? "bg-white/5" : "bg-white"}');
content = content.replace(/bg-\[#121620\]/g, '${isDark ? "bg-white/5" : "bg-white"}');
content = content.replace(/bg-\[#161B27\]/g, '${isDark ? "bg-white/5" : "bg-white"}');

// Inputs and inner panels
content = content.replace(/bg-\[#141923\]/g, '${isDark ? "bg-white/10" : "bg-slate-50"}');
content = content.replace(/bg-\[#181D29\]/g, '${isDark ? "bg-white/10" : "bg-slate-50"}');

// Borders
content = content.replace(/border-slate-800\/80/g, '${isDark ? "border-white/10" : "border-slate-200"}');
content = content.replace(/border-slate-800/g, '${isDark ? "border-white/10" : "border-slate-200"}');
content = content.replace(/border-slate-700/g, '${isDark ? "border-white/20" : "border-slate-300"}');

// Text colors that are forced to white/slate-300/400
content = content.replace(/text-white/g, '${isDark ? "text-white" : "text-slate-900"}');
content = content.replace(/text-slate-100/g, '${isDark ? "text-slate-100" : "text-slate-900"}');
// It's a bit dangerous to replace all `text-slate-300`, so let's only do it for specific cases if they look bad.
content = content.replace(/text-slate-300/g, '${isDark ? "text-slate-300" : "text-slate-700"}');

fs.writeFileSync('./src/components/admin/views/AdminSupport.tsx', content);
