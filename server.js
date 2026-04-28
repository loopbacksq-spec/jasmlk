const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });

let usersDB = {}; 
let waitingRoom = []; 
let activeMatches = {}; 
const SERVER_URL = "https://jasmlk-1.onrender.com";

setInterval(() => {
    const now = Date.now();
    for (let n in usersDB) if (now - usersDB[n].lastSeen > 172800000) delete usersDB[n];
}, 3600000);

setInterval(() => { https.get(SERVER_URL, () => {}).on('error', () => {}); }, 600000);

const UI = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>GHOST SHOT</title>
    <style>
        :root { --p: #00e676; --s: #202c33; --bg: #0b141a; --err: #ff5252; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: var(--bg); color: #fff; height: 100vh; display: flex; justify-content: center; overflow: hidden; }
        
        #app { width: 100%; max-width: 450px; background: var(--bg); height: 100vh; display: flex; flex-direction: column; border-left: 1px solid #222; border-right: 1px solid #222; }
        
        .screen { display: none; flex-direction: column; height: 100%; width: 100%; padding: 25px; animation: slide 0.3s ease; }
        .active { display: flex; }
        @keyframes slide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        /* ИНТЕРФЕЙС */
        .card { background: #111b21; border: 1px solid #2a3942; border-radius: 20px; padding: 20px; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .btn { background: var(--p); color: #000; border: none; padding: 18px; border-radius: 15px; font-weight: 800; cursor: pointer; margin: 8px 0; font-size: 14px; text-transform: uppercase; transition: 0.3s; }
        .btn:active { transform: scale(0.95); opacity: 0.8; }
        .btn-sec { background: #2a3942; color: #fff; }

        /* ПОЛЕ БОЯ */
        #field { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 30px 0; position: relative; }
        .zone { aspect-ratio: 1/1; background: #202c33; border: 2px solid #3b4a54; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; transition: 0.2s; }
        .zone.selected { border-color: var(--p); background: rgba(0,230,118,0.1); }
        .avatar { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 70px; height: 70px; background: var(--p); border-radius: 50%; border: 5px solid var(--bg); box-shadow: 0 0 20px var(--p); z-index: 10; display: flex; align-items: center; justify-content: center; color: #000; font-weight: bold; font-size: 12px; text-align: center; }

        /* ЧАТ */
        #chat-box { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        .chat-m { padding: 10px 15px; border-radius: 15px; max-width: 80%; font-size: 14px; }
        .m-in { background: #202c33; align-self: flex-start; }
        .m-out { background: #005c4b; align-self: flex-end; }

        /* МОДАЛКА СТАТИСТИКИ */
        #modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2000; align-items: center; justify-content: center; padding: 20px; }
        
        .bullet { position: absolute; width: 20px; height: 6px; background: #fff; border-radius: 3px; z-index: 100; box-shadow: 0 0 15px #fff; pointer-events: none; }
    </style>
</head>
<body>
    <div id="app">
        <div id="scr-reg" class="screen active">
            <h1 style="margin-top: 50px; text-align: center;">GHOST<br><span style="color:var(--p)">SHOT</span></h1>
            <div class="card" style="margin-top: 40px;">
                <input type="text" id="nick-in" placeholder="Псевдоним" style="width:100%; background:transparent; border:none; color:#fff; font-size:18px; outline:none; text-align:center;">
            </div>
            <button class="btn" onclick="reg()">НАЧАТЬ ПУТЬ</button>
        </div>

        <div id="scr-menu" class="screen">
            <div class="card">
                <p style="color:#8696a0">ПРОФИЛЬ</p>
                <h2 id="u-nick">...</h2>
                <h1 id="u-elo" style="color:var(--p); font-size:40px">0 ELO</h1>
            </div>
            <button class="btn" onclick="openMatch()">В БОЙ</button>
            <button class="btn btn-sec" onclick="openChat()">ОБЩИЙ ЧАТ</button>
            <button class="btn btn-sec" onclick="openTop()">РЕЙТИНГ</button>
        </div>

        <div id="scr-find" class="screen">
            <h2 style="text-align:center; margin-top:100px;">ПОИСК ЦЕЛИ</h2>
            <div id="loader" style="margin: 40px auto; width: 50px; height: 50px; border: 4px solid #222; border-top-color: var(--p); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <button class="btn btn-sec" onclick="cancelSearch()">ОТМЕНА</button>
            <button class="btn" onclick="startBot()">ИГРАТЬ С БОТОМ</button>
        </div>

        <div id="scr-game" class="screen" style="padding: 15px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span id="opp-info">ОППОНЕНТ: ...</span>
                <span id="timer" style="color:var(--err); font-weight:bold; font-size:20px;">10s</span>
            </div>
            <h2 id="status" style="text-align:center; margin-top:20px; color:var(--p)">ЖДЕМ ХОДА...</h2>
            
            <div id="field-wrap" style="position:relative; margin-top:40px;">
                <div id="field">
                    <div class="zone" onclick="clickZone(0)" id="z0">1</div>
                    <div class="zone" onclick="clickZone(1)" id="z1">2</div>
                    <div class="zone" onclick="clickZone(2)" id="z2">3</div>
                    <div class="zone" onclick="clickZone(3)" id="z3">4</div>
                    <div id="me" class="avatar">Я</div>
                </div>
            </div>
        </div>

        <div id="scr-chat" class="screen">
            <div id="chat-box"></div>
            <div style="display:flex; gap:10px; padding:10px;">
                <input id="chat-in" type="text" placeholder="Сообщение..." style="flex:1; background:#202c33; border:none; border-radius:10px; color:#fff; padding:10px;">
                <button onclick="sendMsg()" class="btn" style="padding:10px 20px; margin:0;">➤</button>
            </div>
            <button class="btn btn-sec" onclick="showScreen('scr-menu')">В МЕНЮ</button>
        </div>

        <div id="scr-top" class="screen">
            <h2>ТОП-3 КИЛЛЕРОВ</h2>
            <div id="top-list" style="margin-top:20px;"></div>
            <button class="btn btn-sec" onclick="showScreen('scr-menu')">НАЗАД</button>
        </div>
    </div>

    <div id="modal">
        <div class="card" style="width:100%; max-width:320px; text-align:center;">
            <h1 id="res-title">ПОБЕДА!</h1>
            <p id="res-elo" style="font-size:24px; margin:20px 0; color:var(--p)">+25 ELO</p>
            <p id="res-stats" style="color:#8696a0">Ходов: 3</p>
            <button class="btn" style="width:100%" onclick="closeBattle()">ВЕРНУТЬСЯ В МЕНЮ</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let myNick = '', myElo = 0, isShooter = false, canMove = false, selZone = -1, battleActive = false;

        function showScreen(id) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
        }

        function reg() {
            const n = document.getElementById('nick-in').value.trim();
            if(n) socket.emit('reg', n);
        }

        socket.on('reg_ok', d => {
            myNick = d.nick; myElo = d.elo;
            document.getElementById('u-nick').innerText = myNick;
            document.getElementById('u-elo').innerText = myElo + ' ELO';
            showScreen('scr-menu');
        });

        socket.on('reg_err', m => alert(m));

        function openMatch() { showScreen('scr-find'); socket.emit('find'); }
        function cancelSearch() { socket.emit('cancel_find'); showScreen('scr-menu'); }
        function startBot() { socket.emit('bot_match'); showScreen('scr-game'); }

        socket.on('match_start', d => {
            battleActive = true;
            document.getElementById('opp-info').innerText = 'ПРОТИВ: ' + d.oppNick;
            showScreen('scr-game');
        });

        socket.on('turn', d => {
            isShooter = d.role === 'shooter';
            canMove = true;
            selZone = -1;
            document.querySelectorAll('.zone').forEach(z => z.classList.remove('selected'));
            document.getElementById('status').innerText = isShooter ? 'ТВОЙ ХОД: СТРЕЛЯЙ!' : 'ПРЯЧЬСЯ!';
            startTimer(10);
        });

        function clickZone(idx) {
            if(!canMove) return;
            selZone = idx;
            document.querySelectorAll('.zone').forEach(z => z.classList.remove('selected'));
            document.getElementById('z'+idx).classList.add('selected');
            canMove = false;
            socket.emit('action', { zone: idx });
            document.getElementById('status').innerText = 'ОЖИДАНИЕ...';
        }

        socket.on('anim', d => {
            const b = document.createElement('div');
            b.className = 'bullet';
            const me = document.getElementById('me').getBoundingClientRect();
            const target = document.getElementById('z'+d.to).getBoundingClientRect();
            
            b.style.left = (me.left + 25) + 'px'; b.style.top = (me.top + 30) + 'px';
            document.body.appendChild(b);

            const angle = Math.atan2(target.top - me.top, target.left - me.left) * 180 / Math.PI;
            b.style.transform = \`rotate(\${angle}deg)\`;

            setTimeout(() => {
                b.style.transition = '0.4s ease-in';
                b.style.left = target.left + 'px'; b.style.top = target.top + 'px';
            }, 50);

            setTimeout(() => { b.remove(); }, 500);
        });

        socket.on('end', d => {
            battleActive = false;
            document.getElementById('modal').style.display = 'flex';
            document.getElementById('res-title').innerText = d.win ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
            document.getElementById('res-title').style.color = d.win ? 'var(--p)' : 'var(--err)';
            document.getElementById('res-elo').innerText = (d.elo > 0 ? '+' : '') + d.elo + ' ELO';
            document.getElementById('res-stats').innerText = \`Ходов сделано: \${d.steps}\`;
            myElo += d.elo;
            document.getElementById('u-elo').innerText = myElo + ' ELO';
        });

        function closeBattle() { document.getElementById('modal').style.display = 'none'; showScreen('scr-menu'); }

        let tInt;
        function startTimer(s) {
            clearInterval(tInt);
            let left = s;
            document.getElementById('timer').innerText = left + 's';
            tInt = setInterval(() => {
                left--;
                document.getElementById('timer').innerText = left + 's';
                if(left <= 0 || !battleActive) clearInterval(tInt);
            }, 1000);
        }

        // Чат
        function openChat() { showScreen('scr-chat'); socket.emit('get_chat'); }
        function sendMsg() { 
            const t = document.getElementById('chat-in').value; 
            if(t) { socket.emit('msg', { n: myNick, t }); document.getElementById('chat-in').value = ''; }
        }
        socket.on('msg', d => {
            const b = document.getElementById('chat-box');
            b.innerHTML += \`<div class="chat-m \${d.n === myNick ? 'm-out' : 'm-in'}"><b>\${d.n}:</b> \${d.t}</div>\`;
            b.scrollTop = b.scrollHeight;
        });

        function openTop() { showScreen('scr-top'); socket.emit('get_top'); }
        socket.on('top_list', l => {
            document.getElementById('top-list').innerHTML = l.map((u, i) => \`<div class="card" style="padding:10px">#\${i+1} \${u.nick} - \${u.elo} ELO</div>\`).join('');
        });
    </script>
</body>
</html>
`;

io.on('connection', (socket) => {
    socket.on('reg', (n) => {
        if (usersDB[n]) return socket.emit('reg_err', 'НИК ЗАНЯТ');
        usersDB[n] = { nick: n, elo: 0, lastSeen: Date.now(), sid: socket.id };
        socket.nick = n; socket.emit('reg_ok', { nick: n, elo: 0 });
    });

    socket.on('find', () => {
        if(!socket.nick) return;
        waitingRoom.push(socket);
        if(waitingRoom.length >= 2) {
            const p1 = waitingRoom.shift(); const p2 = waitingRoom.shift();
            const mid = 'm_' + Date.now();
            activeMatches[mid] = { 
                p1: p1.id, p2: p2.id, 
                p1Data: { nick: p1.nick, sel: -1 }, 
                p2Data: { nick: p2.nick, sel: -1 },
                shooter: p1.id, steps: 0 
            };
            p1.mid = mid; p2.mid = mid;
            p1.emit('match_start', { oppNick: p2.nick });
            p2.emit('match_start', { oppNick: p1.nick });
            startRound(mid);
        }
    });

    socket.on('bot_match', () => {
        const mid = 'bot_' + Date.now();
        activeMatches[mid] = { 
            p1: socket.id, p2: 'bot', 
            p1Data: { nick: socket.nick, sel: -1 }, 
            p2Data: { nick: 'БОТ-УБИЙЦА', sel: -1 },
            shooter: socket.id, steps: 0, isBot: true 
        };
        socket.mid = mid;
        socket.emit('match_start', { oppNick: 'БОТ-УБИЙЦА' });
        startRound(mid);
    });

    function startRound(mid) {
        const m = activeMatches[mid]; if(!m) return;
        m.p1Data.sel = -1; m.p2Data.sel = -1;
        io.to(m.p1).emit('turn', { role: m.shooter === m.p1 ? 'shooter' : 'hider' });
        if(!m.isBot) io.to(m.p2).emit('turn', { role: m.shooter === m.p2 ? 'shooter' : 'hider' });
        else { m.p2Data.sel = Math.floor(Math.random()*4); checkReady(mid); }
    }

    socket.on('action', d => {
        const m = activeMatches[socket.mid]; if(!m) return;
        if(socket.id === m.p1) m.p1Data.sel = d.zone;
        else m.p2Data.sel = d.zone;
        checkReady(socket.mid);
    });

    function checkReady(mid) {
        const m = activeMatches[mid];
        if(m.p1Data.sel !== -1 && m.p2Data.sel !== -1) {
            m.steps++;
            const shootZone = m.shooter === m.p1 ? m.p1Data.sel : m.p2Data.sel;
            const hideZone = m.shooter === m.p1 ? m.p2Data.sel : m.p1Data.sel;
            
            io.to(m.p1).emit('anim', { to: shootZone });
            if(!m.isBot) io.to(m.p2).emit('anim', { to: shootZone });

            setTimeout(() => {
                if(shootZone === hideZone) {
                    const winner = m.shooter;
                    const loser = winner === m.p1 ? m.p2 : m.p1;
                    const eloGain = Math.max(5, 30 - m.steps);
                    
                    if(usersDB[m.p1Data.nick]) usersDB[m.p1Data.nick].elo += (winner === m.p1 ? eloGain : -10);
                    if(!m.isBot && usersDB[m.p2Data.nick]) usersDB[m.p2Data.nick].elo += (winner === m.p2 ? eloGain : -10);
                    
                    io.to(m.p1).emit('end', { win: winner === m.p1, elo: winner === m.p1 ? eloGain : -10, steps: m.steps });
                    if(!m.isBot) io.to(m.p2).emit('end', { win: winner === m.p2, elo: winner === m.p2 ? eloGain : -10, steps: m.steps });
                    delete activeMatches[mid];
                } else {
                    m.shooter = (m.shooter === m.p1 ? m.p2 : m.p1);
                    startRound(mid);
                }
            }, 1000);
        }
    }

    socket.on('msg', d => io.emit('msg', d));
    socket.on('get_top', () => {
        const top = Object.values(usersDB).sort((a,b) => b.elo - a.elo).slice(0,3);
        socket.emit('top_list', top);
    });
    socket.on('cancel_find', () => { waitingRoom = waitingRoom.filter(s => s.id !== socket.id); });
});

app.get('*', (req, res) => res.send(UI));
server.listen(process.env.PORT || 3000);
