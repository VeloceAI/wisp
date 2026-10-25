export interface AudioCache {
  get(key: string): Promise<ArrayBuffer | null>;
  set(key: string, audio: ArrayBuffer): Promise<void>;
}

export class MemoryAudioCache implements AudioCache {
  private map = new Map<string, ArrayBuffer>();
  constructor(private max = 300) {}
  async get(key: string) {
    const v = this.map.get(key);
    if (v) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v ?? null;
  }
  async set(key: string, audio: ArrayBuffer) {
    this.map.set(key, audio);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
