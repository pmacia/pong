'use strict';

// Constantes básicas del juego
const FRAME_PER_SECOND = 50;

const NUM_BALLS = 5;

const BG_COLOR = 'BLACK';

const FONT_COLOR = 'GREEN';
const FONT_SCORE_COLOR = 'WHITE';
const FONT_GAME_OVER_COLOR = 'BLUE';
const FONT_FAMILY = 'impact';
const FONT_SIZE = '45px';

const NET_COLOR = 'WHITE';
const NET_WIDTH = 4;
const NET_HEIGHT = 10;
const NET_PADDING = 15;

const PADDLE_RIGHT_COLOR = 'WHITE';
const PADDLE_LEFT_COLOR = 'WHITE';
const PADDLE_WIDTH = 20;
const PADDLE_HEIGHT = 100;

const BALL_COLOR = 'WHITE';
const BALL_RADIUS = 10;
const BALL_DELTA_VELOCITY = 0.5;
const BALL_VELOCITY = 5;

const gameStateEnum = {
    SYNC: 0,
    PLAY: 1,
    PAUSE: 2,
    END: 3,
};

// ---------------------------------------------------------------------------------------------------
// SERVIDOR DE JUEGO: Servidor Web + Servidor WebScoket (Motor de Red)
// ---------------------------------------------------------------------------------------------------

// Incluimos las bibliotecas necesarias para los servidores
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 3000;

// SERVIDOR WEB --------------------------------------------------------------------------------------

// Iniciamos un servidor HTTP para servir la interfaz (front-end) del juego
function initWebServer() {
    // Configuramos el servidor para servir contenido web desde la carpeta /public

    app.use(express.static(__dirname + '/public'));
    // Indicamos cuál será la página por defecto

    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/index.html');
    });

    // Lanzamos el Servidor Web
    server.listen(port, () => {
        console.log(`Game Server running on port ${port}`);
    });
}

// SERVIDOR WEBSOCKET (Motor de Red) {}[]-------------------------------------------------------------------------------

// Inicializamos el servidor WebSocket sobre el Servidor HTTP
function initNetworkEngine() {
    // Configuramos el servidor para servir contenido web desde la carpeta public/
    io.on('connection', (socket) => {
        console.log(`Nuevo jugador que desea entrar: ${socket.id}`);

        socket.on('new_player', () => {
            const numberOfPlayers = Object.keys(players).length;
            onNewPlayer(socket, numberOfPlayers);
        });

        socket.on('disconnect', () => {
            console.log(`Player ${socket.id} disconnected`);
            delete players[socket.id];
        });
    });
}
function sendStatus() {
    io.emit('state', {players, ball, gameState});
}

// -----------------------------------------------------------------------------------------------------------------
// MOTOR DE RED (NETWORK ENGINE)
// -----------------------------------------------------------------------------------------------------------------

// Manejador de Eventos (Handle del Ratón) -------------------------------------------------------------------------

// function initPaddleMovement() {
//     cvs.addEventListener('mousemove', (event) => {
//         if (gameState !== gameStateEnum.PLAY) return;

//         const rect = cvs.getBoundingClientRect();
//         const localPlayer = getPlayer(0);

//         localPlayer.y = event.clientY - (localPlayer.height / 2) - rect.top;
//     });
// }

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

// GENERIC HELPERS -------------------------------------------------------------------------------------------------

function getRandomDirection() {
    return Math.floor(Math.random() * 2) === 0 ? -1 : 1;
}

function getPlayer(index) {
    return Object.values(playes).find(player =>
        (index === 0 && player.x === 0) || (index !== 0 && player.x !== 0)
    );
}

// OBJETOS DEL JUEGO -----------------------------------------------------------------------------------------------

// Declaramos los objetos del juego (que forman parte del estado del juego)
let gameState = gameStateEnum.SYNC;
let players = {};
let ball = {};

// Inicializa los objetos dle juego
// function initGameObjects() {
function onNewPlayer(scoket, numberOfPlayers) {
    console.log(`Solicitud de juego para ${socket.id}`);
    console.log(`Por el momento había ${numberOfPlayers} jugadores registrados`);

    if (numberOfPlayers === 0) {
        players[socket.id] = {
            x: 0,
            y: CANVAS_HEIGHT/2 - PADDLE_HEIGHT/2,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
            color: PADDLE_LEFT_COLOR,
            score: 0
        };
        console.log(`Dando de alta al jugador A con índice ${numberOfPlayers}: ${socket.id}`);
    }

    if (numberOfPlayers === 1) {
        players[socket.id] = {
            x: CANVAS_WIDTH - PADDLE_WIDTH,
            y: CANVAS_HEIGHT/2 - PADDLE_HEIGHT/2,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
            color: PADDLE_RIGHT_COLOR,
            score: 0
        };
        console.log(`Dando de alta al jugador B con índice ${numberOfPlayers}: ${socket.id}`);
        console.log(`Ya hay 2 jugadores...`);
        console.log(`Generando una pelota nueva`);
        newBall(true);

        console.log('Iniciando el bucle de jeugo');
        initGameLoop();
    }

    if (numberOfPlayers >= 2) {
        console.log('Demasiados jugadores. Espere su turno');
        socket.disconnect();
    }
}

function newBall(init = false) {
    // Si la pelota ya estaba definida (es un tanto), cambiamos de sentido en el eje X
    const directionX = init ? getRandomDirection() : (ball.velocityX > 0 ? -1 : 1);

    ball = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        radius: BALL_RADIUS,
        speed: BALL_VELOCITY,
        velocityX: BALL_VELOCITY * directionX,
        velocityY: BALL_VELOCITY * getRandomDirection(),
        color: BALL_COLOR
    };
}


// BUCLE DE JUEGO --------------------------------------------------------------------------------------------------

// UPDATE HELPERS 

function collision(b, p) {
    // Calculamos el collider (define forma del objeto para colisiones) de la pelota
    b.top = b.y - b.radius;
    b.bottom = b.y + b.radius;
    b.left = b.x - b.radius;
    b.right = b.x + b.radius;

    // Calculamos el collider o hitbox de la pala
    p.top = p.y;
    p.bottom = p.y + p.height;
    p.left = p.x;
    p.right = p.x + p.width;

    // Verificamos si intersectan
    return b.right > p.left && // Dentro de los márgenes izq y dcho de la pala
           b.left < p.right && // 
           b.bottom > p.top && // Dentro de los márgenes sup e inf de la pala
           b.top < p.bottom;   // 
}

// IA del juego
// const COMPUTER_LEVEL = 0.1;

// function updateNPC() {
//     const npc = getPlayer(1);

//     npc.y += (ball.y - (npc.y + npc.height / 2)) * COMPUTER_LEVEL;
// }

function update() {
    // Si no estamos en modo PLAY, saltamos la actualización
    if (gameState !== gameStateEnum.PLAY) return;

    // Pelota: actualizamos la posición
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // IA: actualizamos la posición
    // updateNPC();

    // Si la pelota golpea los laterales del campo, rebotará...
    const ballBottom = ball.y + ball.radius;
    const ballTop = ball.y - ball.radius;

    if (ballBottom > CANVAS_HEIGHT) {
        ball.y = CANVAS_HEIGHT - ball.radius;
        ball.velocityY = -ball.velocityY;
    } else if (ballTop < 0) {
        ball.y = ball.radius;
        ball.velocityY = -ball.velocityY;
    }

    // Verificamos si la pelota golpea en alguna pala...
    let whatPlayer = (ball.x < CANVAS_WIDTH / 2) ? getPlayer(0) : getPlayer(1);

    if (collision(ball, whatPlayer)) {
        // Calculamos el punto donde golpea la pelota en la pala: [-p.height/2, p.height/2]
        let collidePoint = ball.y - (whatPlayer.y + whatPlayer.height / 2);

        // Normalizamos el punto de colisión: [-1, 1]
        collidePoint /= (whatPlayer.height / 2);

        // Calculamos el ángulo de rebote (en radianes): [-PI/4, PI/4]
        const angleRad = collidePoint * Math.PI / 4;

        // Calculamos el sentido de la pelota en la dirección X
        const directionX = (ball.x < CANVAS_WIDTH / 2) ? 1 : -1;

        // Calculamos la velocidad (speed) de la pelota en los ejes X, Y
        ball.velocityX = ball.speed * Math.cos(angleRad) * directionX;
        ball.velocityY = ball.speed * Math.sin(angleRad);

        // Incrementamos la velocidad de la pelota cada vez que la bola golpea la pala
        ball.speed += BALL_DELTA_VELOCITY;
    }
    // Si la pelota se sale por la alguno de los laterales...
    const ballLeft = ball.x - ball.radius;
    const ballRight = ball.x + ball.radius;

    if (ballLeft < 0) {
        console.log('Tanto para el jugador de la derecha');
        getPlayer(1).score++;
        newBall();
    } else if (ballRight > CANVAS_WIDTH) {
        console.log('Tanto para el jugador de la izquierda');
        getPlayer(0).score++;
        newBall();
    };

    sendStatus();
}

// function render() {
//     if (gameState === gameStateEnum.PAUSE) {
//         drawText('PAUSA', CANVAS_WIDTH / 4, CANVAS_HEIGHT / 2);
//         return;
//     };

//     if (gameState === gameStateEnum.SYNC) {
//         drawText('Esperando rival...', CANVAS_WIDTH / 4, CANVAS_HEIGHT / 2);
//         return;
//     };

//     if (gameState === gameStateEnum.PLAY) {
//         drawBoard();
//         drawScore(players);
//         for (let id in [0, 1]) {
//             drawPaddle(getPlayer(id));
//         };
//         drawBall(ball);
//     };

//     if (gameState === gameStateEnum.END) {
//         drawBoard();
//         drawScore(players);
//         for (let id in [0, 1]) {
//             drawPaddle(getPlayer(id));
//         };
//         drawText('GAME OVER', CANVAS_WIDTH / 3, CANVAS_HEIGHT / 2);
//     };
// }

function next() {
    // Si ha terminado la partida...
    if (gameState === gameStateEnum.END) {
        console.log('Game Over');
        stopGameLoop();
        return;
    };

    // Si ha ganado alguien... terminamos la partida
    if ((getPlayer(0).score >= NUM_BALLS) || (getPlayer(1).score >= NUM_BALLS)) {
        gameState = gameStateEnum.END;
        sendStatus();   // Cada vez que cambiamos de estado, informamos a los jugadores
    };
}

// HELPERS para gestionar el bucle del juego

let gameLoopId; // Identificador del bucle de eugo

function gameLoop() {
    update();
    // render();
    next();
}

function initGameLoop() {
    gameLoopId = setInterval(gameLoop, 1000/FRAME_PER_SECOND);
    gameState = gameStateEnum.PLAY;
    sendStatus();
}

function stopGameLoop() {
    clearInterval(gameLoopId);
}


// ---------------------------------------------------------------------------------------------------
// Inicialización del Servidor de Juego: Servidor Web + Motor de Red (Servidor WebSocket)
// ---------------------------------------------------------------------------------------------------
function init() {
    initWebServer();
    initNetworkEngine();
}

// Punto de entrada: inicializamos el Servidor de Juego
init();
