import fs from 'fs';

let content = fs.readFileSync('./src/components/admin/views/AdminSupport.tsx', 'utf8');

const headerStart = content.indexOf('{/* Top Header Bar */}');
const headerEnd = content.indexOf('</header>') + '</header>'.length;

if (headerStart !== -1 && headerEnd !== -1) {
    const oldHeader = content.substring(headerStart, headerEnd);
    
    const newHeader = `{/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Institutional Admin Customer Support Workspace</h1>
          <p className={\`text-sm \${isDark ? 'text-slate-400' : 'text-slate-500'}\`}>
            Support Terminal
          </p>
        </div>

        {/* Tab Selection & Metrics */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveTab('live'); setSelectedUserId(null); setSelectedTicketId(null); }}
            className={\`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border \${
              activeTab === 'live' 
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-black' 
                : isDark ? 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }\`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Messages ({filteredLiveUsers.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('tickets'); setSelectedUserId(null); setSelectedTicketId(null); }}
            className={\`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border \${
              activeTab === 'tickets' 
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-black' 
                : isDark ? 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }\`}
          >
            <Layers className="w-4 h-4" />
            <span>Tickets ({filteredTicketUsers.length})</span>
          </button>
        </div>
      </div>`;

    content = content.substring(0, headerStart) + newHeader + content.substring(headerEnd);
    fs.writeFileSync('./src/components/admin/views/AdminSupport.tsx', content);
    console.log("Header replaced");
} else {
    console.log("Header not found");
}
