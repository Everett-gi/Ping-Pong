import { clamp } from './config.js';

/**
 * IA da raquete do computador.
 *
 * Diferenças em relação ao original:
 *  - velocidade com teto por dificuldade (antes crescia +2 por ponto, sem
 *    limite, até a raquete teleportar);
 *  - zona morta, que elimina o tremor de 1px quando a raquete já está alinhada;
 *  - reavaliação periódica do alvo com erro aleatório, para a IA parecer humana
 *    e ser efetivamente vencível;
 *  - volta ao centro quando a bola está indo para o outro lado.
 */
export function updateAI(paddle, ball, dt, preset, scale, tableHeight) {
    const incoming =
        (paddle.side === 'right' && ball.vx > 0) || (paddle.side === 'left' && ball.vx < 0);

    paddle.reactTimer -= dt;
    if (paddle.reactTimer <= 0) {
        paddle.reactTimer = preset.reaction;
        const spread = preset.error * paddle.height;
        paddle.target = incoming
            ? ball.y + (Math.random() * 2 - 1) * spread
            : tableHeight / 2 + (Math.random() * 2 - 1) * spread * 0.5;
    }

    const maxSpeed = preset.speed * scale;
    const delta = paddle.target - paddle.center;
    const deadZone = paddle.height * 0.08;

    if (Math.abs(delta) > deadZone) {
        const step = Math.min(Math.abs(delta), maxSpeed * dt);
        paddle.y += Math.sign(delta) * step;
    }

    paddle.y = clamp(paddle.y, 0, tableHeight - paddle.height);
}
