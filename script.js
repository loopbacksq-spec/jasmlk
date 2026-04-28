// --- ИНИЦИАЛИЗАЦИЯ ДАННЫХ ---
let userData = {
    nick: localStorage.getItem('block_nick') || '',
    elo: parseInt(localStorage.getItem('block_elo')) || 0,
    lvl: 1
};

const splash = document.getElementById('splash');
const app = document.getElementById('app-container');
const nickModal = document.getElementById('nick-modal');

// --- СТАРТОВАЯ АНИМАЦИЯ ---
window.onload = () => {
    setTimeout(() => {
        splash.style.transition = 'opacity 1s';
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            checkUser();
        }, 1000);
    }, 3000);
};

function checkUser() {
    if (!userData.nick) {
        nickModal.style.display = 'flex';
    } else {
        showApp();
    }
}

document.getElementById('save-nick-btn').onclick = () => {
    const n = document.getElementById('nick-field').value;
    if (n.length > 2) {
        userData.nick = n;
        localStorage.setItem('block_nick', n);
        nickModal.style.display = 'none';
        showApp();
    }
};

function showApp() {
    app.style.display = 'flex';
    updateStatsUI();
    initChat();
}

// --- ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ---
function updateStatsUI() {
    userData.lvl = Math.floor(userData.elo / 10) + 1;
    const eloEl = document.getElementById('elo-val');
    const lvlEl = document.getElementById('lvl-val');
    
    eloEl.innerText = userData.elo;
    lvlEl.innerText = userData.lvl;

    // Смена цвета уровня по твоей схеме
    lvlEl.className = 'stat-value';
    if (userData.lvl <= 50) lvlEl.classList.add('lvl-1');
    else if (userData.lvl <= 150) lvlEl.classList.add('lvl-2');
    else if (userData.lvl <= 500) lvlEl.classList.add('lvl-3');
    else lvlEl.classList.add('lvl-4');
}

// --- ЛОГИКА КНОПОК ---
document.getElementById('open-modes-btn').onclick = () => {
    document.getElementById('mode-selection').style.display = 'flex';
};

function closeModes() {
    document.getElementById('mode-selection').style.display = 'none';
}

// --- МЕХАНИКА ИГРЫ ---
let currentScore = 0;
let target = 0;

function startGame(type) {
    closeModes();
    if (type === 'offline') {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-screen').style.display = 'flex';
        
        // Сложность: чем выше ELO, тем выше планка
        target = 1000 + (userData.lvl * 200);
        document.getElementById('target-score').innerText = target;
        currentScore = 0;
        
        initGrid();
        generateShapes();
    } else {
        startMatchmaking();
    }
}

function initGrid() {
    const gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.id = i;
        gridEl.appendChild(cell);
    }
}

// Пример генерации (заглушка для теста)
function generateShapes() {
    const bench = document.getElementById('shapes-bench');
    bench.innerHTML = '<p style="font-size:12px; opacity:0.5;">Перетащите блоки (в разработке)</p>';
}

function surrender() {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
}

// --- ЧАТ (ЛОКАЛЬНЫЙ 5 СООБЩЕНИЙ) ---
function initChat() {
    const chatIn = document.getElementById('chat-in');
    const chatBox = document.getElementById('chat-messages');

    chatIn.onkeypress = (e) => {
        if (e.key === 'Enter' && chatIn.value.trim()) {
            let logs = JSON.parse(localStorage.getItem('chat_logs') || "[]");
            logs.push({ n: userData.nick, m: chatIn.value });
            if (logs.length > 5) logs.shift();
            localStorage.setItem('chat_logs', JSON.stringify(logs));
            chatIn.value = '';
            renderChat();
        }
    };
    renderChat();
}

function renderChat() {
    const chatBox = document.getElementById('chat-messages');
    let logs = JSON.parse(localStorage.getItem('chat_logs') || "[]");
    chatBox.innerHTML = logs.map(l => `<div><b style="color:#00c6ff">${l.n}:</b> ${l.m}</div>`).join('');
}

// --- ОНЛАЙН МОДУЛЬ ---
function startMatchmaking() {
    document.getElementById('matchmaking').style.display = 'flex';
    // Имитация поиска для теста (в реальности тут socket.emit)
    setTimeout(() => {
        document.getElementById('search-status').innerText = "Соперник: Player_492 (ELO: 120)";
        setTimeout(() => {
            document.getElementById('matchmaking').style.display = 'none';
            alert('Режим Онлайн в разработке: Ожидание API сервера...');
        }, 2000);
    }, 3000);
}
