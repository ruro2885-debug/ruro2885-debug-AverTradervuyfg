export const safeStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, val: string) => {
    try {
      localStorage.setItem(key, val);
    } catch {}
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
};
