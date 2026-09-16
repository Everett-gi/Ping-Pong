/**
 * Camada de menu: telas em HTML sobre o canvas.
 *
 * Feito com DOM (e não desenhado no canvas) para herdar acessibilidade real —
 * foco, leitores de tela, navegação por teclado, toque e responsividade.
 */

import { DIFFICULTIES, MODES, SIDE, STATE, THEMES } from './config.js';
import { loadRecords, saveRecords, clearRecords } from './storage.js';
import { audio } from './audio.js';

const SETTING_PARSERS = {
    target: Number,
    sound: (value) => value === 'on',
    crt: (value) => value === 'on',
};

const SETTING_SERIALIZERS = {
    sound: (value) => (value ? 'on' : 'off'),
    crt: (value) => (value ? 'on' : 'off'),
};

export class UI {
    constructor({ game, settings, onSettingsChange }) {
        this.game = game;
        this.settings = settings;
        this.onSettingsChange = onSettingsChange;
        this.records = loadRecords();

        this.root = document.documentElement;
        this.overlay = document.getElementById('overlay');
        this.announcer = document.getElementById('announcer');
        this.pauseButton = document.getElementById('pause-btn');
        this.screens = new Map(
            [...document.querySelectorAll('[data-screen-id]')].map((el) => [el.dataset.screenId, el])
        );

        this.history = [];
        this.currentScreen = 'main';
        this._resetArmed = false;
        this._resetTimer = 0;

        this._bindGame();
        this._bindEvents();
        this._syncSettingControls();
        this._renderRecords();
        this.applySettings();
        this.setScreen('main', { replace: true });
    }

    // ------------------------------------------------------------------
    // Configuração
    // ------------------------------------------------------------------

    applySettings() {
        const { theme, crt, sound } = this.settings;
        this.root.dataset.theme = THEMES[theme] ? theme : 'retro';
        this.root.dataset.crt = crt ? 'on' : 'off';
        audio.setEnabled(sound);
        this.game.setTheme(theme);
    }

    _setSetting(key, rawValue) {
        const parse = SETTING_PARSERS[key];
        const value = parse ? parse(rawValue) : rawValue;
        if (this.settings[key] === value) return;

        this.settings[key] = value;
        this.onSettingsChange?.(this.settings);
        this.applySettings();
        this._syncSettingControls();
        audio.select();
    }

    /** Reflete o estado das preferências nos radiogroups. */
    _syncSettingControls() {
        for (const group of document.querySelectorAll('[data-setting]')) {
            const key = group.dataset.setting;
            const serialize = SETTING_SERIALIZERS[key];
            const current = String(serialize ? serialize(this.settings[key]) : this.settings[key]);

            for (const radio of group.querySelectorAll('[role="radio"]')) {
                const checked = radio.dataset.value === current;
                radio.setAttribute('aria-checked', String(checked));
                radio.tabIndex = checked ? 0 : -1;
            }
        }

        // Dificuldade não se aplica ao modo de 2 jogadores.
        const difficultyRow = document.querySelector('[data-setting="difficulty"]');
        if (difficultyRow) difficultyRow.hidden = this.settings.mode === MODES.DUO;
    }

    // ------------------------------------------------------------------
    // Navegação entre telas
    // ------------------------------------------------------------------

    setScreen(id, { replace = false } = {}) {
        if (!replace && this.currentScreen !== id) {
            this.history.push(this.currentScreen);
        }
        this.currentScreen = id;
        this.root.dataset.screen = id;

        const hidden = id === 'none';
        this.overlay.inert = hidden;
        this.overlay.setAttribute('aria-hidden', String(hidden));

        if (!hidden) this._focusFirstRow();
    }

    goto(id) {
        this.setScreen(id);
        audio.select();
    }

    back() {
        const previous = this.history.pop() || 'main';
        this.setScreen(previous, { replace: true });
        audio.select();
    }

    quitToMenu() {
        this.history.length = 0;
        this.game.enterAttract();
        this.setScreen('main', { replace: true });
    }

    // ------------------------------------------------------------------
    // Navegação por teclado dentro da tela ativa
    // ------------------------------------------------------------------

    _activeScreen() {
        return this.screens.get(this.currentScreen) || null;
    }

    _rows() {
        const screen = this._activeScreen();
        if (!screen) return [];
        return [...screen.querySelectorAll('[data-row]')].filter((row) => !row.hidden);
    }

    _focusTargetOf(row) {
        if (row.matches('[role="radiogroup"]')) {
            return row.querySelector('[aria-checked="true"]') || row.querySelector('[role="radio"]');
        }
        return row;
    }

    _focusFirstRow() {
        const rows = this._rows();
        if (!rows.length) return;
        // Preferência: ação principal > primeira linha não destrutiva > qualquer uma.
        const target =
            rows.find((row) => row.classList.contains('btn--primary')) ||
            rows.find((row) => !row.classList.contains('btn--danger')) ||
            rows[0];
        this._focusTargetOf(target)?.focus();
    }

    _moveFocus(delta) {
        const rows = this._rows();
        if (!rows.length) return;
        const active = document.activeElement;
        const index = rows.findIndex((row) => row === active || row.contains(active));
        const next = rows[(Math.max(index, 0) + delta + rows.length) % rows.length];
        this._focusTargetOf(next)?.focus();
        audio.move();
    }

    _cycleValue(delta) {
        const group = document.activeElement?.closest('[data-setting]');
        if (!group) return false;

        const radios = [...group.querySelectorAll('[role="radio"]')];
        const index = radios.findIndex((radio) => radio.getAttribute('aria-checked') === 'true');
        const next = radios[(Math.max(index, 0) + delta + radios.length) % radios.length];
        if (!next) return false;

        this._setSetting(group.dataset.setting, next.dataset.value);
        // _syncSettingControls trocou o tabindex; devolve o foco ao selecionado.
        (group.querySelector('[aria-checked="true"]') || next).focus();
        return true;
    }

    // ------------------------------------------------------------------
    // Eventos
    // ------------------------------------------------------------------

    _bindEvents() {
        this.overlay.addEventListener('click', (event) => {
            const radio = event.target.closest('[role="radio"]');
            if (radio) {
                const group = radio.closest('[data-setting]');
                if (group) {
                    this._setSetting(group.dataset.setting, radio.dataset.value);
                    (group.querySelector('[aria-checked="true"]') || radio).focus();
                }
                return;
            }

            const button = event.target.closest('[data-action]');
            if (button) this._runAction(button.dataset.action, button);
        });

        this.pauseButton.addEventListener('click', () => this._requestPause());

        document.addEventListener('keydown', (event) => this._onKeyDown(event));

        // Sair da aba ou minimizar pausa a partida em vez de deixá-la correndo.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this._requestPause();
        });
        window.addEventListener('blur', () => this._requestPause());
    }

    _onKeyDown(event) {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            this._onEscape();
            return;
        }

        if (this.currentScreen === 'none') {
            if (event.key === 'p' || event.key === 'P') {
                event.preventDefault();
                this._requestPause();
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this._moveFocus(1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this._moveFocus(-1);
                break;
            case 'ArrowRight':
                if (this._cycleValue(1)) event.preventDefault();
                break;
            case 'ArrowLeft':
                if (this._cycleValue(-1)) event.preventDefault();
                break;
            default:
                break;
        }
    }

    _onEscape() {
        switch (this.currentScreen) {
            case 'none':
                this._requestPause();
                break;
            case 'pause':
                this._runAction('resume');
                break;
            case 'over':
            case 'main':
                break;
            default:
                this.back();
        }
    }

    _requestPause() {
        if (this.currentScreen !== 'none') return;
        if (this.game.pause()) {
            this.history.length = 0;
            this.setScreen('pause', { replace: true });
        }
    }

    _runAction(action, element) {
        switch (action) {
            case 'goto':
                this.goto(element.dataset.target);
                break;
            case 'back':
                this.back();
                break;
            case 'start':
                this._startMatch();
                break;
            case 'resume':
                this.history.length = 0;
                this.setScreen('none', { replace: true });
                this.game.resume();
                break;
            case 'restart':
                this.history.length = 0;
                this.setScreen('none', { replace: true });
                this.game.restart();
                break;
            case 'rematch':
                this.history.length = 0;
                this.setScreen('none', { replace: true });
                this.game.restart();
                break;
            case 'quit':
                this.quitToMenu();
                break;
            case 'reset-records':
                this._resetRecords(element);
                break;
            default:
                break;
        }
    }

    _startMatch() {
        this.history.length = 0;
        this.setScreen('none', { replace: true });
        this.game.startMatch({
            mode: this.settings.mode,
            difficulty: this.settings.difficulty,
            target: this.settings.target,
        });
        this._announce(
            this.settings.mode === MODES.DUO
                ? 'Partida de dois jogadores iniciada.'
                : `Partida iniciada na dificuldade ${DIFFICULTIES[this.settings.difficulty].label}.`
        );
    }

    // ------------------------------------------------------------------
    // Jogo -> UI
    // ------------------------------------------------------------------

    _bindGame() {
        this.game.onPoint = (_scorer, score) => {
            if (this.game.isAttract) return;
            this._announce(`Placar: ${score.left} a ${score.right}.`);
        };

        this.game.onGameOver = (result) => this._showResult(result);

        this.game.onStateChange = (state) => {
            // Se a partida terminar enquanto o overlay está escondido, a tela
            // de resultado é aberta por _showResult; aqui só cuidamos da pausa
            // disparada pelo próprio jogo.
            if (state === STATE.PAUSED && this.currentScreen === 'none') {
                this.setScreen('pause', { replace: true });
            }
        };
    }

    _showResult(result) {
        const humanWon = result.winner === SIDE.LEFT;
        const duo = result.mode === MODES.DUO;
        const badges = this._recordMatch(result);

        const title = document.querySelector('[data-result-title]');
        const score = document.querySelector('[data-result-score]');
        const badge = document.querySelector('[data-result-badge]');

        if (duo) {
            title.textContent = humanWon ? 'JOGADOR 1 VENCE' : 'JOGADOR 2 VENCE';
        } else {
            title.textContent = humanWon ? 'VOCÊ VENCEU!' : 'A CPU VENCEU';
        }
        score.textContent = `${result.score.left} – ${result.score.right}`;

        badge.hidden = badges.length === 0;
        badge.textContent = badges.join(' · ');

        if (duo || humanWon) audio.win();
        else audio.lose();

        this._announce(`${title.textContent} ${result.score.left} a ${result.score.right}.`);
        this._renderRecords();
        this.history.length = 0;
        this.setScreen('over', { replace: true });
    }

    /** Atualiza os recordes e devolve as conquistas desta partida. */
    _recordMatch(result) {
        const records = this.records;
        const badges = [];

        if (result.bestRally > records.bestRally) {
            records.bestRally = result.bestRally;
            badges.push(`NOVO RECORDE DE REBATIDAS: ${result.bestRally}`);
        }

        // Partidas de 2 jogadores não alimentam o histórico de vitórias contra a CPU.
        if (result.mode === MODES.CPU) {
            const won = result.winner === SIDE.LEFT;
            records.matches += 1;
            records.pointsFor += result.score.left;
            records.pointsAgainst += result.score.right;

            if (won) {
                records.wins += 1;
                records.currentStreak += 1;
                records.winsByDifficulty[result.difficulty] =
                    (records.winsByDifficulty[result.difficulty] || 0) + 1;
                if (records.currentStreak > records.bestStreak) {
                    records.bestStreak = records.currentStreak;
                    if (records.bestStreak > 1) {
                        badges.push(`NOVA SÉRIE DE VITÓRIAS: ${records.bestStreak}`);
                    }
                }
            } else {
                records.losses += 1;
                records.currentStreak = 0;
            }
        }

        saveRecords(records);
        return badges;
    }

    _renderRecords() {
        const records = this.records;
        const winRate = records.matches
            ? `${Math.round((records.wins / records.matches) * 100)}%`
            : '—';

        const values = {
            matches: records.matches,
            wins: records.wins,
            losses: records.losses,
            winrate: winRate,
            bestRally: records.bestRally,
            bestStreak: records.bestStreak,
            pointsFor: records.pointsFor,
            pointsAgainst: records.pointsAgainst,
            byDifficulty: `F ${records.winsByDifficulty.easy} / N ${records.winsByDifficulty.normal} / D ${records.winsByDifficulty.hard}`,
        };

        for (const [key, value] of Object.entries(values)) {
            const node = document.querySelector(`[data-stat="${key}"]`);
            if (node) node.textContent = String(value);
        }
    }

    _resetRecords(button) {
        window.clearTimeout(this._resetTimer);

        if (!this._resetArmed) {
            this._resetArmed = true;
            button.textContent = 'CONFIRMAR?';
            this._resetTimer = window.setTimeout(() => {
                this._resetArmed = false;
                button.textContent = 'LIMPAR RECORDES';
            }, 4000);
            return;
        }

        this._resetArmed = false;
        button.textContent = 'LIMPAR RECORDES';
        this.records = clearRecords();
        this._renderRecords();
        this._announce('Recordes apagados.');
        audio.select();
    }

    _announce(message) {
        if (this.announcer) this.announcer.textContent = message;
    }
}
