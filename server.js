const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let modCode = Math.random().toString(36).substring(2, 8).toUpperCase();
console.log(`[SYSTEM] MOD_CODE: ${modCode}`);

const UI = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CAX CORE v3.3</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { background: #0b141a; color: #e9edef; font-family: -apple-system, Segoe UI, Roboto, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        #h { padding: 10px 15px; background: #202c33; display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #222; color: #8696a0; }
        #ch { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 8px; background-image: radial-gradient(#111b21 1px, transparent 0); background-size: 20px 20px; }
        
        .m { position: relative; padding: 8px 12px; background: #202c33; border-radius: 8px; max-width: 85%; align-self: flex-start; transition: transform 0.2s; border-left: 3px solid transparent; }
        .m.own { align-self: flex-end; background: #005c4b; }
        .m.mod { border-left-color: #ff4d4d; }
        .m.sys { align-self: center; background: rgba(255,255,255,0.05); border: none; font-size: 13px; color: #00a884; }
        
        .n { font-size: 12px; color: #8696a0; margin-bottom: 4px; font-weight: bold; display: flex; justify-content: space-between; }
        .rep-btn { cursor: pointer; opacity: 0.5; font-size: 14px; margin-left: 10px; }
        .rep-btn:hover { opacity: 1; }
        
        .t { font-size: 15px; line-height: 1.4; word-wrap: break-word; }
        .tm { font-size: 10px; opacity: 0.5; float: right; margin-top: 5px; margin-left: 10px; }
        
        .reply-box { background: rgba(0,0,0,0.2); border-left: 3px solid #00a884; padding: 5px 8px; margin-bottom: 5px; font-size: 12px; border-radius: 4px; }
        .reactions { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }
        .re-btn { background: #111b21; border-radius: 10px; padding: 2px 6px; font-size: 12px; cursor: pointer; border: 1px solid #333; }
        
        #re-menu { display: none; position: fixed; background: #2a3942; border-radius: 20px; padding: 8px; z-index: 1000; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        #re-menu span { font-size: 20px; cursor: pointer; padding: 5px; }

        #ty { font-size: 11px; color: #00a884; padding: 5px 15px; height: 22px; font-style: italic; }
        
        #u { padding: 10px; background: #202c33; display: flex; flex-direction: column; gap: 8px; }
        #rp-ui { display: none; background: #111b21; padding: 8px; border-left: 4px solid #00a884; position: relative; }
        #row { display: flex; gap: 10px; align-items: center; }
        input { flex: 1; background: #2a3942; border: none; color: #fff; padding: 12px 15px; border-radius: 20px; outline: none; font-size: 16px; }
        .btn { background: #00a884; color: #fff; border: none; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    </style>
</head>
<body>
    <div id="h"><div>CAX_v3.3_PRO</div><div>PING: <span id="pg">0</span>ms</div></div>
    <div id="ch"></div>
    <div id="ty"></div>
    <div id="re-menu">
        <span onclick="react('🔥')">🔥</span><span onclick="react('👍')">👍</span>
        <span onclick="react('❤️')">❤️</span><span onclick="react('😂')">😂</span>
        <span onclick="react('😮')">😮</span><span onclick="react('💩')">💩</span>
    </div>
    <div id="rp-ui">
        <div id="rp-txt" style="font-size:12px; color:#00a884;"></div>
        <span onclick="cncl()" style="position:absolute; right:10px; top:10px; cursor:pointer;">✕</span>
    </div>
    <form id="u">
        <div id="row">
            <input type="text" id="i" placeholder="Сообщение..." autocomplete="off">
            <div id="v" class="btn">🎙️</div>
            <button type="submit" class="btn">➤</button>
        </div>
    </form>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io(), ch = document.getElementById('ch'), i = document.getElementById('i'), u = document.getElementById('u'), vBtn = document.getElementById('v'), reMenu = document.getElementById('re-menu');
        let nick = localStorage.getItem('nx') || prompt('НИК:') || 'USER_' + Math.floor(Math.random()*99);
        localStorage.setItem('nx', nick);
        let isMod = false, replying = null, currentMsgId = null;

        socket.emit('reg', nick);

        // Индикатор набора
        let tT;
        i.oninput = () => {
            socket.emit('t', true);
            clearTimeout(tT);
            tT = setTimeout(() => socket.emit('t', false), 1500);
        };

        function cncl() { replying = null; document.getElementById('rp-ui').style.display = 'none'; }

        u.onsubmit = (e) => {
            e.preventDefault();
            const val = i.value.trim();
            if(!val) return;
            if(val.startsWith('/mod')) socket.emit('auth', val.split(' ')[1]);
            else if(val === '/online') socket.emit('get_on');
            else if(val === '/dice') socket.emit('dice');
            else socket.emit('m', { id: Date.now(), n: nick, t: val, rp: replying });
            i.value = ''; cncl();
        };

        function showRe(e, id) {
            e.preventDefault();
            currentMsgId = id;
            reMenu.style.display = 'block';
            reMenu.style.left = e.pageX + 'px';
            reMenu.style.top = (e.pageY - 50) + 'px';
        }
        document.addEventListener('click', () => reMenu.style.display = 'none');

        function react(emoji) {
            socket.emit('react', { id: currentMsgId, emoji: emoji });
        }

        socket.on('m', (d) => {
            if(d.sys && d.forMod && !isMod) return;
            const div = document.createElement('div');
            div.id = 'msg-' + d.id;
            div.className = 'm' + (d.n === nick ? ' own' : '') + (d.mod ? ' mod' : '') + (d.sys ? ' sys' : '');
            
            // Swipe/Click to reply
            let sX = 0;
            div.ontouchstart = e => sX = e.touches[0].clientX;
            div.ontouchmove = e => {
                let dX = e.touches[0].clientX - sX;
                if (dX > 60) { setRep(d.n, d.t); div.style.transform = 'translateX(0)'; }
                if (dX > 0 && dX < 80) div.style.transform = \`translateX(\${dX}px)\`;
            };
            div.ontouchend = () => div.style.transform = 'translateX(0)';
            div.oncontextmenu = (e) => showRe(e, d.id);

            let rH = d.rp ? \`<div class="reply-box"><b>\${d.rp.n}</b>: \${d.rp.t}</div>\` : '';
            let c = d.t ? \`<div class="t">\${d.t}</div>\` : \`<audio src="\${d.a}" controls></audio>\`;
            let rb = d.sys ? '' : \`<span class="rep-btn" onclick="setRep('\${d.n}', '\${d.t}')">↩</span>\`;
            
            div.innerHTML = \`\${rH}<span class="n">\${d.n} \${rb}</span>\${c}<div class="reactions" id="re-\${d.id}"></div><span class="tm">\${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>\`;
            ch.appendChild(div);
            ch.scrollTop = ch.scrollHeight;
        });

        function setRep(n, t) {
            replying = { n: n, t: t || 'Голосовое' };
            document.getElementById('rp-txt').innerText = 'Ответ: ' + n;
            document.getElementById('rp-ui').style.display = 'block';
        }

        socket.on('re_up', (d) => {
            const container = document.getElementById('re-' + d.id);
            if(container) {
                const span = document.createElement('span');
                span.className = 're-btn';
                span.innerText = d.emoji;
                container.appendChild(span);
            }
        });

        socket.on('mod_ok', () => { isMod = true; alert('MOD ON'); });
        socket.on('t_st', (list) => {
            document.getElementById('ty').innerText = list.length > 0 ? 'Печатают: ' + list.join(', ') : '';
        });

        setInterval(() => { const s = Date.now(); socket.emit('p', () => { document.getElementById('pg').innerText = Date.now() - s; }); }, 2000);

        // Voice
        let rc;
        vBtn.onpointerdown = async (e) => {
            e.preventDefault();
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            rc = new MediaRecorder(s); const ck = [];
            rc.ondataavailable = e => ck.push(e.data);
            rc.onstop = () => {
                const b = new Blob(ck, { type: 'audio/ogg' });
                const rd = new FileReader();
                rd.onloadend = () => socket.emit('m', { id: Date.now(), n: nick, a: rd.result });
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
const typing = new Set();

io.on('connection', (socket) => {
    socket.on('reg', (n) => users.set(socket.id, n));

    socket.on('auth', (c) => { if(c === modCode) { socket.isMod = true; socket.emit('mod_ok'); } });

    socket.on('get_on', () => {
        if(socket.isMod) {
            const list = Array.from(users.values()).join(', ');
            socket.emit('m', { id: Date.now(), n: 'SYSTEM', t: 'ОНЛАЙН ('+users.size+'): '+list, sys: true, forMod: true });
        }
    });

    socket.on('dice', () => {
        const n = users.get(socket.id) || 'USER';
        const num = Math.floor(Math.random() * 100) + 1;
        io.emit('m', { id: Date.now(), n: 'GAME', t: n + ' выбросил число: ' + num, sys: true });
    });

    socket.on('react', (d) => io.emit('re_up', d));

    socket.on('t', (st) => {
        const n = users.get(socket.id);
        if(st) typing.add(n); else typing.delete(n);
        socket.broadcast.emit('t_st', Array.from(typing).filter(x => x));
    });

    socket.on('m', (d) => {
        if(d.t && d.t.length > 300) return;
        io.emit('m', { ...d, mod: socket.isMod });
    });

    socket.on('p', (cb) => cb());
    socket.on('disconnect', () => { typing.delete(users.get(socket.id)); users.delete(socket.id); });
});

app.get('/', (req, res) => res.send(UI));
server.listen(process.env.PORT || 3000, '0.0.0.0');
