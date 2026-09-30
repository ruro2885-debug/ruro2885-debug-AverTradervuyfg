import fs from 'fs';

let content = fs.readFileSync('./src/components/admin/views/AdminSupport.tsx', 'utf8');

// Convert all className="..." to className={`...`} if they contain a dark mode class we want to replace
const classRegex = /className="([^"]+)"/g;
content = content.replace(classRegex, (match, p1) => {
    if (
        p1.includes('bg-[#') || 
        p1.includes('border-slate-800') ||
        p1.includes('border-slate-700') ||
        p1.includes('text-white') ||
        p1.includes('text-slate-100') ||
        p1.includes('text-slate-300') ||
        p1.includes('text-slate-400')
    ) {
        return `className={\`${p1}\`}`;
    }
    return match;
});

// Now replace the classes
content = content.replace(/bg-\[#0B0E14\]/g, '${isDark ? "bg-transparent" : "bg-transparent"}');
content = content.replace(/bg-\[#0F131C\]\/90/g, '${isDark ? "bg-white/5" : "bg-white"}');
content = content.replace(/bg-\[#0F131C\]/g, '${isDark ? "bg-white/5" : "bg-white"}');
content = content.replace(/bg-\[#121620\]/g, '${isDark ? "bg-white/5" : "bg-white"}');
content = content.replace(/bg-\[#161B27\]/g, '${isDark ? "bg-white/5" : "bg-white"}');
content = content.replace(/bg-\[#141923\]/g, '${isDark ? "bg-white/10" : "bg-slate-50"}');
content = content.replace(/bg-\[#181D29\]/g, '${isDark ? "bg-white/10" : "bg-slate-50"}');

content = content.replace(/border-slate-800\/80/g, '${isDark ? "border-white/10" : "border-slate-200"}');
content = content.replace(/border-slate-800/g, '${isDark ? "border-white/10" : "border-slate-200"}');
content = content.replace(/border-slate-700/g, '${isDark ? "border-white/20" : "border-slate-300"}');

content = content.replace(/text-white/g, '${isDark ? "text-white" : "text-slate-900"}');
content = content.replace(/text-slate-100/g, '${isDark ? "text-slate-100" : "text-slate-900"}');
// Only replace slate-300/400 if it feels necessary. Let's do it anyway.
content = content.replace(/text-slate-300/g, '${isDark ? "text-slate-300" : "text-slate-700"}');
content = content.replace(/text-slate-400/g, '${isDark ? "text-slate-400" : "text-slate-500"}');

fs.writeFileSync('./src/components/admin/views/AdminSupport.tsx', content);
