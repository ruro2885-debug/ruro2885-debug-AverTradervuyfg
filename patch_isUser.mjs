import fs from 'fs';

const content = fs.readFileSync('./src/components/SupportCenterPage.tsx', 'utf8');

let updated = content.replace(
  "const isUser = msg.sender !== 'Admin Agent' && msg.sender !== 'Support Specialist' && msg.sender !== 'Support Team';",
  "const isUser = !['Admin Agent', 'Support Specialist', 'Support Team', 'AVER Specialist', 'Admin'].includes(msg.sender);"
);

updated = updated.replace(/\{\/\* Delivery Status \*\/\}\s*\{isUser && \(\s*<div className="flex items-center gap-1 mt-1 px-1 text-\[9px\] text-emerald-400 font-mono font-bold">\s*<span>✓✓ Delivered<\/span>\s*<span>• Read<\/span>\s*<\/div>\s*\)\}/g, '');

fs.writeFileSync('./src/components/SupportCenterPage.tsx', updated);
