const canvasEl = document.querySelector("canvas"),
canvasCtx = canvasEl.getContext("2d"),
gapX = 10,
mouse = {x:0 , y:0 },
lineWidth = 10;

const table = {
    largura: window.innerWidth,
    altura: window.innerHeight,
    draw: function() {
        //desenho da mesa
        canvasCtx.fillStyle = "#670010";
        canvasCtx.fillRect(0, 0, this.largura, this.altura);
    },
};

const line = {
    largura: 15,
    altura: table.altura,
    draw: function() {
        //desenha a linha
        canvasCtx.fillStyle = "#ffffff";
        canvasCtx.fillRect(table.largura / 2 - this.largura / 2, 0, this.largura, this.altura);
    },
};

const leftPaddle = {
    //desenha raquete direita
    x: gapX,
    y: 0,
    largura: line.largura,
    altura: 200,
    _move: function () {
    this.y = mouse.y - this.altura / 2;
    },
    draw: function () {
        canvasCtx.fillStyle = "#ffffff";
        canvasCtx.fillRect(this.x , this.y, this.largura, this.altura);
        this._move()
    },
    
};

const rightPaddle = {
    //desenha raquete esquerda
    x: table.largura - line.largura - gapX,
    y: 0,
    largura: line.largura,
    altura: 200,
    speed: 2,
    _move: function() {
        if (this.y + this.altura / 2 < ball.y + ball.r) {
            this.y += this.speed;
        } else {
            this.y -= this.speed;
        }
    },
    speedUp: function() {
        this.speed += 2
    },
    draw: function () {
        canvasCtx.fillStyle = "#ffffff";
        canvasCtx.fillRect(this.x , this.y, this.largura, this.altura);
        
        this._move();
    },
    
};

const ball = {
    //desenha a bolinha
    x: table.largura / 2,
    y: table.altura / 2,
    r: 20,
    speed: 5,
    directionX: 1,
    directionY: 1,
    _calcPosition: function() {
        // verifica se o jogador fe um ponto (X > largura da mesa)
        if (this.x > table.largura - this.r - rightPaddle.largura - gapX) {
            //verifica se a raquete da direita esta na posição Y da bola
            if(
                this.y + this.r > rightPaddle.y &&
                this.y - this.r < rightPaddle.y + rightPaddle.altura
            ) {
                //rebate a bola invertendo o sinal de X
                this._reverseX()
            } else {
                //pontuar jogador 1
                score.increaseHuman();
                this._pointUp();
            }
        }

        //veririficar se o jogador 2 fez ponto 
        if(this.x < this.r + leftPaddle.largura + gapX) {
            //verifica se a raquete esquerda esta na posicao y da bola
            if (
                this.y + this.r > leftPaddle.y &&
                this.y - this.r < leftPaddle.y + leftPaddle. altura
            ) {
                //rebate a bolinha invertendo o sinal X
                this._reverseX()
            } else {
                score.increaseComputer()
                this._pointUp()
            }
        }
        // verifica as laterais inferior e superior da mesa
        if(
            (this.y - this.r < 0 && this.directionY < 0) ||
            (this.y > table.altura - this.r && this.directionY > 0)
        ){
            // rebate a bolinha
        this._reverseY();
        }
    },
    _reverseX: function() {
        // 1 * -1 =-1
        //-1 * -1 = 1
        this.directionX *= -1
    },
    _reverseY: function() {
        // 1 * -1 = -1
        // -1 * -1 = 1
        this.directionY *= -1;
    },
    
    _speedUp: function() {
        this.speed+= 3;
    },
    _pointUp: function() {
        this._speedUp();
        rightPaddle.speedUp();
        this.x = table.largura / 2;
        this.y = table.altura / 2;
    },
    _move: function() {
        this.x += this.directionX * this.speed;
        this.y += this.directionY * this.speed;
    },
    draw: function() {
        canvasCtx.fillStyle = "#ffffff";
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, this.r, 0 ,2 * Math.PI, false);
        canvasCtx.fill();
        
        this._calcPosition();
        this._move();
    },
}

const score = {
    human: 0,
    computer: 0,
    increaseHuman: function() {
        this.human++
    },
    increaseComputer: function() {
        this.computer++
    },
    draw: function() {
            //desenhar placar
        canvasCtx.font = "bold 72px Arial";
        canvasCtx.textAlign = "center";
        canvasCtx.textBaseline = "top";
        canvasCtx.fillStyle = "#ffffff";
        canvasCtx.fillText(this.human, table.largura / 4, 50);
        canvasCtx.fillText(this.computer, table.largura / 4  + table.largura / 2, 50);
    },
};

function setup() {
    canvasEl.width = canvasCtx.width = table.largura;
    canvasEl.height = canvasCtx.height = table.altura;
};

function draw() {
    table.draw();
    line.draw();
    leftPaddle.draw();
    rightPaddle.draw();
    score.draw();
    ball.draw();
};

window.animateFrame = (function() {
    return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame||
    window.mozRequestAnimationFame||
    window.oRequestAnimationFrame||
    window.msRequestAnimationFrame||
    function(callback) {
        return window.setTimeout(callback, 1000 / 60)
    }
)
})();

function main() {
    animateFrame(main);
    draw();
};

setup();
main();

canvasEl.addEventListener("mousemove", function (e){
    mouse.x = e.pageX;
    mouse.y = e.pageY;
});