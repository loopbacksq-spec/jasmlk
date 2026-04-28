const socket = io(); // Подключение к Render серверу

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let grid = Array(8).fill().map(() => Array(8).fill(0));
let currentShapes = [];
let score = 0;
let targetScore = 0;
let isDragging = false;
let draggedShape = null;
let dragElement = null;

const GRID_SIZE = 8;
const CELL_SIZE = 40;

// --- ИНИЦИАЛИЗАЦИЯ ИГРЫ ---
function startOfflineGame() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    
    // Рассчитываем цель (зависит от ELO и LVL)
    let lvl = Math.floor(elo / 10) + 1;
    targetScore = 500 + (lvl * 150) + (elo * 5);
    
    score = 0;
    grid = Array(8).fill().map(() => Array(8).fill(0));
    
    updateGameUI();
    renderGrid();
    generateNewShapes();
}

// --- ГЕНЕРАЦИЯ ФИГУР ---
// Создаем только те фигуры, которые реально поставить (упрощенная логика)
const SHAPE_TYPES = [
    [[1, 1], [1, 1]], // Квадрат
    [[1, 1, 1]],      // Линия 3
    [[1], [1], [1]],   // Вертикаль 3
    [[1, 0], [1, 1]], // L-образная
    [[1]]             // Точка
];

function generateNewShapes() {
    const container = document.getElementById('shapes-container');
    container.innerHTML = '';
    currentShapes = [];

    for (let i = 0; i < 3; i++) {
        let randomType = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
        currentShapes.push(randomType);
        
        let shapeDiv = createShapeElement(randomType, i);
        container.appendChild(shapeDiv);
    }
}

function createShapeElement(shape, index) {
    const div = document.createElement('div');
    div.className = 'shape-item';
    div.dataset.index = index;
    
    shape.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.style.display = 'flex';
        row.forEach(cell => {
            const cellDiv = document.createElement('div');
            cellDiv.className = cell ? 'cell filled' : 'cell empty';
            rowDiv.appendChild(cellDiv);
        });
        div.appendChild(rowDiv);
    });

    // Drag events
    div.addEventListener('mousedown', (e) => startDrag(e, shape, index));
    return div;
}

// --- МЕХАНИКА DRAG & DROP ---
function startDrag(e, shape, index) {
    isDragging = true;
    draggedShape = shape;
    
    // Создаем визуальный клон для перетаскивания
    dragElement = createShapeElement(shape, index);
    dragElement.style.position = 'absolute';
    dragElement.style.pointerEvents = 'none';
    dragElement.style.opacity = '0.8';
    document.body.appendChild(dragElement);
    
    moveDragElement(e);
}

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    moveDragElement(e);
    // Тут можно добавить подсветку на поле (preview)
});

function moveDragElement(e) {
    dragElement.style.left = e.pageX - 20 + 'px';
    dragElement.style.top = e.pageY - 20 + 'px';
}

document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    
    // Проверка: попали ли мы на поле?
    const gridRect = document.getElementById('grid').getBoundingClientRect();
    let col = Math.floor((e.clientX - gridRect.left) / CELL_SIZE);
    let row = Math.floor((e.clientY - gridRect.top) / CELL_SIZE);

    if (canPlace(draggedShape, row, col)) {
        placeShape(draggedShape, row, col);
        checkLines();
        removeShapeFromHand();
    }

    document.body.removeChild(dragElement);
    isDragging = false;
    draggedShape = null;
});

// --- ЛОГИКА ПРАВИЛ ---
function canPlace(shape, row, col) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                let targetR = row + r;
                let targetC = col + c;
                if (targetR < 0 || targetR >= GRID_SIZE || targetC < 0 || targetC >= GRID_SIZE || grid[targetR][targetC]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function placeShape(shape, row, col) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) grid[row + r][col + c] = 1;
        }
    }
    score += 10;
    renderGrid();
    updateGameUI();
}

function checkLines() {
    let rowsToDelete = [];
    let colsToDelete = [];

    // Проверка строк
    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(cell => cell === 1)) rowsToDelete.push(r);
    }

    // Проверка столбцов
    for (let c = 0; c < GRID_SIZE; c++) {
        let colFull = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (!grid[r][c]) colFull = false;
        }
        if (colFull) colsToDelete.push(c);
    }

    // Удаление и начисление очков
    rowsToDelete.forEach(r => grid[r].fill(0));
    colsToDelete.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) grid[r][c] = 0;
    });

    if (rowsToDelete.length > 0 || colsToDelete.length > 0) {
        score += (rowsToDelete.length + colsToDelete.length) * 100;
        renderGrid();
        updateGameUI();
        checkWinCondition();
    }
}

// --- ОНЛАЙН ПОИСК (SOCKET.IO) ---
function startMatchmaking() {
    document.getElementById('search-animation').style.display = 'block';
    socket.emit('findMatch', { nick: nickname, elo: elo });
}

socket.on('matchFound', (data) => {
    document.getElementById('search-animation').innerHTML = `
        <h3>Соперник найден!</h3>
        <p>${data.players[0].nick} vs ${data.players[1].nick}</p>
    `;
    setTimeout(() => {
        initOnlineGame(data);
    }, 5000);
});
