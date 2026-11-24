import net from 'node:net';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

/**
 * Lightweight zero-dependency Discord IPC Rich Presence client for Windows, Linux, and macOS.
 * Connects to local Discord desktop socket (discord-ipc-0..9) when enabled in Launcher Settings.
 */
export class DiscordRpcManager {
  private socket: net.Socket | null = null;
  private connected = false;
  private currentClientId = '';
  private startTimestamp = Math.floor(Date.now() / 1000);

  private getIpcPath(index: number): string {
    if (process.platform === 'win32') {
      return `\\\\?\\pipe\\discord-ipc-${index}`;
    }
    const envDir =
      process.env.XDG_RUNTIME_DIR ||
      process.env.TMPDIR ||
      process.env.TMP ||
      process.env.TEMP ||
      os.tmpdir();
    return path.join(envDir, `discord-ipc-${index}`);
  }

  private encodePacket(op: number, payload: unknown): Buffer {
    const json = JSON.stringify(payload);
    const len = Buffer.byteLength(json, 'utf8');
    const buf = Buffer.alloc(8 + len);
    buf.writeInt32LE(op, 0);
    buf.writeInt32LE(len, 4);
    buf.write(json, 8, len, 'utf8');
    return buf;
  }

  async connect(clientId: string): Promise<boolean> {
    const cleanId = clientId.trim();
    if (!cleanId) {
      this.disconnect();
      return false;
    }
    if (this.connected && this.currentClientId === cleanId && this.socket) {
      return true;
    }
    this.disconnect();
    this.currentClientId = cleanId;

    for (let i = 0; i < 10; i++) {
      const ipcPath = this.getIpcPath(i);
      const ok = await new Promise<boolean>((resolve) => {
        const sock = net.createConnection(ipcPath);
        const timer = setTimeout(() => {
          sock.destroy();
          resolve(false);
        }, 600);

        sock.once('connect', () => {
          clearTimeout(timer);
          this.socket = sock;
          this.connected = true;
          sock.write(this.encodePacket(0, { v: 1, client_id: cleanId }));
          resolve(true);
        });

        sock.once('error', () => {
          clearTimeout(timer);
          sock.destroy();
          resolve(false);
        });

        sock.once('close', () => {
          if (this.socket === sock) {
            this.connected = false;
            this.socket = null;
          }
        });
      });
      if (ok) return true;
    }
    return false;
  }

  async updateActivity(options: {
    enabled: boolean;
    clientId: string;
    details: string;
    state: string;
  }): Promise<void> {
    if (!options.enabled || !options.clientId.trim()) {
      this.disconnect();
      return;
    }
    const ok = await this.connect(options.clientId);
    if (!ok || !this.socket) return;

    const payload = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: {
          details: options.details,
          state: options.state,
          timestamps: { start: this.startTimestamp },
          assets: {
            large_image: 'turbocraft_logo',
            large_text: 'TurboCraft Launcher — PC Edition',
          },
        },
      },
      nonce: crypto.randomUUID(),
    };

    try {
      this.socket.write(this.encodePacket(1, payload));
    } catch {
      this.disconnect();
    }
  }

  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {
        // ignore
      }
      this.socket = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
