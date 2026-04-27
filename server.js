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
const users = new Map();
const players = {};
const reactionsMap = new Map(); 
const diceCooldowns = new Map();
const voiceCooldowns = new Map();

console.log("MOD_CODE: " + modCode);

setInterval(() => {
    https.get(SERVER_URL, (res) => {}).on('error', (e) => {});
}, 600000);

const UI = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CAX CORE</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #0b141a; color: #e9edef; height: 100vh; display: flex; justify-content: center; overflow: hidden; }
        #app { width: 100%; max-width: 500px; height: 100vh; display: flex; flex-direction: column; background: #0b141a; position: relative; }
        header { padding: 12px 15px; background: #202c33; display: flex; justify-content: space-between; font-size: 12px; }
        #chat { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 12px; }
        .msg { padding: 8px 12px; background: #202c33; border-radius: 8px; max-width: 80%; align-self: flex-start; }
        .msg.own { align-self: flex-end; background: #005c4b; }
        .msg.mod { border-left: 4px solid #ff4d4d; }
        .msg.sys { align-self: center; background: rgba(32, 44, 51, 0.9); border: 1px solid #00a884; color: #00a884; font-size: 13px; }
        .name { font-size: 12px; color: #8696a0; font-weight: bold; margin-bottom: 4px; display: block; }
        .text { font-size: 15px; word-wrap: break-word; }
        .re-box { display: flex; gap: 4px; margin-top: 6px; }
        .re-item { background: #111b21; border-radius: 10px; padding: 2px 6px; font-size: 12px; border: 1px solid #333; }
        #re-menu { display: none; position: fixed; background: #2a3942; border-radius: 20px; padding: 10px; z-index: 2000; }
        #re-menu span { font-size: 22px; cursor: pointer; padding: 5px; }
        #game-window { display: none; position: absolute; top: 50px; left: 50%; transform: translateX(-50%); width: 320px; height: 480px; background: #000; border: 3px solid #00a884; border-radius: 15px; z-index: 1000; }
        #game-canvas { width: 320px; height: 480px; touch-action: none; }
        .close-btn { position: absolute; top: 10px; right: 10px; background: #ff4d4d; color: white; border: none; padding: 5px 10px; border-radius: 5px; }
        #input-area { padding: 10px; background: #202c33; display: flex; gap: 10px; align-items: center; }
        #msg-input { flex: 1; background: #2a3942; border: none; color: #fff; padding: 12px 18px; border-radius: 25px; outline: none; }
        .btn { background: #00a884; color: #fff; border: none; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        audio { filter: invert(1); height: 35px; width: 200px; }
    </style>
</head>
<body>
    <div id="app">
        <header><div>CAX CORE v4.3</div><div>PING: <span id="pg">0</span>ms</div></header>
        <div id="chat"></div>
        <div id="re-menu">
            <span onclick="sendR('🔥')">🔥</span><span onclick="sendR('👍')">👍</span>
            <span onclick="sendR('❤️')">❤️</span><span onclick="sendR('😂')">😂</span>
        </div>
        <div id="game-window">
            <button class="close-btn" onclick="toggleG(false)">X</button>
            <canvas id="game-canvas" width="320" height="480"></canvas>
        </div>
        <form id="input-area">
            <input type="text" id="msg-input" placeholder="Сообщение..." autocomplete="off">
            <div id="v-btn" class="btn">🎙️</div>
            <button type="submit" class="btn">➤</button>
        </form>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io(), chat = document.getElementById('chat'), input = document.getElementById('msg-input'), vBtn = document.getElementById('v-btn');
        const canvas = document.getElementById('game-canvas'), ctx = canvas.getContext('2d');
        let nick = localStorage.getItem('nx') || prompt('НИК:') || 'USER_' + Math.floor(Math.random()*999);
        localStorage.setItem('nx', nick);
        let activeG = false, players = {}, curId = null, myCol = '#'+Math.floor(Math.random()*16777215).toString(16);
        socket.emit('register', nick);
        document.getElementById('input-area').onsubmit = (e) => {
            e.preventDefault();
            const val = input.value.trim();
            if(!val) return;
            if(val.startsWith('/mod')) socket.emit('auth', val.split(' ')[1]);
            else if(val === '/dice') socket.emit('dice');
            else if(val === '/game') toggleG(true);
            else socket.emit('msg', { id: Date.now(), n: nick, t: val });
            input.value = '';
        };
        socket.on('msg', (d) => {
            const div = document.createElement('div');
            div.id = 'm-' + d.id;
            div.className = 'msg' + (d.n === nick ? ' own' : '') + (d.mod ? ' mod' : '') + (d.sys ? ' sys' : '');
            div.oncontextmenu = (e) => { e.preventDefault(); curId = d.id; const m = document.getElementById('re-menu'); m.style.display='block'; m.style.top=e.pageY+'px'; m.style.left=e.pageX+'px'; };
            let c = d.t ? \`<div class="text">\${d.t}</div>\` : \`<audio src="\${d.a}" controls></audio>\`;
            div.innerHTML = \`<span class="name">\${d.n}</span>\${c}<div class="re-box" id="re-cnt-\${d.id}"></div>\`;
            chat.appendChild(div); chat.scrollTop = chat.scrollHeight;
        });
        function sendR(e) { socket.emit('react', { msgId: curId, emoji: e, user: nick }); document.getElementById('re-menu').style.display='none'; }
        socket.on('re_up', (d) => { const c = document.getElementById('re-cnt-'+d.msgId); if(c){ const s = document.createElement('span'); s.className='re-item'; s.innerText=d.emoji; c.appendChild(s); } });
        function toggleG(s) { activeG = s; document.getElementById('game-window').style.display = s ? 'block' : 'none'; if(s) socket.emit('g_join', { c: myCol }); }
        function move(e) {
            if(!activeG) return;
            const r = canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
            if(players[socket.id]) { players[socket.id].x = x; players[socket.id].y = y; }
            socket.emit('g_move', { x, y }); drawG();
        }
        canvas.addEventListener('mousemove', (e) => e.buttons === 1 && move(e));
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); move(e); }, {passive: false});
        function drawG() {
            ctx.clearRect(0,0,320,480);
            for(let id in players) {
                const p = players[id]; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='#fff'; ctx.font='10px Arial'; ctx.fillText(p.n, p.x-15, p.y-20);
            }
        }
        socket.on('g_sync', (d) => { players = d; drawG(); });
        setInterval(() => { const s = Date.now(); socket.emit('ping_c', () => { document.getElementById('pg').innerText = Date.now()-s; }); }, 2000);
        document.addEventListener('click', () => document.getElementById('re-menu').style.display='none');
        let rec, vCD = false;
        vBtn.onpointerdown = async (e) => {
            if(vCD) return alert('КД 30 сек');
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            rec = new MediaRecorder(s); const ck = [];
            rec.ondataavailable = (e) => ck.push(e.data);
            rec.onstop = () => {
                const b = new Blob(ck, { type: 'audio/ogg' });
                const rd = new FileReader();
                rd.onloadend = () => { socket.emit('msg', { id: Date.now(), n: nick, a: rd.result }); vCD = true; setTimeout(()=>vCD=false, 30000); };
                rd.readAsDataURL(b); s.getTracks().forEach(t => t.stop());
            };
            rec.start(); vBtn.style.background = '#ff4d4d';
        };
        vBtn.onpointerup = () => { if(rec) rec.stop(); vBtn.style.background = '#00a884'; };
    </script>
</body>
</html>
`;

io.on('connection', (socket) => {
    socket.on('register', (n) => users.set(socket.id, n));
    socket.on('auth', (c) => { if(c === modCode) { socket.isMod = true; socket.emit('msg', {id:1, n:'SYS', t:'MOD OK', sys:true}); } });
    socket.on('msg', (d) => {
        if(d.a) {
            const last = voiceCooldowns.get(socket.id) || 0;
            if(Date.now() - last < 30000) return;
            voiceCooldowns.set(socket.id, Date.now());
        }
        io.emit('msg', { ...d, mod: socket.isMod });
    });
    socket.on('react', (d) => {
        const key = d.msgId + '_' + socket.id;
        if(reactionsMap.has(key)) return;
        reactionsMap.set(key, true);
        io.emit('re_up', d);
    });
    socket.on('dice', () => {
        const last = diceCooldowns.get(socket.id) || 0;
        if(Date.now() - last < 10000) return;
        diceCooldowns.set(socket.id, Date.now());
        io.emit('msg', { id: Date.now(), n: 'SYS', t: users.get(socket.id) + ' выбросил: ' + (Math.floor(Math.random()*100)+1), sys: true });
    });
    socket.on('g_join', (d) => { players[socket.id] = { n: users.get(socket.id), c: d.c, x: 160, y: 240 }; io.emit('g_sync', players); });
    socket.on('g_move', (d) => { if(players[socket.id]) { players[socket.id].x = d.x; players[socket.id].y = d.y; socket.broadcast.emit('g_sync', players); } });
    socket.on('ping_c', (cb) => cb());
    socket.on('disconnect', () => { delete players[socket.id]; users.delete(socket.id); io.emit('g_sync', players); });
});

app.get('*', (req, res) => res.send(UI));
server.listen(process.env.PORT || 3000, '0.0.0.0');
