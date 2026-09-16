/**
 * Ponto de entrada: monta as peças e liga o laço do jogo.
 */

import * as config from './config.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { loadSettings, saveSettings } from './storage.js';
import { audio } from './audio.js';

const canvas = document.getElementById('game');

const settings = loadSettings();
const input = new Input(canvas);
const game = new Game(canvas, input);

const ui = new UI({ game, settings, onSettingsChange: saveSettings });

// Handle de depuração: permite inspecionar o estado e ajustar as constantes de
// balanceamento direto do console do navegador.
window.pong = { game, ui, input, settings, config };

// Navegadores só permitem áudio depois de um gesto do usuário.
const unlockAudio = () => audio.unlock();
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });
input.onFirstGesture = unlockAudio;

/**
 * Redimensionamento: o ResizeObserver cobre rotação de tela, barra de
 * endereço do mobile aparecendo/sumindo e mudança de zoom — casos que o
 * `resize` da janela sozinho não pega.
 */
const handleResize = () => game.resize();
if ('ResizeObserver' in window) {
    new ResizeObserver(handleResize).observe(canvas);
} else {
    window.addEventListener('resize', handleResize);
}
window.addEventListener('orientationchange', handleResize);

// A fonte pixelada pode chegar depois do primeiro quadro; o placar é
// desenhado com retângulos, mas o menu reflui — força um relayout limpo.
document.fonts?.ready.then(handleResize).catch(() => {});

game.start();
