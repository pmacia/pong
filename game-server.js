'use strict';

// ---------------------------------------------------------------------------------------------------
// SERVIDOR DE JUEGO: Servidor Web
// ---------------------------------------------------------------------------------------------------

// Incluimos las bibliotecas necesarias para los servidores
const express = require('express');
const app = express();
const server = require('http').createServer(app);
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

// ---------------------------------------------------------------------------------------------------
// Inicialización del Servidor de Juego: Servidor Web
// ---------------------------------------------------------------------------------------------------
function init() {
    initWebServer();
}

// Punto de entrada: inicializamos el Servidor de Juego
init();
