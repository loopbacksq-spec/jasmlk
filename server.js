const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- ГЕНЕРАЦИЯ МОДЕР-КОДА (смотри в Logs на Render) ---
let modCode = Math.random().toString(36).substring(2, 8).toUpperCase();
console.log(`[SYSTEM] CURRENT MOD_CODE: ${modCode}`);
setInterval(() => {
    modCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log(`[SYSTEM] NEW MOD_CODE: ${modCode}`);
}, 3600000);

const UI = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CAX CORE v3.2</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { background: #0b141a; color: #e9edef; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        #h { padding: 10px 15px; background: #202c33; display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #222; color: #8696a0; }
        #ch { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; background-image: radial-gradient(#111b21 1px, transparent 0); background-size: 20px 20px; }
        .m { position: relative; padding: 8px 12px; background: #202c33; border-radius: 8px; max-width: 85%; align-self: flex-start; border-left: 3px solid transparent; transition: 0.2s; }
        .m.own { align-self: flex-end; background: #005c4b; }
        .m.mod { border-left: 3px solid #ff4d4d; }
        .m.mod .n { color: #ff4d4d !important; font-weight: bold; }
        .n { font-size: 12px; color: #8696a0; margin-bottom: 4px; text-transform: uppercase; display: block; }
        .t { font-size: 15px; line-height: 1.4; word-wrap: break-word; }
        .tm { font-size: 10px; opacity: 0.5; float: right; margin-top: 5px; margin-left: 10px; }
        #u { padding: 10px; background: #202c33; display: flex; gap: 10px; align-items: center; }
        input { flex: 1; background: #2a3942; border: none; color: #fff; padding: 12px 15px; border-radius: 20px; outline: none; font-size: 16px; }
        .btn { background: #00a884; color: #fff; border: none; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        audio { filter: invert(1); height: 35px; width: 200px; }
    </style>
</head>
<body>
    <div id="h"><div>CAX_v3.2</div><div>PING: <span id="pg">0</span>ms</div></div>
    <div id="ch"></div>
    <form id="u">
        <input type="text" id="i" placeholder="Сообщение..." autocomplete="off">
        <div id="v" class="btn">🎙️</div>
        <button type="submit" class="btn">➤</button>
    </form>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io(), ch = document.getElementById('ch'), i = document.getElementById('i'), u = document.getElementById('u'), vBtn = document.getElementById('v');
        let nick = localStorage.getItem('nx') || prompt('НИК:') || 'USER_' + Math.floor(Math.random()*999);
        localStorage.setItem('nx', nick);

        socket.emit('reg', nick, (res) => {
            if(!res.ok) { 
                nick = nick + '_' + Math.floor(Math.random()*99); 
                localStorage.setItem('nx', nick); 
                alert('Был конфликт ников, твой ник теперь: ' + nick);
            }
        });

        u.onsubmit = (e) => {
            e.preventDefault();
            const val = i.value.trim();
            if(!val) return;
            if(val.startsWith('/mod')) socket.emit('auth', val.split(' ')[1]);
            else socket.emit('m', { n: nick, t: val });
            i.value = '';
        };

        socket.on('m', (d) => {
            const div = document.createElement('div');
            div.className = 'm' + (d.n === nick ? ' own' : '') + (d.mod ? ' mod' : '');
            let content = d.t ? \`<div class="t">\${d.t}</div>\` : \`<audio src="\${d.a}" controls></audio>\`;
            div.innerHTML = \`<span class="n">\${d.n}</span>\${content}<span class="tm">\${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>\`;
            ch.appendChild(div);
            ch.scrollTop = ch.scrollHeight;
        });

        setInterval(() => { const s = Date.now(); socket.emit('p', () => { document.getElementById('pg').innerText = Date.now() - s; }); }, 2000);

        let rc;
        vBtn.onpointerdown = async (e) => {
            e.preventDefault();
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            rc = new MediaRecorder(s); const ck = [];
            rc.ondataavailable = e => ck.push(e.data);
            rc.onstop = () => {
                const b = new Blob(ck, { type: 'audio/ogg' });
                const rd = new FileReader();
                rd.onloadend = () => socket.emit('m', { n: nick, a: rd.result });
                rd.readAsDataURL(b);
                s.getTracks().forEach(t => t.stop());
            };
            rc.start(); vBtn.style.background = '#f00';
        };
        vBtn.onpointerup = () => { if(rc) rc.stop(); vBtn.style.background = '#00a884'; };
    </script>
</body>
</html>
`;

const users = new Map();

io.on('connection', (socket) => {
    socket.on('reg', (n, cb) => {
        const taken = Array.from(users.values()).includes(n);
        if(taken) return cb({ ok: false });
        users.set(socket.id, n);
        cb({ ok: true });
    });

    socket.on('auth', (c) => { if(c === modCode) socket.isMod = true; });

    socket.on('m', (d) => {
        if(d.t && d.t.length > 300) return;
        io.emit('m', { ...d, mod: socket.isMod });
    });

    socket.on('p', (cb) => cb());
    socket.on('disconnect', () => users.delete(socket.id));
});

app.get('/', (req, res) => res.send(UI));
server.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('CORE v3.2 READY'));
