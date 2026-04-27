const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    maxHttpBufferSize: 1e6, // 1MB лимит на пакет (защита от тяжелых ГС)
    pingTimeout: 60000 
});

const SERVER_URL = "https://jasmlk-1.onrender.com";
let modCode = Math.random().toString(36).substring(2, 8).toUpperCase();
console.log(`[SYSTEM] FINAL MOD_CODE: ${modCode}`);

// Само-пингер для работы 24/7
setInterval(() => {
    https.get(SERVER_URL, (res) => console.log(`[ALIVE] Status: ${res.statusCode}`)).on('error', (e) => console.log("Ping error"));
}, 600000);

const UI = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CAX CORE v4.0</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: sans-serif; }
        body { background: #0b141a; color: #e9edef; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        #h { padding: 10px 15px; background: #202c33; display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #222; }
        #ch { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; background-image: radial-gradient(#111b21 1px, transparent 0); background-size: 20px 20px; }
        
        /* Сообщения */
        .m { position: relative; padding: 8px 12px; background: #202c33; border-radius: 8px; max-width: 85%; align-self: flex-start; border-left: 3px solid transparent; }
        .m.own { align-self: flex-end; background: #005c4b; }
        .m.mod { border-left-color: #ff4d4d; }
        .m.mod .n { color: #ff4d4d !important; font-weight: bold; }
        .n { font-size: 12px; color: #8696a0; margin-bottom: 4px; display: block; font-weight: bold; }
        .t { font-size: 15px; word-wrap: break-word; }
        .tm { font-size: 10px; opacity: 0.5; float: right; margin-top: 5px; margin-left: 10px; }
        
        /* Реакции */
        .re-container { display: flex; gap: 4px; margin-top: 5px; }
        .re-badge { background: #111b21; border-radius: 10px; padding: 1px 5px; font-size: 11px; border: 1px solid #333; }
        #re-picker { display: none; position: fixed; background: #2a3942; padding: 10px; border-radius: 20px; z-index: 1000; box-shadow: 0 5px 15px #000; }
        #re-picker span { font-size: 20px; cursor: pointer; padding: 5px; }

        /* Игра */
        #game-box { display: none; position: fixed; top: 50px; left: 10px; right: 10px; bottom: 80px; background: rgba(0,0,0,0.9); border: 2px solid #00a884; z-index: 500; border-radius: 10px; }
        #game-canvas { width: 100%; height: 100%; touch-action: none; }
        #close-game { position: absolute; top: 10px; right: 10px; color: #fff; background: #ff4d4d; border: none; padding: 5px 10px; border-radius: 5px; }

        #ty { font-size: 11px; color: #00a884; padding: 5px 15px; height: 20px; font-style: italic; }
        #u { padding: 10px; background: #202c33; display: flex; gap: 10px; align-items: center; }
        input { flex: 1; background: #2a3942; border: none; color: #fff; padding: 12px 15px; border-radius: 20px; outline: none; }
        .btn { background: #00a884; color: #fff; border: none; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        #v.cd { background: #555; pointer-events: none; }
        audio { filter: invert(1); height: 30px; width: 180px; }
    </style>
</head>
<body>
    <div id="h"><div>CAX CORE v4</div><div>PING: <span id="pg">0</span>ms</div></div>
    <div id="ch"></div>
    <div id="ty"></div>
    
    <div id="re-picker">
        <span onclick="addRe('🔥')">🔥</span><span onclick="addRe('👍')">👍</span>
        <span onclick="addRe('❤️')">❤️</span><span onclick="addRe('😂')">😂</span>
    </div>

    <div id="game-box">
        <button id="close-game" onclick="toggleGame(false)">X</button>
        <canvas id="game-canvas"></canvas>
    </div>

    <form id="u">
        <input type="text" id="i" placeholder="Сообщение..." autocomplete="off">
        <div id="v" class="btn">🎙️</div>
        <button type="submit" class="btn">➤</button>
    </form>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io(), ch = document.getElementById('ch'), i = document.getElementById('i'), u = document.getElementById('u'), vBtn = document.getElementById('v');
        const canvas = document.getElementById('game-canvas'), ctx = canvas.getContext('2d');
        
        let nick = localStorage.getItem('nx');
        if(!nick) {
            nick = prompt('ВВЕДИ НИК:') || 'LE-GUEST-' + Math.floor(Math.random()*9999);
            localStorage.setItem('nx', nick);
        }

        let isMod = false, currentReId = null, players = {}, myColor = '#' + Math.floor(Math.random()*16777215).toString(16);

        // Старт регистрации
        socket.emit('reg', nick);

        u.onsubmit = (e) => {
            e.preventDefault();
            const val = i.value.trim();
            if(!val) return;
            if(val.startsWith('/mod')) socket.emit('auth', val.split(' ')[1]);
            else if(val === '/dice') socket.emit('dice');
            else if(val === '/game') toggleGame(true);
            else if(val === '/online') socket.emit('get_on');
            else socket.emit('m', { id: Date.now(), n: nick, t: val });
            i.value = '';
        };

        socket.on('m', (d) => {
            const div = document.createElement('div');
            div.id = 'm-' + d.id;
            div.className = 'm' + (d.n === nick ? ' own' : '') + (d.mod ? ' mod' : '') + (d.sys ? ' sys' : '');
            div.oncontextmenu = (e) => { e.preventDefault(); currentReId = d.id; document.getElementById('re-picker').style.display='block'; document.getElementById('re-picker').style.top=e.pageY+'px'; document.getElementById('re-picker').style.left=e.pageX+'px'; };
            
            let content = d.t ? \`<div class="t">\${d.t}</div>\` : \`<audio src="\${d.a}" controls></audio>\`;
            div.innerHTML = \`<span class="n">\${d.n}</span>\${content}<div class="re-container" id="re-cnt-\${d.id}"></div><span class="tm">\${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>\`;
            ch.appendChild(div);
            ch.scrollTop = ch.scrollHeight;
        });

        // Реакции
        function addRe(emoji) {
            socket.emit('react', { msgId: currentReId, emoji: emoji, user: nick });
            document.getElementById('re-picker').style.display = 'none';
        }
        socket.on('re_up', (d) => {
            const c = document.getElementById('re-cnt-' + d.msgId);
            if(c) {
                let b = document.createElement('span'); b.className='re-badge'; b.innerText = d.emoji;
                c.appendChild(b);
            }
        });

        // Игра /game
        function toggleGame(show) {
            const box = document.getElementById('game-box');
            box.style.display = show ? 'block' : 'none';
            if(show) {
                canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
                socket.emit('game_join', { color: myColor, x: 50, y: 50 });
            }
        }

        canvas.addEventListener('touchmove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            socket.emit('game_move', { x, y });
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if(e.buttons !== 1) return;
            const rect = canvas.getBoundingClientRect();
            socket.emit('game_move', { x: e.clientX - rect.left, y: e.clientY - rect.top });
        });

        socket.on('game_up', (data) => {
            players = data;
            ctx.clearRect(0,0,canvas.width, canvas.height);
            for(let id in players) {
                ctx.fillStyle = players[id].color;
                ctx.beginPath(); ctx.arc(players[id].x, players[id].y, 15, 0, Math.PI*2); ctx.fill();
                ctx.font = "10px Arial"; ctx.fillText(players[id].n, players[id].x - 10, players[id].y - 20);
            }
        });

        socket.on('mod_ok', () => { isMod = true; alert('MODERATOR ON'); });
        socket.on('sys', (t) => alert(t));

        setInterval(() => { const s = Date.now(); socket.emit('p', () => { document.getElementById('pg').innerText = Date.now() - s; }); }, 2000);

        // Голосовые с КД 30 сек
        let lastVoice = 0;
        vBtn.onpointerdown = async (e) => {
            if(Date.now() - lastVoice < 30000) return alert('КД на ГС: 30 сек!');
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            const rc = new MediaRecorder(s); const ck = [];
            rc.ondataavailable = e => ck.push(e.data);
            rc.onstop = () => {
                const b = new Blob(ck, { type: 'audio/ogg' });
                const rd = new FileReader();
                rd.onloadend = () => { socket.emit('m', { id: Date.now(), n: nick, a: rd.result }); lastVoice = Date.now(); };
                rd.readAsDataURL(b);
                s.getTracks().forEach(t => t.stop());
            };
            rc.start(); vBtn.style.background = '#f00';
            vBtn.onpointerup = () => { rc.stop(); vBtn.style.background = '#00a884'; };
        };
    </script>
</body>
</html>
`;

const users = new Map();
const gamePlayers = {};
const diceCooldowns = new Map();
const reactionsMap = new Map(); // msgId_user -> true

io.on('connection', (socket) => {
    socket.on('reg', (n) => users.set(socket.id, n));

    socket.on('auth', (c) => { if(c === modCode) { socket.isMod = true; socket.emit('mod_ok'); } });

    socket.on('dice', () => {
        const last = diceCooldowns.get(socket.id) || 0;
        if(Date.now() - last < 10000) return;
        diceCooldowns.set(socket.id, Date.now());
        io.emit('m', { id: Date.now(), n: 'GAME', t: users.get(socket.id) + ' выбросил: ' + (Math.floor(Math.random()*100)+1), sys: true });
    });

    socket.on('m', (d) => {
        if(d.a && d.a.length > 1000000) return; // Защита от гигантских ГС
        io.emit('m', { ...d, mod: socket.isMod });
    });

    socket.on('react', (d) => {
        const key = `${d.msgId}_${socket.id}`;
        if(reactionsMap.has(key)) return;
        reactionsMap.set(key, true);
        io.emit('re_up', d);
    });

    // GAME LOGIC
    socket.on('game_join', (d) => {
        gamePlayers[socket.id] = { n: users.get(socket.id), color: d.color, x: d.x, y: d.y };
        io.emit('game_up', gamePlayers);
    });

    socket.on('game_move', (d) => {
        if(gamePlayers[socket.id]) {
            gamePlayers[socket.id].x = d.x;
            gamePlayers[socket.id].y = d.y;
            io.emit('game_up', gamePlayers);
        }
    });

    socket.on('p', (cb) => cb());
    socket.on('disconnect', () => {
        delete gamePlayers[socket.id];
        users.delete(socket.id);
        io.emit('game_up', gamePlayers);
    });
});

app.get('/', (req, res) => res.send(UI));
server.listen(process.env.PORT || 3000, '0.0.0.0');
