/**
 * Entrada unificada: ponteiro (mouse, toque e caneta via Pointer Events) e
 * teclado.
 *
 * O código original lia `e.pageY` num listener de `mousemove`: ignorava o
 * offset real do canvas e não funcionava em nenhum dispositivo de toque.
 * Aqui a posição é convertida pelo `getBoundingClientRect()` do canvas.
 */

const GAME_KEYS = new Set(['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'Space']);

export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = new Set();
        this.pointer = { y: 0, active: false };
        /** Quando true, teclas de jogo não rolam a página. */
        this.capturing = false;
        /** Callback disparado no primeiro gesto (usado para destravar o áudio). */
        this.onFirstGesture = null;
        this._gestureSeen = false;

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerDown = this._onPointerDown.bind(this);
        this._onBlur = this._onBlur.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('blur', this._onBlur);
        canvas.addEventListener('pointermove', this._onPointerMove, { passive: true });
        canvas.addEventListener('pointerdown', this._onPointerDown, { passive: true });
    }

    setCapturing(value) {
        this.capturing = value;
        if (!value) this.keys.clear();
    }

    isDown(...codes) {
        return codes.some((code) => this.keys.has(code));
    }

    /** Esquece o estado atual (ao pausar, por exemplo). */
    reset() {
        this.keys.clear();
        this.pointer.active = false;
    }

    _markGesture() {
        if (this._gestureSeen) return;
        this._gestureSeen = true;
        this.onFirstGesture?.();
    }

    _onKeyDown(event) {
        if (event.repeat) return;
        this._markGesture();
        if (!GAME_KEYS.has(event.code)) return;
        // Só sequestra as setas/espaço durante o jogo: no menu elas navegam
        // e o Space precisa continuar acionando botões nativamente.
        if (this.capturing) {
            event.preventDefault();
            this.keys.add(event.code);
            this.pointer.active = false;
        }
    }

    _onKeyUp(event) {
        this.keys.delete(event.code);
    }

    _onBlur() {
        this.keys.clear();
    }

    _updatePointer(event) {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.height === 0) return;
        this.pointer.y = event.clientY - rect.top;
        this.pointer.active = true;
    }

    _onPointerMove(event) {
        this._updatePointer(event);
    }

    _onPointerDown(event) {
        this._markGesture();
        this._updatePointer(event);
    }
}
