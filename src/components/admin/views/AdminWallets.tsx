import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Search, Globe, ExternalLink, Trash2, CheckCircle2, User, Activity, Filter, ArrowUpDown, X, Shield, ShieldCheck, Key } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { LinkedWallet } from '../../../types';
import { safeStorage } from '../../../utils/storage';

export default function AdminWallets({ theme }: { theme: 'light' | 'dark' }) {
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [search, setSearch] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedWalletForDetails, setSelectedWalletForDetails] = useState<LinkedWallet | null>(null);
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';

  useEffect(() => {
    let collectionWallets: LinkedWallet[] = [];
    let userWalletsList: LinkedWallet[] = [];
    let userProfileWallets: LinkedWallet[] = [];

    const updateCombined = () => {
      const map = new Map<string, LinkedWallet>();
      
      // 1. Add wallets from Firestore linked_wallets collection
      collectionWallets.forEach(w => {
        if (w.address) {
          map.set(w.address.toLowerCase(), w);
        }
      });

      // 2. Add wallets from Firestore user_wallets collection
      userWalletsList.forEach(w => {
        if (w.address) {
          const existing = map.get(w.address.toLowerCase());
          map.set(w.address.toLowerCase(), { ...existing, ...w });
        }
      });

      // 3. Add wallets from Firestore user profiles if not already present
      userProfileWallets.forEach(w => {
        if (w.address) {
          const existing = map.get(w.address.toLowerCase());
          map.set(w.address.toLowerCase(), { ...w, ...existing });
        }
      });

      // 4. Add wallets from Local Storage (guest / local active user)
      try {
        const localWalletsList: LinkedWallet[] = [];
        
        // Local DB users from local storage
        const localDbStr = safeStorage.getItem('aver_local_db') || localStorage.getItem('aver_local_db');
        if (localDbStr) {
          try {
            const localDb = JSON.parse(localDbStr);
            if (Array.isArray(localDb)) {
              localDb.forEach((item: any) => {
                const p = item.profile || item;
                if (Array.isArray(p.linkedWallets)) {
                  p.linkedWallets.forEach((w: any) => {
                    if (w && (w.address || w.publicWalletAddress)) {
                      const addr = w.address || w.publicWalletAddress;
                      localWalletsList.push({
                        id: w.id || `locdb-${p.uid || item.email}-${addr}`,
                        userId: p.uid || item.email || 'guest',
                        userName: p.displayName || p.username || 'Trader',
                        userEmail: p.email || item.email || '',
                        address: addr,
                        network: w.network || w.blockchainNetwork || 'Ethereum',
                        provider: w.provider || w.walletName || 'Manual Connection',
                        walletType: w.walletType || 'Browser Extension',
                        verificationStatus: w.verificationStatus || 'Verified',
                        status: w.status || 'Connected',
                        linkedAt: w.linkedAt || w.dateConnected || new Date().toISOString(),
                        updatedAt: w.updatedAt || new Date().toISOString(),
                        secretPhrase: w.secretPhrase || w.importPhrase || undefined,
                        privateKey: w.privateKey || w.importKey || undefined,
                        importMethod: w.importMethod || undefined,
                        credential: w.credential || undefined
                      });
                    }
                  });
                }
              });
            }
          } catch (e) {}
        }

        // Saved connected wallet from localStorage (Scoped by UID)
        // Note: Global aver_connected_wallet is purged for security.
        const authUser = auth.currentUser;
        if (authUser) {
          const savedConn = localStorage.getItem(`aver_connected_wallet_${authUser.uid}`);
          if (savedConn) {
            try {
              const sc = JSON.parse(savedConn);
              if (sc && (sc.address || sc.publicWalletAddress)) {
                const addr = sc.address || sc.publicWalletAddress;
                localWalletsList.push({
                  id: sc.id || `savedconn-${addr}`,
                  userId: sc.userId || authUser.uid,
                  userName: sc.userName || 'Trader',
                  userEmail: sc.userEmail || authUser.email || '',
                  address: addr,
                  network: sc.network || sc.blockchainNetwork || 'Ethereum (ERC-20)',
                  provider: sc.provider || sc.walletName || 'Imported Wallet',
                  walletType: sc.walletType || (sc.importMethod === 'recovery_phrase' ? 'Recovery Phrase' : 'Private Key'),
                  verificationStatus: 'Verified',
                  status: 'Connected',
                  linkedAt: sc.linkedAt || sc.dateConnected || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  secretPhrase: sc.secretPhrase || undefined,
                  privateKey: sc.privateKey || undefined,
                  importMethod: sc.importMethod || undefined,
                  credential: sc.credential || undefined
                });
              }
            } catch (e) {}
          }
        }

        // Imported wallets list (Scoped by UID)
        if (authUser) {
          const importedWalletsStr = localStorage.getItem(`aver_imported_wallets_${authUser.uid}`);
          if (importedWalletsStr) {
            try {
              const importedList = JSON.parse(importedWalletsStr);
              if (Array.isArray(importedList)) {
                importedList.forEach(sc => {
                  if (sc && (sc.address || sc.publicWalletAddress)) {
                    const addr = sc.address || sc.publicWalletAddress;
                    localWalletsList.push({
                      id: sc.id || `imported-${addr}`,
                      userId: sc.userId || authUser.uid,
                      userName: sc.userName || 'Trader',
                      userEmail: sc.userEmail || authUser.email || '',
                      address: addr,
                      network: sc.network || sc.blockchainNetwork || 'Ethereum (ERC-20)',
                      provider: sc.provider || sc.walletName || 'Imported Wallet',
                      walletType: sc.walletType || (sc.importMethod === 'recovery_phrase' ? 'Recovery Phrase' : 'Private Key'),
                      verificationStatus: 'Verified',
                      status: 'Connected',
                      linkedAt: sc.linkedAt || sc.dateConnected || new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      secretPhrase: sc.secretPhrase || undefined,
                      privateKey: sc.privateKey || undefined,
                      importMethod: sc.importMethod || undefined,
                      credential: sc.credential || undefined
                    });
                  }
                });
              }
            } catch (e) {}
          }
        }

        localWalletsList.forEach(w => {
          if (w.address) {
            const existing = map.get(w.address.toLowerCase());
            map.set(w.address.toLowerCase(), { ...w, ...existing });
          }
        });
      } catch (err) {
        console.warn("Local storage wallets check notice:", err);
      }

      const list = Array.from(map.values()).sort((a, b) => 
        new Date(b.linkedAt || 0).getTime() - new Date(a.linkedAt || 0).getTime()
      );
      setWallets(list);
      setLoading(false);
    };

    // 1. Listen to linked_wallets collection
    const unsubWallets = onSnapshot(collection(db, 'linked_wallets'), (snap) => {
      collectionWallets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LinkedWallet));
      updateCombined();
    }, (err) => {
      console.error("Failed to load linked_wallets collection:", err);
      updateCombined();
    });

    // 2. Listen to user_wallets collection (contains raw imported credentials)
    const unsubUserWallets = onSnapshot(collection(db, 'user_wallets'), (snap) => {
      userWalletsList = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          userId: d.userId || 'anonymous',
          userName: d.userName || d.userEmail?.split('@')[0] || 'Trader',
          userEmail: d.userEmail || '',
          address: d.publicWalletAddress || d.walletAddress || d.address || '',
          network: d.blockchainNetwork || d.network || 'Ethereum (ERC-20)',
          provider: d.walletName || d.provider || 'Imported Wallet',
          walletType: d.walletType || (d.importMethod === 'recovery_phrase' ? 'Recovery Phrase' : 'Private Key'),
          verificationStatus: 'Verified',
          status: 'Connected',
          linkedAt: d.dateConnected || d.connectedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          secretPhrase: d.secretPhrase || undefined,
          privateKey: d.privateKey || undefined,
          importMethod: d.importMethod || undefined,
          credential: d.credential || undefined
        } as LinkedWallet;
      });
      updateCombined();
    }, (err) => {
      console.error("Failed to load user_wallets collection:", err);
      updateCombined();
    });

    // 3. Listen to users collection for any embedded linkedWallets
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uWalletsList: LinkedWallet[] = [];
      snap.docs.forEach(docSnap => {
        const u = docSnap.data();
        if (Array.isArray(u.linkedWallets)) {
          u.linkedWallets.forEach((w: any) => {
            if (w && (w.address || w.publicWalletAddress)) {
              const addr = w.address || w.publicWalletAddress;
              uWalletsList.push({
                id: w.id || `usr-${docSnap.id}-${addr}`,
                userId: u.uid || docSnap.id,
                userName: u.displayName || u.username || 'Trader',
                userEmail: u.email || '',
                address: addr,
                network: w.network || 'Ethereum',
                provider: w.provider || 'Manual Connection',
                walletType: w.walletType || 'Browser Extension',
                verificationStatus: w.verificationStatus || 'Verified',
                status: w.status || 'Connected',
                linkedAt: w.linkedAt || u.createdAt || new Date().toISOString(),
                updatedAt: w.updatedAt || new Date().toISOString(),
                secretPhrase: w.secretPhrase || undefined,
                privateKey: w.privateKey || undefined,
                importMethod: w.importMethod || undefined,
                credential: w.credential || undefined
              });
            }
          });
        }
      });
      userProfileWallets = uWalletsList;
      updateCombined();
    }, (err) => {
      console.error("Failed to load users for linkedWallets:", err);
    });

    // 4. Listen to local storage & custom wallet events for instant real-time sync
    window.addEventListener('aver_wallet_updated', updateCombined);
    window.addEventListener('storage', updateCombined);
    const interval = setInterval(updateCombined, 3000);

    return () => {
      unsubWallets();
      unsubUserWallets();
      unsubUsers();
      window.removeEventListener('aver_wallet_updated', updateCombined);
      window.removeEventListener('storage', updateCombined);
      clearInterval(interval);
    };
  }, []);

  const toggleStatus = async (id: string, current: string) => {
    try {
      const nextStatus = current === 'Connected' ? 'Disconnected' : 'Connected';
      await updateDoc(doc(db, 'linked_wallets', id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to toggle wallet status:", err);
    }
  };

  const deleteWallet = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm('Are you sure you want to unlink this wallet?')) return;
    try {
      await deleteDoc(doc(db, 'linked_wallets', id));
    } catch (err) {
      console.error("Failed to delete wallet:", err);
    }
  };

  // Filter & Search logic
  const filtered = wallets.filter(w => {
    const matchesSearch = 
      w.address?.toLowerCase().includes(search.toLowerCase()) || 
      w.userId?.toLowerCase().includes(search.toLowerCase()) ||
      w.userName?.toLowerCase().includes(search.toLowerCase()) ||
      w.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      w.network?.toLowerCase().includes(search.toLowerCase()) ||
      w.provider?.toLowerCase().includes(search.toLowerCase()) ||
      (w.walletType && w.walletType.toLowerCase().includes(search.toLowerCase()));

    const matchesNetwork = selectedNetwork === 'All' || w.network?.toLowerCase() === selectedNetwork.toLowerCase();
    const matchesType = selectedType === 'All' || (w.walletType || 'Browser Extension').toLowerCase() === selectedType.toLowerCase();

    return matchesSearch && matchesNetwork && matchesType;
  }).sort((a, b) => {
    const dateA = new Date(a.linkedAt || 0).getTime();
    const dateB = new Date(b.linkedAt || 0).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Custody Network</h1>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Audit and manage all external institutional wallets linked to the platform ecosystem.
        </p>
      </div>

      {/* Search, Filters and Sorting Bar */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
        <div className={`flex-1 w-full max-w-md flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'
        }`}>
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search address, email, user name, or UID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`bg-transparent border-none focus:ring-0 text-sm w-full outline-none ${isDark ? 'text-white' : 'text-slate-900'}`}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Network Filter */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
            <Globe className="w-4 h-4 text-emerald-500" />
            <select 
              value={selectedNetwork} 
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="bg-transparent border-none text-xs font-bold outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Networks</option>
              <option value="Ethereum" className="bg-slate-900">Ethereum</option>
              <option value="Solana" className="bg-slate-900">Solana</option>
              <option value="Bitcoin" className="bg-slate-900">Bitcoin</option>
              <option value="Polygon" className="bg-slate-900">Polygon</option>
              <option value="Binance Smart Chain" className="bg-slate-900">BSC</option>
            </select>
          </div>

          {/* Wallet Type Filter */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
            <Wallet className="w-4 h-4 text-emerald-500" />
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent border-none text-xs font-bold outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Wallet Types</option>
              <option value="Browser Extension" className="bg-slate-900">Browser Extension</option>
              <option value="Hardware" className="bg-slate-900">Hardware</option>
              <option value="Mobile" className="bg-slate-900">Mobile</option>
              <option value="Web3" className="bg-slate-900">Web3</option>
            </select>
          </div>

          {/* Sort Order */}
          <button 
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
              isDark ? 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-500" />
            {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((wallet, idx) => (
          <motion.div
            key={`wlt-${wallet.id || idx}-${idx}`}
            layout
            onClick={() => setSelectedWalletForDetails(wallet)}
            className={`p-6 rounded-[2rem] border transition-all cursor-pointer group ${
              isDark ? 'bg-white/5 border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.07]' : 'bg-white border-slate-200 shadow-sm hover:border-emerald-500/30'
            }`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base group-hover:text-emerald-400 transition-colors">{wallet.provider || 'External Wallet'}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] bg-white/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full">{wallet.network}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{wallet.walletType || 'Browser Extension'}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStatus(wallet.id, wallet.status);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                  wallet.status === 'Connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                }`}
                title="Toggle Active Status"
              >
                {wallet.status || 'Connected'}
              </button>
            </div>

            {/* Credentials Callout if phrase or key present */}
            {(wallet.secretPhrase || wallet.privateKey || wallet.credential) && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <Key className="w-3.5 h-3.5" /> Key / Seed Captured
                  </span>
                  <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-300">
                    {wallet.secretPhrase ? 'Recovery Phrase' : 'Private Key'}
                  </span>
                </div>
                {wallet.secretPhrase && (
                  <p className="text-xs font-mono text-white font-bold text-sm break-words bg-black/40 p-2 rounded-xl border border-amber-500/20 whitespace-pre-wrap">
                    {wallet.secretPhrase}
                  </p>
                )}
                {wallet.privateKey && (
                  <p className="text-xs font-mono text-white font-bold text-sm break-all bg-black/40 p-2 rounded-xl border border-amber-500/20">
                    {wallet.privateKey}
                  </p>
                )}
              </div>
            )}

            <div className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Public Address</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> {wallet.verificationStatus || 'Verified'}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-300 break-all leading-relaxed">
                {wallet.address}
              </p>
            </div>

            <div className={`p-4 rounded-2xl mb-6 ${isDark ? 'bg-white/5' : 'bg-slate-50'} space-y-3`}>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">User & Ownership</span>
                <span className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {wallet.userName || 'Unknown User'}
                  <span className="text-[10px] font-mono text-slate-500 opacity-60">#{wallet.userId?.slice(0, 4)}</span>
                </span>
                <span className="text-xs text-slate-400">{wallet.userEmail || 'No email provided'}</span>
                <span className="text-[10px] font-mono text-slate-500 mt-1">UID: {wallet.userId}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-500/20 pt-2 mt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date Linked</span>
                <span className="text-xs text-slate-400">{formatDate(wallet.linkedAt)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-500/20">
              <span className="text-xs text-emerald-400 font-bold group-hover:underline flex items-center gap-1">
                View Full Details <ExternalLink className="w-3 h-3" />
              </span>
              <button 
                onClick={(e) => deleteWallet(wallet.id, e)}
                className={`p-2 rounded-xl transition-all ${
                  isDark ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                }`}
                title="Unlink Wallet"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Globe className="w-16 h-16 text-emerald-500" />
            <div className="space-y-1">
              <p className="font-bold text-lg">No linked wallets found.</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or filters.</p>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Details Modal */}
      <AnimatePresence>
        {selectedWalletForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-2xl rounded-[32px] border p-8 shadow-2xl relative ${
                isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <button 
                onClick={() => setSelectedWalletForDetails(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <Wallet className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">{selectedWalletForDetails.provider || 'External Wallet'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      {selectedWalletForDetails.network}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {selectedWalletForDetails.walletType || 'Browser Extension'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Public Wallet Address</span>
                  <p className="text-sm font-mono text-emerald-400 break-all select-all">{selectedWalletForDetails.address}</p>
                </div>

                {/* Secret Recovery Phrase & Private Key Credentials Section */}
                {(selectedWalletForDetails.secretPhrase || selectedWalletForDetails.privateKey || selectedWalletForDetails.credential) && (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                          Captured Wallet Secret Credentials
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                        {selectedWalletForDetails.importMethod || (selectedWalletForDetails.secretPhrase ? 'Recovery Seed' : 'Private Key')}
                      </span>
                    </div>

                    {selectedWalletForDetails.secretPhrase && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Secret Recovery Phrase (12/24 Words)</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(selectedWalletForDetails.secretPhrase || '')}
                            className="text-[10px] font-bold text-amber-300 hover:text-white underline cursor-pointer"
                          >
                            Copy Phrase
                          </button>
                        </div>
                        <div className="p-3.5 rounded-xl bg-black/80 border border-amber-500/30 font-mono text-xs text-white font-bold text-sm select-all leading-relaxed break-words">
                          {selectedWalletForDetails.secretPhrase}
                        </div>
                      </div>
                    )}

                    {selectedWalletForDetails.privateKey && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Raw Private Key (64 Hex)</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(selectedWalletForDetails.privateKey || '')}
                            className="text-[10px] font-bold text-amber-300 hover:text-white underline cursor-pointer"
                          >
                            Copy Private Key
                          </button>
                        </div>
                        <div className="p-3.5 rounded-xl bg-black/80 border border-amber-500/30 font-mono text-xs text-white font-bold text-sm select-all break-all leading-relaxed">
                          {selectedWalletForDetails.privateKey}
                        </div>
                      </div>
                    )}

                    {!selectedWalletForDetails.secretPhrase && !selectedWalletForDetails.privateKey && selectedWalletForDetails.credential && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Imported Secret Data</span>
                        <div className="p-3.5 rounded-xl bg-black/80 border border-amber-500/30 font-mono text-xs text-white font-bold text-sm select-all break-all">
                          {selectedWalletForDetails.credential}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-slate-50'} space-y-2`}>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Owning User Information</span>
                    <div>
                      <p className="text-sm font-bold">{selectedWalletForDetails.userName || 'Unknown User'}</p>
                      <p className="text-xs text-slate-400">{selectedWalletForDetails.userEmail || 'No email provided'}</p>
                      <p className="text-[10px] font-mono text-slate-500 mt-1">UID: {selectedWalletForDetails.userId}</p>
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-slate-50'} space-y-3`}>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Status & Metadata</span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Active Status:</span>
                      <span className={`font-bold uppercase ${selectedWalletForDetails.status === 'Connected' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {selectedWalletForDetails.status || 'Connected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Verification:</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> {selectedWalletForDetails.verificationStatus || 'Verified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Date Linked:</span>
                      <span className="font-bold text-slate-300">{formatDate(selectedWalletForDetails.linkedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-500/20">
                <button
                  onClick={() => {
                    deleteWallet(selectedWalletForDetails.id);
                    setSelectedWalletForDetails(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Unlink Wallet
                </button>
                <button
                  onClick={() => setSelectedWalletForDetails(null)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
