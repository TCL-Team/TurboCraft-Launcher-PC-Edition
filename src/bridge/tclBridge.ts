declare global {
  interface Window {
    tclElectron?: {
      isElectron: boolean;
      rpc: <T = any>(method: string, args?: Record<string, unknown>) => Promise<T>;
      windowAction: (action: 'minimize' | 'maximize' | 'close') => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      openFolder: (relPath?: string) => Promise<void>;
      onEvent: (eventName: string, callback: (payload: any) => void) => () => void;
    };
  }
}

type EventCallback = (payload: any) => void;

class TclClientBridge {
  private listeners = new Map<string, Set<EventCallback>>();
  private sse: EventSource | null = null;

  get isElectron(): boolean {
    return Boolean(window.tclElectron?.isElectron);
  }

  constructor() {
    if (!this.isElectron && typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
      this.connectSse();
    }
  }

  private connectSse() {
    try {
      const es = new EventSource('/api/events');
      this.sse = es;
      for (const evt of ['state:changed', 'task:update', 'log:line', 'game:exit']) {
        es.addEventListener(evt, (e) => {
          try {
            const parsed = JSON.parse((e as MessageEvent).data);
            this.emitLocal(evt, parsed);
          } catch {
            this.emitLocal(evt, {});
          }
        });
      }
    } catch {
      // ignore
    }
  }

  private emitLocal(evt: string, payload: any) {
    const set = this.listeners.get(evt);
    if (!set) return;
    for (const fn of set) fn(payload);
  }

  on(eventName: 'state:changed' | 'task:update' | 'log:line' | 'game:exit', cb: EventCallback): () => void {
    if (window.tclElectron) {
      return window.tclElectron.onEvent(eventName, cb);
    }
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(cb);
    return () => {
      this.listeners.get(eventName)?.delete(cb);
    };
  }

  async rpc<T = any>(method: string, args?: Record<string, unknown>): Promise<T> {
    if (window.tclElectron) {
      return window.tclElectron.rpc<T>(method, args);
    }
    const res = await fetch('/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args: args || {} }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || `RPC ${method} failed`);
    }
    return json.result as T;
  }

  async windowAction(action: 'minimize' | 'maximize' | 'close'): Promise<void> {
    if (window.tclElectron) {
      await window.tclElectron.windowAction(action);
    }
  }

  async openExternal(url: string): Promise<void> {
    if (window.tclElectron) {
      await window.tclElectron.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async openFolder(relPath = ''): Promise<void> {
    if (window.tclElectron) {
      await window.tclElectron.openFolder(relPath);
    }
  }
}

export const tclBridge = new TclClientBridge();
