// Audio synthesizer for real-time notifications using Web Audio API
// Generates a soft, pleasant chime without needing external sound assets

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a double-chime notification sound.
 */
export function playNotificationSound(): void {
  try {
    const isMuted = localStorage.getItem('bloodping_notification_sound') === 'muted';
    if (isMuted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Note 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);

    gain2.gain.setValueAtTime(0.001, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.1);
    osc2.stop(now + 0.55);
  } catch (err) {
    // Audio autoplay might be blocked before first interaction
    console.debug('Notification audio playback skipped:', err);
  }
}

export function isNotificationSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('bloodping_notification_sound') === 'muted';
}

export function setNotificationSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('bloodping_notification_sound', muted ? 'muted' : 'enabled');
}
