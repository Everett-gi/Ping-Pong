/**
 * Persistência em localStorage. Todo acesso é protegido: em modo anônimo,
 * com cookies bloqueados ou cota estourada o storage lança, e o jogo precisa
 * continuar funcionando (só que sem memória).
 */

import { DIFFICULTY_IDS, THEME_IDS, TARGET_SCORES, MODES, PLAYABLE_MODES } from './config.js';

const SETTINGS_KEY = 'pong.settings.v1';
const RECORDS_KEY = 'pong.records.v1';

export const DEFAULT_SETTINGS = {
    mode: MODES.CPU,
    difficulty: 'normal',
    target: 7,
    theme: 'retro',
    sound: true,
    crt: true,
};

export const DEFAULT_RECORDS = {
    matches: 0,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    bestRally: 0,
    bestStreak: 0,
    currentStreak: 0,
    winsByDifficulty: { easy: 0, normal: 0, hard: 0 },
};

function read(key) {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function write(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function asBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
}

function asCount(value) {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

/** Lê as preferências, descartando qualquer valor inválido ou adulterado. */
export function loadSettings() {
    const stored = read(SETTINGS_KEY) || {};
    return {
        mode: PLAYABLE_MODES.includes(stored.mode) ? stored.mode : DEFAULT_SETTINGS.mode,
        difficulty: DIFFICULTY_IDS.includes(stored.difficulty)
            ? stored.difficulty
            : DEFAULT_SETTINGS.difficulty,
        target: TARGET_SCORES.includes(Number(stored.target))
            ? Number(stored.target)
            : DEFAULT_SETTINGS.target,
        theme: THEME_IDS.includes(stored.theme) ? stored.theme : DEFAULT_SETTINGS.theme,
        sound: asBoolean(stored.sound, DEFAULT_SETTINGS.sound),
        crt: asBoolean(stored.crt, DEFAULT_SETTINGS.crt),
    };
}

export function saveSettings(settings) {
    write(SETTINGS_KEY, settings);
}

export function loadRecords() {
    const stored = read(RECORDS_KEY) || {};
    const byDifficulty = stored.winsByDifficulty || {};
    return {
        matches: asCount(stored.matches),
        wins: asCount(stored.wins),
        losses: asCount(stored.losses),
        pointsFor: asCount(stored.pointsFor),
        pointsAgainst: asCount(stored.pointsAgainst),
        bestRally: asCount(stored.bestRally),
        bestStreak: asCount(stored.bestStreak),
        currentStreak: asCount(stored.currentStreak),
        winsByDifficulty: DIFFICULTY_IDS.reduce((acc, id) => {
            acc[id] = asCount(byDifficulty[id]);
            return acc;
        }, {}),
    };
}

export function saveRecords(records) {
    write(RECORDS_KEY, records);
}

export function clearRecords() {
    try {
        window.localStorage.removeItem(RECORDS_KEY);
    } catch {
        /* sem storage disponível: nada a limpar */
    }
    return JSON.parse(JSON.stringify(DEFAULT_RECORDS));
}
