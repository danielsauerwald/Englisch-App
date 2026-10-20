class WakeLockService {
  private wakeLockSentinel: any = null;
  private isRequested: boolean = false;

  public async acquire(): Promise<boolean> {
    this.isRequested = true;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      this.wakeLockSentinel.addEventListener('release', () => {
        this.wakeLockSentinel = null;
      });

      // Handle visibility changes to reacquire
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      return true;
    } catch (err) {
      console.warn('Screen WakeLock request failed:', err);
      return false;
    }
  }

  private handleVisibilityChange = async () => {
    if (this.isRequested && document.visibilityState === 'visible' && !this.wakeLockSentinel) {
      try {
        if ('wakeLock' in navigator) {
          this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Re-acquiring wake lock failed:', err);
      }
    }
  };

  public release(): void {
    this.isRequested = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch (e) {
        // Ignore
      }
      this.wakeLockSentinel = null;
    }
  }

  public isActive(): boolean {
    return Boolean(this.wakeLockSentinel);
  }
}

export const wakeLockService = new WakeLockService();
