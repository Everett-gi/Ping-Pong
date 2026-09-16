import { clamp } from './config.js';

/** Raquete. As dimensões são recalculadas pelo layout a cada resize. */
export class Paddle {
    constructor(side) {
        this.side = side;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        /** Alvo da IA (em Y, centro da raquete). */
        this.target = 0;
        /** Tempo restante até a IA reavaliar o alvo. */
        this.reactTimer = 0;
    }

    get center() {
        return this.y + this.height / 2;
    }

    set center(value) {
        this.y = value - this.height / 2;
    }

    /** Mantém a raquete dentro da mesa — faltava no código original. */
    clampTo(tableHeight) {
        this.y = clamp(this.y, 0, tableHeight - this.height);
    }
}

/** Bola. A velocidade é guardada como vetor (vx, vy). */
export class Ball {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 0;
    }

    get speed() {
        return Math.hypot(this.vx, this.vy);
    }

    /** Reescala o vetor para uma nova magnitude, preservando a direção. */
    setSpeed(speed) {
        const current = this.speed;
        if (current === 0) {
            this.vx = speed;
            return;
        }
        const ratio = speed / current;
        this.vx *= ratio;
        this.vy *= ratio;
    }
}
