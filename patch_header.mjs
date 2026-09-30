import fs from 'fs';

let content = fs.readFileSync('./src/components/admin/views/AdminSupport.tsx', 'utf8');

const oldHeader = `      {/* Top Header Bar */}
      <header className="shrink-0 bg-[#0F131C] border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <LifeBuoy className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              Support Terminal
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Live Hub
              </span>
            </h1>
          </div>
        </div>

        {/* Tab Selection & Metrics */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveTab('live'); setSelectedUserId(null); setSelectedTicketId(null); }}
            className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border \${
              activeTab === 'live' 
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-black' 
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
            }\`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Messages ({filteredLiveUsers.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('tickets'); setSelectedUserId(null); setSelectedTicketId(null); }}
            className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border \${
              activeTab === 'tickets' 
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-black' 
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
            }\`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tickets ({filteredTicketUsers.length})</span>
          </button>
        </div>
      </header>`;

const newHeader = `      {/* Top Header Bar */}
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
                : isDark ? 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
                : isDark ? 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }\`}
          >
            <Layers className="w-4 h-4" />
            <span>Tickets ({filteredTicketUsers.length})</span>
          </button>
        </div>
      </div>`;

content = content.replace(oldHeader, newHeader);
fs.writeFileSync('./src/components/admin/views/AdminSupport.tsx', content);
