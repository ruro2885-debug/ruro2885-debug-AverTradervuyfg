import fs from 'fs';

// 1. SupportCenterPage.tsx
let scp = fs.readFileSync('./src/components/SupportCenterPage.tsx', 'utf8');
scp = scp.replace(
  'export interface SupportMessage {',
  'export interface SupportMessage {\n  isAdmin?: boolean;\n  senderRole?: \'user\' | \'admin\';'
);
scp = scp.replace(
  'const isUser = ![\'Admin Agent\', \'Support Specialist\', \'Support Team\', \'AVER Specialist\', \'Admin\'].includes(msg.sender);',
  'const isAdmin = msg.isAdmin || msg.senderRole === \'admin\' || [\'Admin Agent\', \'Support Specialist\', \'Support Team\', \'AVER Specialist\', \'Admin\'].includes(msg.sender);\n                  const isUser = !isAdmin;'
);
fs.writeFileSync('./src/components/SupportCenterPage.tsx', scp);

// 2. AdminSupport.tsx
let ads = fs.readFileSync('./src/components/admin/views/AdminSupport.tsx', 'utf8');
ads = ads.replace(
  'export interface SupportMessage {',
  'export interface SupportMessage {\n  isAdmin?: boolean;\n  senderRole?: \'user\' | \'admin\';'
);
ads = ads.replace(
  'const adminMsg: SupportMessage = {',
  'const adminMsg: SupportMessage = {\n      isAdmin: true,\n      senderRole: \'admin\','
);
ads = ads.replace(
  'const isAdmin = msg.sender === \'AVER Specialist\' || msg.sender === \'Admin\';',
  'const isAdmin = msg.isAdmin || msg.senderRole === \'admin\' || msg.sender === \'AVER Specialist\' || msg.sender === \'Admin\' || msg.sender === \'Support Specialist\';'
);
fs.writeFileSync('./src/components/admin/views/AdminSupport.tsx', ads);

// 3. supportStore.ts
let ss = fs.readFileSync('./src/lib/supportStore.ts', 'utf8');
if (!ss.includes('isAdmin')) {
  ss = ss.replace(
    'export interface SupportMessage {',
    'export interface SupportMessage {\n  isAdmin?: boolean;\n  senderRole?: \'user\' | \'admin\';'
  );
  fs.writeFileSync('./src/lib/supportStore.ts', ss);
}

console.log("Messaging patches applied successfully.");
