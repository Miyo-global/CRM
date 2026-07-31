"use client";

let _ctx: AudioContext | null = null;
let _unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

export function initSoundAlerts(): void {
  if (typeof window === "undefined" || _unlocked) return;
  const unlock = () => {
    if (_unlocked) return;
    _unlocked = true;
    getCtx();
    document.removeEventListener("click", unlock);
    document.removeEventListener("keydown", unlock);
    document.removeEventListener("touchend", unlock);
  };
  document.addEventListener("click", unlock, { once: true, passive: true });
  document.addEventListener("keydown", unlock, { once: true, passive: true });
  document.addEventListener("touchend", unlock, { once: true, passive: true });
}

/** Soft double-ping — for incoming chat messages. */
export function playMessageSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes: [number, number][] = [
    [880, 0],
    [1174, 0.14],
  ];

  for (const [freq, delay] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);
    osc.start(now + delay);
    osc.stop(now + delay + 0.22);
  }
}

/** Triple ascending alert — for app notifications (louder, more distinct). */
export function playAlertSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes: [number, number][] = [
    [660, 0],
    [880, 0.17],
    [1100, 0.34],
  ];

  for (const [freq, delay] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.32, now + delay + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.28);
    osc.start(now + delay);
    osc.stop(now + delay + 0.28);
  }
}
