# PONG

Pong clássico em HTML5 Canvas, com menu completo, três níveis de CPU, modo
para dois jogadores, temas e recordes salvos no navegador.

## Como rodar

O projeto usa módulos ES (`<script type="module">`), que o navegador bloqueia
quando a página é aberta direto do disco (`file://`). É preciso servir a pasta
por HTTP — qualquer servidor estático resolve:

```bash
python3 -m http.server 8000
# ou
npx serve .
```

Depois abra `http://localhost:8000`. Não há build, dependências nem instalação.

## Controles

| Ação | Teclado | Mouse / toque |
| --- | --- | --- |
| Raquete do jogador 1 | `W` / `S` (e setas no modo 1 jogador) | mover o cursor ou arrastar |
| Raquete do jogador 2 | `↑` / `↓` | — |
| Pausar | `ESC` ou `P` | botão `II` no canto |
| Navegar no menu | `↑` `↓` move, `←` `→` altera, `ENTER` confirma, `ESC` volta | clique |

## O que tem

- **Modos**: 1 jogador contra a CPU ou 2 jogadores no mesmo teclado.
- **Dificuldade**: fácil, normal e difícil — cada nível limita a velocidade
  máxima, o tempo de reação e a margem de erro da CPU.
- **Partida**: primeiro a 5, 7 ou 11 pontos.
- **Temas**: retrô (preto e branco), clássico (mesa vermelha) e neon.
- **Recordes**: partidas, vitórias, aproveitamento, maior sequência de
  rebatidas e maior série de vitórias, guardados em `localStorage`.
- **Acessibilidade**: menu em HTML com foco visível, navegação por teclado,
  `role="radiogroup"` nas opções, região `aria-live` anunciando o placar e
  respeito a `prefers-reduced-motion`.

## Estrutura

```
index.html        marcação do canvas e de todas as telas do menu
style.css         temas (custom properties), layout responsivo e efeito CRT
js/
  main.js         ponto de entrada: monta as peças e liga o laço
  config.js       constantes, presets de dificuldade e temas
  game.js         laço de passo fixo, física da bola e estados da partida
  entities.js     Paddle e Ball
  ai.js           IA da raquete do computador
  renderer.js     desenho no canvas (placar em display de 7 segmentos)
  input.js        ponteiro (mouse/toque) e teclado
  audio.js        efeitos em Web Audio, sintetizados em onda quadrada
  ui.js           telas de menu, navegação, recordes e preferências
  storage.js      leitura/escrita em localStorage, tolerante a falhas
```

## Notas de implementação

- **Passo fixo de 120 Hz** com acumulador: a partida corre na mesma velocidade
  em telas de 60 Hz e de 144 Hz.
- **Colisão contínua (swept)**: a cada passo o jogo procura o primeiro impacto
  dentro do intervalo, em vez de olhar só a posição final. A bola não atravessa
  a raquete em alta velocidade nem fica presa vibrando nela.
- **Medidas relativas**: tamanhos e velocidades são definidos para uma altura
  de referência de 720px e escalados no layout, então o jogo se comporta igual
  em qualquer tela e sobrevive a redimensionamento e rotação.
- **Ângulo pelo ponto de impacto**: o ponto da raquete atingido define o ângulo
  de saída, com um mínimo de 22°. Sem esse mínimo, dois rebatedores precisos
  devolvem a bola quase na horizontal e o rali nunca termina — os valores de
  balanceamento foram calibrados por simulação de partidas completas.

Durante o desenvolvimento, `window.pong` expõe `{ game, ui, input, settings,
config }` no console do navegador para inspecionar o estado e experimentar
outros valores de balanceamento.
