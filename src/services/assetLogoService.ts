/**
 * Asset Logo Caching and Preloading Service
 *
 * Provides high-performance image caching, in-flight request deduplication,
 * and preloading for asset logos without altering any real logos or generating approximations.
 */

class AssetLogoService {
  private loadedUrls = new Set<string>();
  private failedUrls = new Map<string, number>();
  private inFlightRequests = new Map<string, Promise<boolean>>();

  constructor() {
    // Restore previously verified loaded logos from sessionStorage if available
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('aver_cached_logo_urls');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            parsed.forEach(url => this.loadedUrls.add(url));
          }
        }
      } catch (e) {
        // Safe fallback
      }
    }
  }

  private persistCache() {
    if (typeof window !== 'undefined') {
      try {
        const arr = Array.from(this.loadedUrls).slice(-200);
        sessionStorage.setItem('aver_cached_logo_urls', JSON.stringify(arr));
      } catch (e) {
        // Ignore storage limits
      }
    }
  }

  isLoaded(url: string): boolean {
    return this.loadedUrls.has(url);
  }

  isFailed(url: string): boolean {
    const fails = this.failedUrls.get(url) || 0;
    return fails >= 2;
  }

  markLoaded(url: string) {
    this.loadedUrls.add(url);
    this.failedUrls.delete(url);
    this.persistCache();
  }

  markFailed(url: string) {
    const current = this.failedUrls.get(url) || 0;
    this.failedUrls.set(url, current + 1);
  }

  resetError(url: string) {
    this.failedUrls.delete(url);
  }

  preload(url: string): Promise<boolean> {
    if (!url) return Promise.resolve(false);
    if (this.loadedUrls.has(url)) return Promise.resolve(true);

    const fails = this.failedUrls.get(url) || 0;
    if (fails >= 2) return Promise.resolve(false);

    if (this.inFlightRequests.has(url)) {
      return this.inFlightRequests.get(url)!;
    }

    const promise = new Promise<boolean>((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      const img = new Image();
      img.referrerPolicy = 'no-referrer';

      img.onload = () => {
        this.markLoaded(url);
        this.inFlightRequests.delete(url);
        resolve(true);
      };

      img.onerror = () => {
        this.markFailed(url);
        this.inFlightRequests.delete(url);
        resolve(false);
      };

      img.src = url;
    });

    this.inFlightRequests.set(url, promise);
    return promise;
  }

  preloadMany(urls: string[]) {
    urls.forEach(url => {
      if (url && !this.loadedUrls.has(url)) {
        this.preload(url);
      }
    });
  }
}

export const assetLogoService = new AssetLogoService();

// Preload the most visible and heavily traded assets immediately on boot
if (typeof window !== 'undefined') {
  // Give initial UI render a tick before starting background preloads
  setTimeout(() => {
    const coreAssetUrls = [
      'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png', // BTC
      'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png', // ETH
      'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png', // SOL
      'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png', // XRP
      'https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png', // ADA
      'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png', // DOGE
      'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png', // USDT
      'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png', // USDC
      '/icons/apple.svg',
      '/icons/nvda.svg',
      '/icons/meta.svg',
      '/icons/amd.svg',
      '/icons/spy.svg',
      '/icons/qqq.svg',
      '/icons/arkk.svg'
    ];
    assetLogoService.preloadMany(coreAssetUrls);
  }, 100);
}
