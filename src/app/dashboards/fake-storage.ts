import { vi } from 'vitest';

/** The test runtime's localStorage is not reliable; swap in a Map-backed one. */
export function stubLocalStorage(): void {
  const m = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    clear: () => m.clear(),
  });
}
