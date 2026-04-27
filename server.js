const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- ГЕНЕРАЦИЯ КОДА МОДЕРАТОРА ---
let currentModCode = Math.random().toString(36).substring(2, 8).toUpperCase();
console.log(`[SYSTEM] INITIAL MOD_CODE: ${currentModCode}`);
setInterval(() => {
    currentModCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log(`[SYSTEM] NEW MOD_CODE: ${currentModCode}`);
}, 3600000);

// --- ГЛАВНЫЙ ИНТЕРФЕЙС (UI) ---
const UI = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CAX CORE v3</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { 
            background-color: #0b141a; 
            background-image: radial-gradient(#111b21 1px, transparent 0);
            background-size: 20px 20px;
            color: #e9edef; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; height: 100vh; overflow: hidden; display: flex; flex-direction: column; 
        }
        #h { padding: 10px 15px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; font-size: 11px; background: #202c33; color: #8696a0; }
        #s { color: #00a884; font-weight: bold; }
        #ch { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        
        .m { position: relative; padding: 8px 12px; background: #202c33; border-radius: 8px; max-width: 85%; align-self: flex-start; transition: transform 0.2s; touch-action: pan-x; border-left: 3px solid transparent; }
        .m.own { align-self: flex-end; background: #005c4b; }
        .m.mod { border-left-color: #ff4d4d; }
        .m.mod .n { color: #ff4d4d !important; font-weight: bold; }
        .n { font-size: 12px; color: #8696a0; margin-bottom: 4px; display: block; text-transform: uppercase; }
        .t { font-size: 15px; line-height: 1.4; word-wrap: break-word; }
        .tm { font-size: 10px; opacity: 0.5; float: right; margin-top: 5px; margin-left: 10px; }
        
        .rep { background: rgba(0,0,0,0.2); border-left: 3px solid #00a884; padding: 5px 8px; margin-bottom: 5px; font-size: 12px; border-radius: 4px; color: #8696a0; }
        #ty { font-size: 11px; color: #00a884; padding: 5px 15px; height: 22px; font-weight: 500; }
        
        #u { padding: 10px; background: #202c33; display: flex; flex-direction: column; gap: 8px; }
        #rp-ui { display: none; background: #111b21; padding: 10px; border-left: 4px solid #00a884; font-size: 13px; position: relative; border-radius: 4px 4px 0 0; }
        #rp-ui span { position: absolute; right: 10px; top: 10px; cursor: pointer; opacity: 0.7; }
        
        #row { display: flex; gap: 10px; align-items: center; }
        input { flex: 1; background: #2a3942; border: none; color: #fff; padding: 12px 15px; border-radius: 20px; outline: none; font-size: 16px; }
        input.err { color: #ff4d4d; }
        .btn { background: #00a884; color: #fff; border: none; padding: 10px; border-radius: 50%; width: 45px; height: 45px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        #r.act { background: #ff4d4d; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        audio { filter: invert(1) hue-rotate(180deg); height: 35px; width: 200px; margin-top: 5px; }
    </style>
</head>
<body>
    <div id="h"><div>CAX_v3.1_CORE</div><div>PING: <span id="pg">0</span>ms | <span id="s">ONLINE</span></div></div>
    <div id="ch"></div>
    <div id="ty"></div>
    <div id="rp-ui">
        <div id="rp-txt" style="color:#00a884; font-weight:bold;"></div>
        <div id="rp-msg" style="opacity:0.6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
        <span onclick="cncl()">✕</span>
    </div>
    <form id="u">
        <div id="row">
            <input type="text" id="i" placeholder="Сообщение..." autocomplete="off">
            <div id="r" class="btn">🎙️</div>
            <button type="submit" class="btn">➤</button>
        </div>
    </form>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io(), ch = document.getElementById('ch'), i = document.getElementById('i'), u = document.getElementById('u'), r = document.getElementById('r');
        let nick = localStorage.getItem('nx') || prompt('ТВОЙ НИК:');
        let isMod = false, replying = null;

        if(!nick) location.reload();

        socket.emit('reg', nick, (res) => {
            if(!res.ok) { alert(res.msg); location.reload(); }
        });

        // Индикатор набора
        let tT;
        i.oninput = () => {
            i.classList.toggle('err', i.value.length > 300);
            clearTimeout(tT);
            socket.emit('t', true);
            tT = setTimeout(() => socket.emit('t', false), 1500);
        };

        function cncl() { replying = null; document.getElementById('rp-ui').style.display = 'none'; }

        u.onsubmit = (e) => {
            e.preventDefault();
            const v = i.value.trim();
            if (!v || v.length > 300) return;

            if (v.startsWith('/')) {
                const p = v.split(' ');
                if (p[0] === '/mod') socket.emit('auth', p[1]);
                if (p[0] === '/online') socket.emit('get_on');
                if (p[0] === '/clear') ch.innerHTML = '';
                if (p[0] === '/new') { localStorage.clear(); location.reload(); }
                i.value = ''; return;
            }

            socket.emit('m', { n: nick, t: v, rp: replying });
            i.value = ''; cncl();
        };

        socket.on('m', (d) => {
            if(d.sys && !isMod && d.n === 'SYSTEM') return; // Приватность /online
            const div = document.createElement('div');
            div.className = 'm' + (d.n === nick ? ' own' : '') + (d.mod ? ' mod' : '');
            
            // Swipe to reply
            let sX = 0;
            div.ontouchstart = e => sX = e.touches[0].clientX;
            div.ontouchmove = e => {
                let dX = e.touches[0].clientX - sX;
                if (dX > 60) { 
                    replying = { n: d.n, t: d.t || '🎤 Голосовое' };
                    document.getElementById('rp-txt').innerText = d.n;
                    document.getElementById('rp-msg').innerText = replying.t;
                    document.getElementById('rp-ui').style.display = 'block';
                    div.style.transform = 'translateX(0)';
                }
                if (dX > 0 && dX < 80) div.style.transform = \`translateX(\${dX}px)\`;
            };
            div.ontouchend = () => div.style.transform = 'translateX(0)';

            let rH = d.rp ? \`<div class="rep"><b>\${d.rp.n}</b><br>\${d.rp.t}</div>\` : '';
            let c = d.t ? \`<div class="t">\${d.t}</div>\` : \`<audio src="\${d.a}" controls></audio>\`;
            div.innerHTML = \`\${rH}<span class="n">\${d.n}</span>\${c}<span class="tm">\${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>\`;
            ch.appendChild(div);
            ch.scrollTop = ch.scrollHeight;
        });

        socket.on('mod_ok', () => { isMod = true; alert('MODERATOR: ON'); });
        socket.on('t_st', (list) => {
            document.getElementById('ty').innerText = list.length > 0 ? 'Печатают: ' + list.join(', ') : '';
        });

        setInterval(() => { const st = Date.now(); socket.emit('p', () => { document.getElementById('pg').innerText = Date.now() - st; }); }, 2000);

        // Voice
        let rc;
        r.onpointerdown = async (e) => {
            e.preventDefault();
            try {
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
                rc.start(); r.classList.add('act');
            } catch(e) { alert('Микрофон недоступен'); }
        };
        r.onpointerup = () => { if(rc) rc.stop(); r.classList.remove('act'); };
    </script>
</body>
</html>
`;

// --- СЕРВЕРНАЯ ЛОГИКА (ГЛАВНОЕ) ---

// 1. СТРОГИЙ МАРШРУТ ДЛЯ RENDER (ДОЛЖЕН БЫТЬ ПЕРВЫМ)
app.get('/', (req, res) => {
    res.send(UI);
});

const users = new Map();
const typing = new Set();

io.on('connection', (socket) => {
    let myN = '';

    socket.on('reg', (n, cb) => {
        const clean = String(n).substring(0, 15).trim();
        if (Array.from(users.values()).includes(clean)) {
            return cb({ ok: false, msg: 'НИК ЗАНЯТ' });
        }
        myN = clean;
        users.set(socket.id, myN);
        cb({ ok: true });
    });

    socket.on('auth', (code) => {
        if (code === currentModCode) {
            socket.isMod = true;
            socket.emit('mod_ok');
        }
    });

    socket.on('get_on', () => {
        if (socket.isMod) {
            const list = Array.from(users.values()).join(', ');
            socket.emit('m', { n: 'SYSTEM', t: 'ОНЛАЙН (' + users.size + '): ' + list, mod: true, sys: true });
        }
    });

    socket.on('t', (st) => {
        if (st) typing.add(myN); else typing.delete(myN);
        const list = Array.from(typing).filter(n => n !== myN);
        socket.broadcast.emit('t_st', list);
    });

    socket.on('m', (d) => {
        if (d.t && d.t.length > 300) return;
        io.emit('m', { ...d, mod: socket.isMod });
    });

    socket.on('p', (cb) => { if(typeof cb === 'function') cb(); });
    
    socket.on('disconnect', () => {
        users.delete(socket.id);
        typing.delete(myN);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[CORE] SERVER RUNNING ON PORT ${PORT}`);
});
