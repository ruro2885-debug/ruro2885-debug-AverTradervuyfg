import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Search, Plus, Send, Trash2, Clock, Globe, ShieldAlert, Info, Megaphone } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface Notification {
  id: string;
  userId: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export default function AdminNotifications({ theme }: { theme: 'light' | 'dark' }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newNotif, setNewNotif] = useState({
    title: '',
    body: '',
    category: 'System',
    priority: 'medium',
    target: 'all'
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSend = async () => {
    if (!newNotif.title || !newNotif.body) return;
    
    try {
      await addDoc(collection(db, 'notifications'), {
        ...newNotif,
        userId: newNotif.target === 'all' ? 'GLOBAL' : 'SPECIFIC_USER',
        createdAt: new Date().toISOString(),
        read: false,
        archived: false,
        pinned: false
      });
      setShowCreate(false);
      setNewNotif({ title: '', body: '', category: 'System', priority: 'medium', target: 'all' });
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const filtered = notifications.filter(n => 
    n.title?.toLowerCase().includes(search.toLowerCase()) || 
    n.body?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Notification Center</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Broadcast real-time institutional alerts and global system updates.
          </p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
        >
          <Plus className="w-5 h-5" />
          Broadcast Alert
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className={`flex-1 max-w-md flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'
        }`}>
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search sent alerts..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((item, idx) => (
          <motion.div
            key={`notif-${item.id || idx}-${idx}`}
            layout
            className={`p-6 rounded-[2rem] border flex items-center gap-6 transition-all ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className={`p-4 rounded-2xl flex-shrink-0 ${
              item.priority === 'critical' ? 'bg-rose-500/10 text-rose-500' :
              item.priority === 'high' ? 'bg-amber-500/10 text-amber-500' :
              'bg-blue-500/10 text-blue-500'
            }`}>
              {item.category === 'System' ? <ShieldAlert className="w-6 h-6" /> : 
               item.category === 'Market' ? <Megaphone className="w-6 h-6" /> :
               <Info className="w-6 h-6" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="font-bold text-base truncate">{item.title}</h4>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                  isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  {item.category}
                </span>
              </div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} line-clamp-1`}>{item.body}</p>
            </div>

            <div className="flex items-center gap-6 flex-shrink-0">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sent To</span>
                <span className="text-xs font-black">{item.userId === 'GLOBAL' ? 'All Users' : 'Targeted'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</span>
                <span className="text-xs font-black">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
              <button 
                onClick={() => deleteNotification(item.id)}
                className={`p-2.5 rounded-xl transition-all ${
                  isDark ? 'hover:bg-rose-500/10 hover:text-rose-500 text-slate-500' : 'hover:bg-rose-50 hover:text-rose-500 text-slate-400'
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-lg p-8 rounded-[2.5rem] border shadow-2xl ${
              isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black tracking-tight">Compose Broadcast</h3>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 opacity-50 hover:opacity-100">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Alert Title</label>
                <input 
                  type="text" 
                  value={newNotif.title}
                  onChange={(e) => setNewNotif({...newNotif, title: e.target.value})}
                  placeholder="e.g., System Maintenance Scheduled"
                  className={`w-full bg-transparent border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
                    isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Category</label>
                  <select 
                    value={newNotif.category}
                    onChange={(e) => setNewNotif({...newNotif, category: e.target.value})}
                    className={`w-full bg-transparent border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
                      isDark ? 'border-white/10 text-white bg-slate-900' : 'border-slate-200 text-slate-900 bg-white'
                    }`}
                  >
                    <option value="System">System</option>
                    <option value="Market">Market</option>
                    <option value="Security">Security</option>
                    <option value="Promo">Promotion</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Priority</label>
                  <select 
                    value={newNotif.priority}
                    onChange={(e) => setNewNotif({...newNotif, priority: e.target.value as any})}
                    className={`w-full bg-transparent border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
                      isDark ? 'border-white/10 text-white bg-slate-900' : 'border-slate-200 text-slate-900 bg-white'
                    }`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Alert Content</label>
                <textarea 
                  value={newNotif.body}
                  onChange={(e) => setNewNotif({...newNotif, body: e.target.value})}
                  placeholder="Describe the institutional update in detail..."
                  className={`w-full bg-transparent border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all h-32 resize-none ${
                    isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => setShowCreate(false)}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                    isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSend}
                  className="flex-[2] py-4 rounded-2xl bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Broadcast Alert
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
