/**
 * Constantes de jogo, presets de dificuldade e temas.
 *
 * Todas as medidas e velocidades são expressas para uma altura de
 * referência (REF_HEIGHT) e multiplicadas por `scale` no layout. Assim o
 * jogo se comporta igual em um celular e em um monitor 4K — o bug original
 * era usar pixels absolutos lidos uma única vez na carga da página.
 */

export const REF_HEIGHT = 720;

/** Passo fixo da simulação, em segundos (120 Hz). */
export const FIXED_STEP = 1 / 120;

/** Teto de tempo por quadro: evita "espiral da morte" ao voltar de outra aba. */
export const MAX_FRAME_TIME = 0.25;

export const BASE = {
    paddleWidth: 14,
    paddleGap: 26,
    ballRadius: 11,
    /** Velocidade inicial da bola (px/s na altura de referência). */
    ballSpeed: 430,
    /** Incremento por rebatida. */
    ballSpeedStep: 55,
    /**
     * Teto de velocidade. A colisão contínua já impede tunelamento em
     * qualquer velocidade, mas manter o teto abaixo de
     * paddleWidth / FIXED_STEP (14 / (1/120) = 1680) deixa o passo discreto
     * seguro também, e evita que a bola fique injogável.
     */
    ballMaxSpeed: 1400,
    /** Velocidade da raquete humana no teclado. */
    playerSpeed: 700,
    /**
     * Ângulo máximo de rebatida (~54°), medido a partir da horizontal. O
     * ponto da raquete atingido define o ângulo, como no Pong original.
     * Sem isso a rebatida vira um espelho perfeito e o rali nunca termina.
     */
    maxBounceAngle: Math.PI * 0.3,
    /**
     * Ângulo mínimo de rebatida. Não é enfeite: com um valor baixo, dois
     * jogadores que acertam o centro da raquete devolvem a bola quase na
     * horizontal e o rali nunca termina. Calibrado por simulação — com 22°
     * até um rebatedor perfeito contra a CPU difícil fecha a partida.
     */
    minBounceAngle: (22 * Math.PI) / 180,
    /** Ângulo máximo do saque, em relação à horizontal. */
    maxServeAngle: Math.PI / 5,
    /** Ângulo mínimo do saque: impede saque perfeitamente horizontal. */
    minServeAngle: Math.PI / 18,
    /** Pausa antes do saque (s). */
    serveDelay: 0.9,
    /** Pausa maior no início da partida (s). */
    kickoffDelay: 1.6,
};

/**
 * Presets da IA. `speed` é o limite máximo — o bug original somava +2 por
 * ponto sem teto, e a raquete virava teleporte em poucas jogadas.
 * `reaction` é o intervalo entre reavaliações do alvo (quanto maior, mais
 * "lenta" a IA) e `error` é o desvio aleatório em frações da altura da raquete.
 */
export const DIFFICULTIES = {
    easy: { label: 'Fácil', speed: 330, reaction: 0.26, error: 0.55 },
    normal: { label: 'Normal', speed: 470, reaction: 0.14, error: 0.28 },
    hard: { label: 'Difícil', speed: 600, reaction: 0.09, error: 0.2 },
};

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES);

/** IA usada no modo atrator (CPU x CPU atrás do menu). */
export const ATTRACT_AI = { speed: 430, reaction: 0.16, error: 0.34 };

/**
 * Temas. `vars` alimenta o CSS (via :root) e `canvas` alimenta o renderer,
 * mantendo uma única fonte de verdade para as cores.
 */
export const THEMES = {
    retro: {
        label: 'Retrô',
        canvas: { bg: '#000000', fg: '#ffffff', ball: 'square', glow: 0 },
    },
    classic: {
        label: 'Clássico',
        canvas: { bg: '#670010', fg: '#ffffff', ball: 'circle', glow: 0 },
    },
    neon: {
        label: 'Neon',
        canvas: { bg: '#05070f', fg: '#00e5ff', ball: 'circle', glow: 16 },
    },
};

export const THEME_IDS = Object.keys(THEMES);

export const TARGET_SCORES = [5, 7, 11];

export const MODES = { CPU: 'cpu', DUO: 'duo', ATTRACT: 'attract' };

/** Modos que o jogador pode escolher no menu (ATTRACT é interno). */
export const PLAYABLE_MODES = [MODES.CPU, MODES.DUO];

export const SIDE = { LEFT: 'left', RIGHT: 'right' };

export const STATE = {
    SERVING: 'serving',
    PLAYING: 'playing',
    PAUSED: 'paused',
    OVER: 'over',
};

/** Limita `value` ao intervalo [min, max]. */
export function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
}
