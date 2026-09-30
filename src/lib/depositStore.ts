export const DEPOSITS_STORAGE_KEY = 'aver_admin_deposits_local';

export function getLocalDeposits(): any[] {
  try {
    const raw = localStorage.getItem(DEPOSITS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out fake hardcoded deposits if present
        const cleaned = parsed.filter(d => d && d.id !== 'DEP-USDT-ERC20' && d.amount !== 4754);
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(DEPOSITS_STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
  } catch (e) {
    console.warn("Failed to parse local deposits:", e);
  }

  return [];
}

export function saveLocalDeposit(deposit: any) {
  try {
    const current = getLocalDeposits();
    const cleanDeposit = {
      ...deposit,
      createdAt: typeof deposit.createdAt === 'string' ? deposit.createdAt : new Date().toISOString(),
      updatedAt: deposit.updatedAt || new Date().toISOString()
    };
    const map = new Map<string, any>();
    current.forEach(d => map.set(d.id, d));
    map.set(cleanDeposit.id, cleanDeposit);
    localStorage.setItem(DEPOSITS_STORAGE_KEY, JSON.stringify(Array.from(map.values())));
    window.dispatchEvent(new CustomEvent('deposit_updated', { detail: cleanDeposit.id }));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn("Local storage update notice:", e);
  }
}

export function updateLocalDeposit(id: string, updates: Partial<any>) {
  try {
    const current = getLocalDeposits();
    const map = new Map<string, any>();
    current.forEach(d => map.set(d.id, d));
    const existing = map.get(id);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      map.set(id, updated);
      localStorage.setItem(DEPOSITS_STORAGE_KEY, JSON.stringify(Array.from(map.values())));
      window.dispatchEvent(new CustomEvent('deposit_updated', { detail: id }));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.warn("Local storage update notice:", e);
  }
}

export function mergeDepositsWithLocal(firestoreDeposits: any[]): any[] {
  const localDeposits = getLocalDeposits();
  const map = new Map<string, any>();
  
  localDeposits.forEach(d => map.set(d.id, d));
  firestoreDeposits.forEach(d => {
    const existing = map.get(d.id);
    if (existing) {
      const fsTime = new Date(d.updatedAt || d.timestamp || 0).getTime();
      const locTime = new Date(existing.updatedAt || existing.timestamp || 0).getTime();
      map.set(d.id, fsTime > locTime ? d : existing);
    } else {
      map.set(d.id, {
        ...d,
        createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString()
      });
    }
  });
  
  return Array.from(map.values()).sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
}
