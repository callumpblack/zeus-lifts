// Tiny Web Audio helper for the rest-timer "done" cue. No asset files: a short
// three-note chime is synthesised on the fly, with a vibration fallback on
// mobile. The AudioContext is created lazily and reused; browsers allow it to
// keep playing once it has been unlocked by a user gesture (completing a set).

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/**
 * Prime the audio context from within a user gesture so later, timer-triggered
 * beeps are allowed to play. Safe to call repeatedly; a no-op once unlocked.
 */
export function primeAudio(): void {
  const ac = getCtx();
  if (ac && ac.state === "suspended") void ac.resume();
}

/** Play the rest-finished cue: a short ascending three-note chime + vibration. */
export function playRestDoneSound(): void {
  const ac = getCtx();
  if (ac) {
    if (ac.state === "suspended") void ac.resume();
    const now = ac.currentTime;
    // Three rising notes (A5, C#6, E6) — a pleasant, unmistakable "ding".
    [880, 1108.73, 1318.51].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.16;
      const end = start + 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(ac.destination);
      osc.start(start);
      osc.stop(end);
    });
  }

  // Haptic nudge on supported mobile devices.
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([120, 60, 120]);
    } catch {
      /* unsupported / blocked */
    }
  }
}
