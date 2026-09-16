/**
 * Núcleo do jogo: layout responsivo, laço com passo fixo, física da bola,
 * controle das raquetes e máquina de estados da partida.
 */

import {
    BASE,
    FIXED_STEP,
    MAX_FRAME_TIME,
    REF_HEIGHT,
    DIFFICULTIES,
    ATTRACT_AI,
    MODES,
    SIDE,
    STATE,
    clamp,
} from './config.js';
import { Paddle, Ball } from './entities.js';
import { updateAI } from './ai.js';
import { Renderer } from './renderer.js';
import { audio } from './audio.js';

/** Sorteia um ângulo de saque, nunca perfeitamente horizontal. */
function randomServeAngle() {
    const span = BASE.maxServeAngle - BASE.minServeAngle;
    const magnitude = BASE.minServeAngle + Math.random() * span;
    return Math.random() < 0.5 ? magnitude : -magnitude;
}

export class Game {
    constructor(canvas, input) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.input = input;
        this.renderer = new Renderer(this.ctx);

        this.width = 0;
        this.height = 0;
        this.metrics = { scale: 1, paddleWidth: 14, paddleHeight: 120, gap: 26, ballRadius: 11, netWidth: 10 };

        this.leftPaddle = new Paddle(SIDE.LEFT);
        this.rightPaddle = new Paddle(SIDE.RIGHT);
        this.ball = new Ball();

        this.score = { left: 0, right: 0 };
        this.mode = MODES.ATTRACT;
        this.difficulty = 'normal';
        this.target = 7;
        this.state = STATE.SERVING;

        /** Velocidade da bola em unidades de referência (independe da tela). */
        this.ballSpeedRef = BASE.ballSpeed;
        this.serveTimer = BASE.serveDelay;
        this.rally = 0;
        this.matchBestRally = 0;

        this._resumeState = STATE.PLAYING;
        this._accumulator = 0;
        this._lastTime = 0;
        this._rafId = 0;
        this._loop = this._loop.bind(this);

        // Callbacks assinados pela UI.
        this.onPoint = null;
        this.onGameOver = null;
        this.onStateChange = null;

        this.resize();
        this.enterAttract();
    }

    get isAttract() {
        return this.mode === MODES.ATTRACT;
    }

    get isRunning() {
        return this.state === STATE.PLAYING || this.state === STATE.SERVING;
    }

    // ------------------------------------------------------------------
    // Layout
    // ------------------------------------------------------------------

    /**
     * Recalcula o tamanho do canvas. Roda no resize e na rotação da tela —
     * o código original lia window.innerWidth/Height uma única vez, e depois
     * de qualquer redimensionamento a raquete direita ficava fora da tela.
     */
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(240, Math.round(rect.width || window.innerWidth));
        const height = Math.max(200, Math.round(rect.height || window.innerHeight));
        const dpr = clamp(window.devicePixelRatio || 1, 1, 3);

        // Guarda as posições relativas para restaurá-las na nova escala.
        const prevWidth = this.width;
        const prevHeight = this.height;
        const ballFx = prevWidth ? this.ball.x / prevWidth : 0.5;
        const ballFy = prevHeight ? this.ball.y / prevHeight : 0.5;
        const leftFy = prevHeight ? this.leftPaddle.center / prevHeight : 0.5;
        const rightFy = prevHeight ? this.rightPaddle.center / prevHeight : 0.5;

        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.width = width;
        this.height = height;
        this.metrics = Game.computeMetrics(width, height);

        const { paddleWidth, paddleHeight, gap, ballRadius } = this.metrics;

        this.leftPaddle.width = paddleWidth;
        this.leftPaddle.height = paddleHeight;
        this.leftPaddle.x = gap;

        this.rightPaddle.width = paddleWidth;
        this.rightPaddle.height = paddleHeight;
        this.rightPaddle.x = width - gap - paddleWidth;

        this.leftPaddle.center = leftFy * height;
        this.rightPaddle.center = rightFy * height;
        this.leftPaddle.clampTo(height);
        this.rightPaddle.clampTo(height);

        this.ball.radius = ballRadius;
        this.ball.x = clamp(ballFx * width, ballRadius, width - ballRadius);
        this.ball.y = clamp(ballFy * height, ballRadius, height - ballRadius);
        this.ball.setSpeed(this.ballSpeedRef * this.metrics.scale);
    }

    static computeMetrics(width, height) {
        const scale = height / REF_HEIGHT;
        return {
            scale,
            /**
             * Escala do placar/contador. Usa também a largura: numa tela de
             * celular em pé, `scale` sozinha deixa os números gigantes.
             */
            uiScale: Math.min(scale, width / 640),
            paddleWidth: Math.max(8, Math.round(BASE.paddleWidth * scale)),
            paddleHeight: clamp(height * 0.18, 48, 230),
            gap: Math.max(10, Math.round(BASE.paddleGap * scale)),
            ballRadius: Math.max(5, Math.round(BASE.ballRadius * scale)),
            netWidth: Math.max(3, Math.round(10 * scale)),
        };
    }

    setTheme(themeId) {
        this.renderer.setTheme(themeId);
    }

    // ------------------------------------------------------------------
    // Ciclo de vida da partida
    // ------------------------------------------------------------------

    start() {
        if (this._rafId) return;
        this._lastTime = performance.now();
        this._accumulator = 0;
        this._rafId = window.requestAnimationFrame(this._loop);
    }

    stop() {
        if (!this._rafId) return;
        window.cancelAnimationFrame(this._rafId);
        this._rafId = 0;
    }

    /** Demonstração CPU x CPU que roda atrás do menu. */
    enterAttract() {
        this.mode = MODES.ATTRACT;
        this.score.left = 0;
        this.score.right = 0;
        this.matchBestRally = 0;
        this.input.setCapturing(false);
        this._serve(Math.random() < 0.5 ? 1 : -1, 0.6);
    }

    startMatch({ mode, difficulty, target }) {
        this.mode = mode;
        this.difficulty = difficulty;
        this.target = target;
        this.score.left = 0;
        this.score.right = 0;
        this.matchBestRally = 0;
        this.rally = 0;
        this.leftPaddle.center = this.height / 2;
        this.rightPaddle.center = this.height / 2;
        this.input.reset();
        this.input.setCapturing(true);
        this._serve(Math.random() < 0.5 ? 1 : -1, BASE.kickoffDelay);
    }

    restart() {
        this.startMatch({ mode: this.mode, difficulty: this.difficulty, target: this.target });
    }

    pause() {
        if (this.isAttract || !this.isRunning) return false;
        this._resumeState = this.state;
        this.input.reset();
        this.input.setCapturing(false);
        this._setState(STATE.PAUSED);
        return true;
    }

    resume() {
        if (this.state !== STATE.PAUSED) return;
        this.input.setCapturing(true);
        this._setState(this._resumeState);
    }

    // ------------------------------------------------------------------
    // Laço principal
    // ------------------------------------------------------------------

    _loop(now) {
        this._rafId = window.requestAnimationFrame(this._loop);

        // Passo fixo: sem isso o jogo roda 2,4x mais rápido em um monitor de
        // 144 Hz do que em um de 60 Hz, que era o comportamento original.
        const frameTime = Math.min((now - this._lastTime) / 1000, MAX_FRAME_TIME);
        this._lastTime = now;
        this._accumulator += frameTime;

        let steps = 0;
        while (this._accumulator >= FIXED_STEP && steps < 240) {
            this._update(FIXED_STEP);
            this._accumulator -= FIXED_STEP;
            steps += 1;
        }

        this.renderer.draw(this);
    }

    _update(dt) {
        if (this.state === STATE.PAUSED || this.state === STATE.OVER) return;

        this._updatePaddles(dt);

        if (this.state === STATE.SERVING) {
            this.serveTimer -= dt;
            this.ball.x = this.width / 2;
            this.ball.y = this.height / 2;
            if (this.serveTimer <= 0) {
                this.serveTimer = 0;
                this._setState(STATE.PLAYING);
            }
            return;
        }

        this._stepBall(dt);
        this._checkScore();
    }

    // ------------------------------------------------------------------
    // Raquetes
    // ------------------------------------------------------------------

    _updatePaddles(dt) {
        const { scale } = this.metrics;

        if (this.isAttract) {
            updateAI(this.leftPaddle, this.ball, dt, ATTRACT_AI, scale, this.height);
            updateAI(this.rightPaddle, this.ball, dt, ATTRACT_AI, scale, this.height);
            return;
        }

        const duo = this.mode === MODES.DUO;

        this._updateHumanPaddle(
            this.leftPaddle,
            dt,
            duo ? ['KeyW'] : ['KeyW', 'ArrowUp'],
            duo ? ['KeyS'] : ['KeyS', 'ArrowDown'],
            true
        );

        if (duo) {
            this._updateHumanPaddle(this.rightPaddle, dt, ['ArrowUp'], ['ArrowDown'], false);
        } else {
            const preset = DIFFICULTIES[this.difficulty] || DIFFICULTIES.normal;
            updateAI(this.rightPaddle, this.ball, dt, preset, scale, this.height);
        }
    }

    _updateHumanPaddle(paddle, dt, upKeys, downKeys, usesPointer) {
        const up = this.input.isDown(...upKeys);
        const down = this.input.isDown(...downKeys);

        if (up !== down) {
            const step = BASE.playerSpeed * this.metrics.scale * dt;
            paddle.y += up ? -step : step;
        } else if (usesPointer && this.input.pointer.active) {
            paddle.center = this.input.pointer.y;
        }

        // O original nunca limitava a raquete: ela saía inteira da tela.
        paddle.clampTo(this.height);
    }

    // ------------------------------------------------------------------
    // Bola
    // ------------------------------------------------------------------

    /**
     * Integração com detecção contínua (swept): em vez de testar só a posição
     * final do quadro, procura o primeiro impacto dentro do intervalo. Isso
     * elimina os dois bugs de colisão do original — a bola atravessando a
     * raquete em alta velocidade e a inversão repetida do sinal de X, que
     * fazia a bola "grudar" e vibrar na raquete.
     */
    _stepBall(dt) {
        const ball = this.ball;
        const height = this.height;
        const radius = ball.radius;

        // Um resize pode deixar a bola fora da mesa: resolve antes de integrar.
        if (ball.y < radius && ball.vy < 0) {
            ball.y = radius;
            ball.vy = -ball.vy;
        } else if (ball.y > height - radius && ball.vy > 0) {
            ball.y = height - radius;
            ball.vy = -ball.vy;
        }

        let remaining = dt;

        for (let guard = 0; guard < 5 && remaining > 1e-9; guard += 1) {
            const dx = ball.vx * remaining;
            const dy = ball.vy * remaining;
            let time = 1;
            let hit = null;

            if (dy < 0) {
                const wallTime = (radius - ball.y) / dy;
                if (wallTime >= 0 && wallTime < time) {
                    time = wallTime;
                    hit = 'wall';
                }
            } else if (dy > 0) {
                const wallTime = (height - radius - ball.y) / dy;
                if (wallTime >= 0 && wallTime < time) {
                    time = wallTime;
                    hit = 'wall';
                }
            }

            if (dx > 0) {
                const face = this.rightPaddle.x;
                const paddleTime = (face - radius - ball.x) / dx;
                if (paddleTime >= 0 && paddleTime < time && this._covers(this.rightPaddle, ball.y + dy * paddleTime)) {
                    time = paddleTime;
                    hit = this.rightPaddle;
                }
            } else if (dx < 0) {
                const face = this.leftPaddle.x + this.leftPaddle.width;
                const paddleTime = (face + radius - ball.x) / dx;
                if (paddleTime >= 0 && paddleTime < time && this._covers(this.leftPaddle, ball.y + dy * paddleTime)) {
                    time = paddleTime;
                    hit = this.leftPaddle;
                }
            }

            ball.x += dx * time;
            ball.y += dy * time;
            remaining *= 1 - time;

            if (!hit) break;

            if (hit === 'wall') {
                ball.vy = -ball.vy;
                ball.y = clamp(ball.y, radius, height - radius);
                audio.wall();
            } else {
                this._bounceOffPaddle(hit);
            }
        }
    }

    /** A raquete cobre a altura `y` do centro da bola? */
    _covers(paddle, y) {
        return y + this.ball.radius > paddle.y && y - this.ball.radius < paddle.y + paddle.height;
    }

    _bounceOffPaddle(paddle) {
        const ball = this.ball;

        // Aceleração com teto: sem o limite a bola passava a andar mais que a
        // largura da raquete por quadro e atravessava tudo.
        this.ballSpeedRef = Math.min(this.ballSpeedRef + BASE.ballSpeedStep, BASE.ballMaxSpeed);
        const speed = this.ballSpeedRef * this.metrics.scale;

        // O ponto da raquete atingido define o ângulo de saída: ponta manda a
        // bola aberta, meio manda reto. Sem isso a rebatida é um espelho, o
        // ângulo nunca muda e o rali contra a CPU não termina nunca.
        const offset = clamp((ball.y - paddle.center) / (paddle.height / 2), -1, 1);
        let angle = offset * BASE.maxBounceAngle;
        if (Math.abs(angle) < BASE.minBounceAngle) {
            const sign = ball.vy !== 0 ? Math.sign(ball.vy) : Math.random() < 0.5 ? -1 : 1;
            angle = BASE.minBounceAngle * sign;
        }

        const towards = paddle.side === SIDE.RIGHT ? -1 : 1;
        ball.vx = Math.cos(angle) * speed * towards;
        ball.vy = Math.sin(angle) * speed;

        // Afasta a bola da face para não recolidir no mesmo quadro.
        ball.x =
            paddle.side === SIDE.RIGHT
                ? paddle.x - ball.radius - 0.01
                : paddle.x + paddle.width + ball.radius + 0.01;

        this.rally += 1;
        this.matchBestRally = Math.max(this.matchBestRally, this.rally);
        audio.paddle();
    }

    _checkScore() {
        const ball = this.ball;
        if (ball.x - ball.radius > this.width) {
            this._point(SIDE.LEFT);
        } else if (ball.x + ball.radius < 0) {
            this._point(SIDE.RIGHT);
        }
    }

    _point(scorer) {
        this.score[scorer] += 1;
        audio.score();
        this.onPoint?.(scorer, { ...this.score });

        if (this.isAttract) {
            // A demonstração nunca termina: reinicia o placar em 5.
            if (this.score.left >= 5 || this.score.right >= 5) {
                this.score.left = 0;
                this.score.right = 0;
            }
        } else if (this.score[scorer] >= this.target) {
            this._finish(scorer);
            return;
        }

        // Saque na direção de quem sofreu o ponto.
        this._serve(scorer === SIDE.LEFT ? 1 : -1, BASE.serveDelay);
    }

    _serve(directionX, delay) {
        const ball = this.ball;
        this.ballSpeedRef = BASE.ballSpeed;
        this.rally = 0;

        const speed = this.ballSpeedRef * this.metrics.scale;
        const angle = randomServeAngle();

        ball.x = this.width / 2;
        ball.y = this.height / 2;
        ball.vx = Math.cos(angle) * speed * Math.sign(directionX || 1);
        ball.vy = Math.sin(angle) * speed;

        this.serveTimer = delay;
        this._setState(STATE.SERVING);
    }

    _finish(winner) {
        this.input.setCapturing(false);
        this.input.reset();
        this._setState(STATE.OVER);
        this.onGameOver?.({
            winner,
            score: { ...this.score },
            bestRally: this.matchBestRally,
            mode: this.mode,
            difficulty: this.difficulty,
        });
    }

    _setState(next) {
        if (this.state === next) return;
        this.state = next;
        this.onStateChange?.(next);
    }
}
