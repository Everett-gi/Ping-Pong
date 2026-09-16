/**
 * Desenho no canvas.
 *
 * Os dígitos do placar são desenhados com retângulos (display de 7 segmentos)
 * em vez de `fillText`: é a aparência autêntica do Pong e elimina a dependência
 * de uma fonte que pode não ter carregado no primeiro quadro.
 */

import { THEMES, STATE } from './config.js';

// Segmentos acesos por dígito: a, b, c, d, e, f, g.
const SEGMENTS = {
    0: 'abcdef',
    1: 'bc',
    2: 'abged',
    3: 'abgcd',
    4: 'fgbc',
    5: 'afgcd',
    6: 'afgedc',
    7: 'abc',
    8: 'abcdefg',
    9: 'abcdfg',
};

export class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.theme = THEMES.retro.canvas;
    }

    setTheme(id) {
        this.theme = (THEMES[id] || THEMES.retro).canvas;
    }

    draw(game) {
        const { ctx, theme } = this;
        const { width, height } = game;

        ctx.save();
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = theme.fg;
        if (theme.glow > 0) {
            ctx.shadowColor = theme.fg;
            ctx.shadowBlur = theme.glow;
        }

        this._drawNet(game);
        this._drawPaddle(game.leftPaddle);
        this._drawPaddle(game.rightPaddle);
        this._drawScore(game);

        // Na espera pelo saque a bola pisca parada no centro, avisando que a
        // jogada vai começar — o original reposicionava a bola e seguia direto.
        if (game.state === STATE.SERVING) {
            this._drawServeIndicator(game);
        } else {
            this._drawBall(game.ball);
        }

        ctx.restore();
    }

    _drawNet(game) {
        const { ctx } = this;
        const { width, height, metrics } = game;
        const dash = metrics.scale * 22;
        const gap = metrics.scale * 18;
        const thickness = metrics.netWidth;
        const x = Math.round(width / 2 - thickness / 2);

        for (let y = gap / 2; y < height; y += dash + gap) {
            ctx.fillRect(x, y, thickness, Math.min(dash, height - y));
        }
    }

    _drawPaddle(paddle) {
        this.ctx.fillRect(
            Math.round(paddle.x),
            Math.round(paddle.y),
            paddle.width,
            Math.round(paddle.height)
        );
    }

    _drawBall(ball) {
        const { ctx } = this;
        if (this.theme.ball === 'square') {
            const size = ball.radius * 2;
            ctx.fillRect(Math.round(ball.x - ball.radius), Math.round(ball.y - ball.radius), size, size);
            return;
        }
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawScore(game) {
        const { metrics, width } = game;
        const digitHeight = metrics.uiScale * 64;
        const digitWidth = digitHeight * 0.58;
        const thickness = Math.max(3, Math.round(digitHeight * 0.16));
        const top = metrics.scale * 36;
        const spacing = digitWidth * 0.26;

        this._drawNumber(game.score.left, width * 0.25, top, digitWidth, digitHeight, thickness, spacing);
        this._drawNumber(game.score.right, width * 0.75, top, digitWidth, digitHeight, thickness, spacing);
    }

    /**
     * Bola piscando no centro durante a contagem para o saque. A rede é
     * apagada atrás dela: um objeto branco sobre os tracinhos brancos da rede
     * viraria um borrão indistinguível.
     */
    _drawServeIndicator(game) {
        const { ctx, theme } = this;
        const ball = game.ball;
        const box = ball.radius * 5;

        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle = theme.bg;
        ctx.fillRect(ball.x - box / 2, ball.y - box / 2, box, box);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(game.serveTimer * Math.PI * 2));
        this._drawBall(ball);
        ctx.restore();
    }

    /** Desenha um número inteiro centralizado em `centerX`. */
    _drawNumber(value, centerX, top, digitWidth, digitHeight, thickness, spacing) {
        const digits = String(Math.max(0, Math.floor(value)));
        const totalWidth = digits.length * digitWidth + (digits.length - 1) * spacing;
        let x = centerX - totalWidth / 2;

        for (const digit of digits) {
            this._drawDigit(digit, x, top, digitWidth, digitHeight, thickness);
            x += digitWidth + spacing;
        }
    }

    _drawDigit(digit, x, y, w, h, t) {
        const { ctx } = this;
        const on = SEGMENTS[digit] || '';
        const half = h / 2;

        // O "1" só acende os segmentos da direita; centralizá-lo na célula
        // evita que o placar pareça desalinhado.
        if (digit === '1') x -= (w - t) / 2;

        if (on.includes('a')) ctx.fillRect(x, y, w, t);
        if (on.includes('g')) ctx.fillRect(x, y + half - t / 2, w, t);
        if (on.includes('d')) ctx.fillRect(x, y + h - t, w, t);
        if (on.includes('f')) ctx.fillRect(x, y, t, half);
        if (on.includes('b')) ctx.fillRect(x + w - t, y, t, half);
        if (on.includes('e')) ctx.fillRect(x, y + half - t / 2, t, half + t / 2);
        if (on.includes('c')) ctx.fillRect(x + w - t, y + half - t / 2, t, half + t / 2);
    }
}
