import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History, Search, Shield, Clock, Terminal, Globe, User, Filter } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  details: string;
  timestamp: string;
  ip: string;
  device: string;
}

export default function AdminAuditLogs({ theme }: { theme: 'light' | 'dark' }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';

  useEffect(() => {
    const q = query(collection(db, 'admin_audit_logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
      setLogs(records);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = logs.filter(l => 
    l.adminEmail?.toLowerCase().includes(search.toLowerCase()) || 
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.resource?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Audit Trail</h1>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Immutable ledger of all administrative actions and system modifications.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className={`flex-1 max-w-md flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'
        }`}>
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search audit records..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm w-full"
          />
        </div>
        <button className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold border transition-all ${
          isDark ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
        }`}>
          <Filter className="w-4 h-4" />
          Log Filters
        </button>
      </div>

      <div className={`rounded-[2.5rem] border overflow-hidden ${
        isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin / Identity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action / Resource</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metadata</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((log, idx) => (
                <tr key={`log-${log.id || idx}-${idx}`} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-emerald-500 border border-white/5">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{log.adminEmail}</span>
                        <span className="text-[10px] font-mono text-slate-500">{log.adminId}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white">{log.action}</span>
                      <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{log.resource}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                        <Globe className="w-3 h-3" />
                        {log.ip || '127.0.0.1'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                        <Terminal className="w-3 h-3" />
                        {log.device || 'Admin Terminal'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && !loading && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <History className="w-16 h-16" />
            <div className="space-y-1">
              <p className="font-bold">Audit trail is currently clean</p>
              <p className="text-xs">All administrative actions will be logged here for compliance.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
