const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });

// --- БАЗА ДАННЫХ И ПЕРЕМЕННЫЕ ---
let usersDB = {}; // { nick: {elo, lastSeen, socketId} }
let waitingRoom = []; // Список id игроков в поиске
let activeMatches = {}; // Текущие бои
const SERVER_URL = "https://jasmlk-1.onrender.com";

// Очистка базы (кто не был 48 часов - удаляем)
setInterval(() => {
    const now = Date.now();
    for (let nick in usersDB) {
        if (now - usersDB[nick].lastSeen > 172800000) {
            delete usersDB[nick];
            console.log(`[DB] Удален неактивный юзер: ${nick}`);
        }
    }
}, 3600000); // Проверка каждый час

// Keep-Alive
setInterval(() => { https.get(SERVER_URL, (res) => {}).on('error', (e) => {}); }, 600000);

const UI = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>BLIND SHOT CORE</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #0b141a; color: #fff; height: 100vh; display: flex; justify-content: center; overflow: hidden; }
        #app { width: 100%; max-width: 450px; background: #0b141a; height: 100vh; display: flex; flex-direction: column; position: relative; border-left: 1px solid #333; border-right: 1px solid #333; }
        
        /* ЭКРАНЫ */
        .screen { display: none; flex-direction: column; height: 100%; width: 100%; padding: 20px; animation: fadeIn 0.3s ease; }
        .active { display: flex; }
        @keyframes fadeIn { from {opacity: 0} to {opacity: 1} }

        /* МЕНЮ И КНОПКИ */
        .btn { background: #00a884; color: #fff; border: none; padding: 15px; border-radius: 10px; font-weight: bold; cursor: pointer; margin: 10px 0; font-size: 16px; text-transform: uppercase; }
        .btn:disabled { background: #333; }
        .stats { background: #202c33; padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: center; }
        
        /* ИГРОВОЕ ПОЛЕ */
        #battle-field { position: relative; width: 300px; height: 300px; margin: 20px auto; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px; }
        .zone { background: #2a3942; border: 2px dashed #444; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; transition: 0.2s; }
        .zone:hover { background: #3b4a54; }
        .player-hub { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; background: #00a884; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10; border: 4px solid #fff; font-size: 10px; text-align: center; }

        /* ЧАТ */
        #chat-window { flex: 1; overflow-y: auto; background: #000; padding: 10px; border-radius: 10px; margin-bottom: 10px; }
        #chat-input { background: #2a3942; border: none; color: #fff; padding: 12px; border-radius: 5px; width: 100%; }

        /* АНИМАЦИЯ ПУЛИ */
        .bullet { position: absolute; width: 15px; height: 15px; background: #ffd700; border-radius: 50%; box-shadow: 0 0 10px #f00; z-index: 100; transition: all 0.5s cubic-bezier(0.6, -0.28, 0.735, 0.045); }
    </style>
</head>
<body>
    <div id="app">
        <div id="scr-reg" class="screen active">
            <h2 style="text-align:center; margin-bottom:30px">РЕГИСТРАЦИЯ</h2>
            <input type="text" id="reg-nick" placeholder="Введи никнейм..." class="btn" style="background:#2a3942; cursor:text">
            <button class="btn" onclick="register()">СОЗДАТЬ АККАУНТ</button>
        </div>

        <div id="scr-menu" class="screen">
            <div class="stats">
                <h3 id="my-nick">...</h3>
                <p>ELO: <span id="my-elo">0</span></p>
            </div>
            <button class="btn" onclick="showScreen('scr-match')">ИГРАТЬ</button>
            <button class="btn" onclick="showScreen('scr-chat')">ЧАТ</button>
            <button class="btn" onclick="showScreen('scr-top')" style="background:#202c33">РЕЙТИНГ ТОП-3</button>
        </div>

        <div id="scr-match" class="screen">
            <button class="btn" onclick="startSearch()">ОНЛАЙН (ПОИСК)</button>
            <button class="btn" onclick="startOffline()">ОФЛАЙН (БОТ)</button>
            <button class="btn" onclick="showScreen('scr-menu')" style="background:transparent">НАЗАД</button>
            <div id="search-status" style="text-align:center; color:#00a884; margin-top:20px"></div>
        </div>

        <div id="scr-battle" class="screen">
            <div id="turn-info" style="text-align:center; font-size:18px; color:#ffd700; margin-bottom:10px">...</div>
            <div id="battle-container" style="position:relative">
                <div id="battle-field">
                    <div class="zone" onclick="doAction(0)" id="z0">1</div>
                    <div class="zone" onclick="doAction(1)" id="z1">2</div>
                    <div class="zone" onclick="doAction(2)" id="z2">3</div>
                    <div class="zone" onclick="doAction(3)" id="z3">4</div>
                    <div id="hero" class="player-hub">ТЫ</div>
                </div>
            </div>
            <div id="timer" style="text-align:center; font-size:24px; font-weight:bold">10</div>
        </div>

        <div id="scr-chat" class="screen">
            <div id="chat-window"></div>
            <input type="text" id="chat-input" placeholder="Сообщение...">
            <button class="btn" onclick="showScreen('scr-menu')" style="margin-top:10px">НАЗАД</button>
        </div>

        <div id="scr-top" class="screen">
            <h2 style="text-align:center">ТОП ЛУЧШИХ</h2>
            <div id="top-list" style="margin-top:20px"></div>
            <button class="btn" onclick="showScreen('scr-menu')">В МЕНЮ</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let myNick = '', myElo = 0, currentRole = '', canClick = false;

        function showScreen(id) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
        }

        function register() {
            const n = document.getElementById('reg-nick').value.trim();
            if(n) socket.emit('reg', n);
        }

        socket.on('reg_ok', (data) => {
            myNick = data.nick; myElo = data.elo;
            document.getElementById('my-nick').innerText = myNick;
            document.getElementById('my-elo').innerText = myElo;
            showScreen('scr-menu');
        });

        socket.on('reg_err', (msg) => alert(msg));

        function startSearch() {
            document.getElementById('search-status').innerText = 'ПОИСК ИГРОКОВ...';
            socket.emit('find_match');
        }

        socket.on('match_found', (data) => {
            document.getElementById('search-status').innerText = 'ИГРОК НАЙДЕН! ЗАПУСК...';
            setTimeout(() => {
                showScreen('scr-battle');
                document.getElementById('hero').innerText = myNick;
            }, 2000);
        });

        socket.on('turn', (d) => {
            document.getElementById('turn-info').innerText = d.isShooter ? 'ТВОЙ ХОД: СТРЕЛЯЙ!' : 'ПРЯЧЬСЯ!';
            currentRole = d.isShooter ? 'shooter' : 'hider';
            canClick = true;
            startTimer(10);
        });

        function startTimer(sec) {
            let t = sec;
            const el = document.getElementById('timer');
            const intr = setInterval(() => {
                t--; el.innerText = t;
                if(t <= 0 || !canClick) clearInterval(intr);
            }, 1000);
        }

        function doAction(zoneIdx) {
            if(!canClick) return;
            canClick = false;
            socket.emit('battle_action', { zone: zoneIdx, role: currentRole });
        }

        socket.on('shot_anim', (d) => {
            const bullet = document.createElement('div');
            bullet.className = 'bullet';
            const hero = document.getElementById('hero').getBoundingClientRect();
            const target = document.getElementById('z' + d.toZone).getBoundingClientRect();
            
            bullet.style.left = '50%'; bullet.style.top = '50%';
            document.getElementById('battle-container').appendChild(bullet);

            setTimeout(() => {
                bullet.style.left = (target.left - hero.left + 140) + 'px';
                bullet.style.top = (target.top - hero.top + 140) + 'px';
            }, 50);

            setTimeout(() => {
                bullet.remove();
                if(d.hit) alert('ПОПАДАНИЕ! ИГРОК УБИТ');
                else alert('ПРОМАХ!');
            }, 600);
        });

        // Чат
        document.getElementById('chat-input').onkeypress = (e) => {
            if(e.key === 'Enter') {
                socket.emit('msg', { n: myNick, t: e.target.value });
                e.target.value = '';
            }
        };
        socket.on('msg', (d) => {
            const win = document.getElementById('chat-window');
            win.innerHTML += \`<div><b>\${d.n}:</b> \${d.t}</div>\`;
            win.scrollTop = win.scrollHeight;
        });

        // Топ
        socket.on('top_list', (list) => {
            const el = document.getElementById('top-list');
            el.innerHTML = list.map((u, i) => \`<div class="stats">\${i+1}. \${u.nick} - ELO: \${u.elo}</div>\`).join('');
        });
        setInterval(() => socket.emit('get_top'), 5000);

        function startOffline() {
            alert('Бот скоро будет готов! Используй онлайн режим пока что.');
        }
    </script>
</body>
</html>
`;

io.on('connection', (socket) => {
    socket.on('reg', (nick) => {
        if (usersDB[nick]) return socket.emit('reg_err', 'Ник занят!');
        usersDB[nick] = { elo: 0, lastSeen: Date.now(), socketId: socket.id };
        socket.nick = nick;
        socket.emit('reg_ok', { nick, elo: 0 });
    });

    socket.on('find_match', () => {
        if (!socket.nick) return;
        waitingRoom.push(socket.id);
        if (waitingRoom.length >= 2) {
            const p1 = waitingRoom.shift();
            const p2 = waitingRoom.shift();
            const matchId = `m_${Date.now()}`;
            activeMatches[matchId] = { p1, p2, turn: p1, shots: 0 };
            
            io.to(p1).emit('match_found', { opp: usersDB[socket.nick].elo });
            io.to(p2).emit('match_found', { opp: usersDB[socket.nick].elo });

            setTimeout(() => {
                io.to(p1).emit('turn', { isShooter: true });
                io.to(p2).emit('turn', { isShooter: false });
            }, 4000);
        }
    });

    socket.on('battle_action', (data) => {
        // Логика выстрела/прятки (упрощенно для примера)
        // В полноценной версии тут сверяются данные обоих игроков
        socket.broadcast.emit('shot_anim', { toZone: data.zone, hit: Math.random() > 0.5 });
    });

    socket.on('msg', (d) => io.emit('msg', d));

    socket.on('get_top', () => {
        const top = Object.entries(usersDB)
            .map(([nick, data]) => ({ nick, elo: data.elo }))
            .sort((a, b) => b.elo - a.elo)
            .slice(0, 3);
        socket.emit('top_list', top);
    });

    socket.on('disconnect', () => {
        waitingRoom = waitingRoom.filter(id => id !== socket.id);
    });
});

app.get('*', (req, res) => res.send(UI));
server.listen(process.env.PORT || 3000);
