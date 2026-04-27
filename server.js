const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    maxHttpBufferSize: 1e6,
    pingInterval: 2000,
    pingTimeout: 5000 
});

const SERVER_URL = "https://jasmlk-1.onrender.com";
let modCode = Math.random().toString(36).substring(2, 8).toUpperCase();
console.log(`[SYSTEM] MOD_CODE: ${modCode}`);

// Само-пингер
setInterval(() => {
    https.get(SERVER_URL, (res) => {}).on('error', () => {});
}, 600000);

const UI = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CAX CORE v4.1</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #0b141a; color: #e9edef; height: 100vh; display: flex; justify-content: center; }
        
        /* Ограничитель ширины для ПК, чтобы было как на телефоне */
        #app-container { width: 100%; max-width: 500px; background: #0b141a; height: 100vh; display: flex; flex-direction: column; position: relative; border-right: 1px solid #222; border-left: 1px solid #222; }
        
        #h { padding: 10px 15px; background: #202c33; display: flex; justify-content: space-between; font-size: 11px; }
        #ch { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        
        .m { padding: 8px 12px; background: #202c33; border-radius: 8px; max-width: 85%; align-self: flex-start; }
        .m.own { align-self: flex-end; background: #005c4b; }
        .n { font-size: 12px; color: #8696a0; font-weight: bold; display: block; margin-bottom: 4px; }
        .t { font-size: 15px; word-wrap: break-word; }

        /* ИГРОВОЕ ПОЛЕ (Вертикальное) */
        #game-box { display: none; position: absolute; top: 40px; left: 50%; transform: translateX(-50%); width: 300px; height: 500px; background: #111b21; border: 2px solid #00a884; z-index: 100; border-radius: 10px; overflow: hidden; }
        #game-canvas { width: 300px; height: 500px; touch-action: none; background: #000; }
        #close-game { position: absolute; top: 5px; right: 5px; background: #ff4d4d; color: #fff; border: none; padding: 5px; border-radius: 5px; z-index: 101; cursor: pointer; }

        #u { padding: 10px; background: #202c33; display: flex; gap: 8px; align-items: center; }
        input { flex: 1; background: #2a3942; border: none; color: #fff; padding: 12px 15px; border-radius: 20px; outline: none; }
        .btn { background: #00a884; color: #fff; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    </style>
</head>
<body>
    <div id="app-container">
        <div id="h"><div>v4.1 PRO</div><div>PING: <span id="pg">0</span>ms</div></div>
        <div id="ch"></div>
        
        <div id="game-box">
            <button id="close-game" onclick="toggleGame(false)">ЗАКРЫТЬ X</button>
            <canvas id="game-canvas" width="300" height="500"></canvas>
        </div>

        <form id="u">
            <input type="text" id="i" placeholder="Сообщение..." autocomplete="off">
            <div id="v" class="btn">🎙️</div>
            <button type="submit" class="btn">➤</button>
        </form>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io(), ch = document.getElementById('ch'), i = document.getElementById('i'), u = document.getElementById('u'), vBtn = document.getElementById('v');
        const canvas = document.getElementById('game-canvas'), ctx = canvas.getContext('2d');
        
        let nick = localStorage.getItem('nx') || prompt('НИК:') || 'USER_' + Math.floor(Math.random()*999);
        localStorage.setItem('nx', nick);
        let myColor = '#' + Math.floor(Math.random()*16777215).toString(16);
        let players = {}, gameActive = false;

        socket.emit('reg', nick);

        u.onsubmit = (e) => {
            e.preventDefault();
            const val = i.value.trim();
            if(!val) return;
            if(val === '/game') toggleGame(true);
            else if(val.startsWith('/mod')) socket.emit('auth', val.split(' ')[1]);
            else socket.emit('m', { n: nick, t: val });
            i.value = '';
        };

        socket.on('m', (d) => {
            const div = document.createElement('div');
            div.className = 'm' + (d.n === nick ? ' own' : '');
            div.innerHTML = \`<span class="n">\${d.n}</span><div class="t">\${d.t || '🎤 ГС'}</div>\`;
            ch.appendChild(div);
            ch.scrollTop = ch.scrollHeight;
        });

        // ИГРОВАЯ ЛОГИКА (БЕЗ ЗАДЕРЖКИ)
        function toggleGame(show) {
            gameActive = show;
            document.getElementById('game-box').style.display = show ? 'block' : 'none';
            if(show) socket.emit('g_join', { c: myColor });
        }

        function handleMove(e) {
            if(!gameActive) return;
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const x = Math.max(0, Math.min(300, clientX - rect.left));
            const y = Math.max(0, Math.min(500, clientY - rect.top));
            
            // Локальное обновление (мгновенно для тебя)
            if(players[socket.id]) { players[socket.id].x = x; players[socket.id].y = y; }
            socket.emit('g_m', { x, y });
            draw();
        }

        canvas.addEventListener('mousemove', (e) => e.buttons === 1 && handleMove(e));
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e); }, {passive: false});

        function draw() {
            ctx.fillStyle = '#000'; ctx.fillRect(0,0,300,500);
            for(let id in players) {
                const p = players[id];
                ctx.fillStyle = p.c;
                ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.font = '10px Arial';
                ctx.fillText(p.n, p.x - 15, p.y - 18);
            }
        }

        socket.on('g_u', (data) => { players = data; draw(); });

        setInterval(() => { const s = Date.now(); socket.emit('p', () => { document.getElementById('pg').innerText = Date.now() - s; }); }, 2000);
    </script>
</body>
</html>
`;

const users = new Map();
const players = {};

io.on('connection', (socket) => {
    socket.on('reg', (n) => users.set(socket.id, n));
    socket.on('auth', (c) => { if(c === modCode) socket.isMod = true; });

    socket.on('g_join', (d) => {
        players[socket.id] = { n: users.get(socket.id), c: d.c, x: 150, y: 250 };
        io.emit('g_u', players);
    });

    socket.on('g_m', (d) => {
        if(players[socket.id]) {
            players[socket.id].x = d.x;
            players[socket.id].y = d.y;
            socket.broadcast.emit('g_u', players); // Рассылаем всем остальным
        }
    });

    socket.on('m', (d) => io.emit('m', { ...d, mod: socket.isMod }));
    socket.on('p', (cb) => cb());
    socket.on('disconnect', () => { delete players[socket.id]; users.delete(socket.id); io.emit('g_u', players); });
});

server.listen(process.env.PORT || 3000, '0.0.0.0');
