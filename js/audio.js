/**
 * Efeitos sonoros sintetizados (onda quadrada), no espírito do Pong de 1972.
 * O AudioContext só é criado depois do primeiro gesto do usuário, como exigem
 * as políticas de autoplay dos navegadores.
 */

let context = null;
let enabled = true;
let unavailable = false;

function ensureContext() {
    if (unavailable || !enabled) return null;
    if (!context) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) {
            unavailable = true;
            return null;
        }
        try {
            context = new Ctor();
        } catch {
            unavailable = true;
            return null;
        }
    }
    if (context.state === 'suspended') {
        context.resume().catch(() => {});
    }
    return context;
}

function tone({ frequency, duration, type = 'square', volume = 0.06, slideTo = null }) {
    const ctx = ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), now + duration);
    }

    // Envelope curto evita o "clique" de corte abrupto.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
}

export const audio = {
    setEnabled(value) {
        enabled = value;
        if (!value && context) {
            context.suspend().catch(() => {});
        }
    },
    /** Chamado no primeiro gesto do usuário para destravar o áudio. */
    unlock() {
        ensureContext();
    },
    paddle() {
        tone({ frequency: 480, duration: 0.05 });
    },
    wall() {
        tone({ frequency: 240, duration: 0.05 });
    },
    score() {
        tone({ frequency: 160, duration: 0.28, slideTo: 90 });
    },
    move() {
        tone({ frequency: 620, duration: 0.02, volume: 0.025 });
    },
    select() {
        tone({ frequency: 880, duration: 0.05, volume: 0.04 });
    },
    win() {
        tone({ frequency: 520, duration: 0.12, volume: 0.05 });
        window.setTimeout(() => tone({ frequency: 780, duration: 0.22, volume: 0.05 }), 120);
    },
    lose() {
        tone({ frequency: 300, duration: 0.14, volume: 0.05 });
        window.setTimeout(() => tone({ frequency: 150, duration: 0.3, volume: 0.05 }), 140);
    },
};
