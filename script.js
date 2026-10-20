/**
 * Simulador Interativo de Algoritmos de Busca: Busca Gulosa vs A*
 * Matriz 40x40 em HTML5 Canvas simulando uma cidade realista:
 * avenidas (custo 1), ruas (custo 2), quarteirões irregulares com
 * prédios, praças, parques, estacionamentos, becos e ruas sem saída,
 * interdições de via e manchas de congestionamento (custo 3 a 5).
 * A malha viária é gerada de forma "orgânica": espaçamentos variados,
 * avenidas de larguras diferentes, ruas desalinhadas e quarteirões
 * que cresceram sem um plano diretor rígido.
 * A rota final é desenhada como uma linha de GPS e uma ambulância
 * animada "dirige" por ela, desacelerando no trânsito.
 * Movimentação em 4 direções | Heurística: Distância de Manhattan
 */

const GRID_SIZE = 40;
const CANVAS_SIZE = 720; // 720px / 40 = 18px por célula
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;

// Estados das células na matriz
const CELL_STATE = {
    EMPTY: 0,
    WALL: 1,
    EXPLORED_GREEDY: 2,
    PATH_GREEDY: 3,
    EXPLORED_ASTAR: 4,
    PATH_ASTAR: 5
};

// Cores de Alto Contraste conforme especificação
const COLORS = {
    EMPTY: '#ffffff',
    GRID_LINE: '#e2e8f0',
    START: '#16a34a',          // Verde (Ambulância)
    END: '#dc2626',            // Vermelho (Hospital)
    WALL: '#1e293b',           // Preto / Cinza Escuro (Prédios / Interdições)
    EXPLORED_GREEDY: '#7dd3fc',// Azul Claro (Exploração Busca Gulosa)
    PATH_GREEDY: '#1d4ed8',    // Azul Escuro (Caminho Final Busca Gulosa)
    EXPLORED_ASTAR: '#fef08a', // Amarelo Claro (Exploração A*)
    PATH_ASTAR: '#b45309',     // Amarelo Escuro (Caminho Final A*)
    AVENUE: '#cfd8e3',         // Asfalto das avenidas (largas, mais escuras)
    STREET: '#e9eef4',         // Asfalto das ruas (estreitas, mais claras)
    LANE_DASH: '#e3b341'       // Faixa tracejada central das avenidas
};

// Tons de "telhado" dos quarteirões: cada quadra recebe uma tonalidade
// própria, como em um mapa de cidade real (variação sutil entre prédios).
const BUILDING_TONES = [
    [30, 41, 59], [33, 47, 67], [38, 49, 64], [42, 52, 68],
    [27, 40, 56], [36, 47, 62], [47, 58, 74], [29, 44, 62],
    [40, 46, 58], [34, 52, 70], [45, 55, 70], [31, 43, 57],
    [52, 64, 82], [61, 73, 92], [46, 60, 79], [68, 80, 99]
];

// Cores dos carrinhos estacionados nos bolsões de estacionamento
const CAR_COLORS = ['#e2e8f0', '#94a3b8', '#cbd5e1', '#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#a78bfa'];


// Estilos da rota em formato GPS (polilinha com contorno)
const ROUTE_STYLES = {
    greedy: { inner: '#60a5fa', casing: '#1e3a8a' },
    astar: { inner: '#fcd34d', casing: '#78350f' }
};

// Elementos do DOM
const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');

// Canvas sobreposto (overlay) para a rota GPS e a ambulância animada
const routeCanvas = document.getElementById('route-canvas');
const routeCtx = routeCanvas.getContext('2d');

const btnGreedy = document.getElementById('btn-greedy');
const btnAstar = document.getElementById('btn-astar');
const btnBoth = document.getElementById('btn-both');
const btnRandom = document.getElementById('btn-random');
const btnClearPaths = document.getElementById('btn-clear-paths');
const btnClearAll = document.getElementById('btn-clear-all');
const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');

// Elementos do Dashboard
const metricAlgo = document.getElementById('metric-algo');
const metricStatus = document.getElementById('metric-status');
const metricCost = document.getElementById('metric-cost');
const metricExplored = document.getElementById('metric-explored');

const compGreedyStatus = document.getElementById('comp-greedy-status');
const compGreedyCost = document.getElementById('comp-greedy-cost');
const compGreedyExplored = document.getElementById('comp-greedy-explored');

const compAstarStatus = document.getElementById('comp-astar-status');
const compAstarCost = document.getElementById('comp-astar-cost');
const compAstarExplored = document.getElementById('comp-astar-explored');

// Custo de trânsito de cada célula (1 = livre ... 5 = congestionado)
const MIN_COST = 1;
const MAX_COST = 5;
const COST_AVENUE = 1;   // Avenidas: trânsito livre
const COST_STREET = 2;   // Ruas secundárias

// Tipo de via de cada célula (malha viária da cidade)
const ROAD = {
    NONE: 0,    // Prédio / terreno
    STREET: 1,  // Rua secundária
    AVENUE: 2   // Avenida
};

// Uso do solo das células de quarteirão (não trafegáveis)
const LAND = {
    BUILDING: 0, // Prédios
    PARK: 1,     // Praça / parque
    PLAZA: 2,    // Praça pavimentada
    PARKING: 3,  // Estacionamento
    WATER: 4     // Lagoa dentro de um parque
};

// Estado da Aplicação
let grid = [];
let costs = [];
let roadType = [];
let blockIdGrid = []; // id do quarteirão de cada célula (0 = via)
let blockTone = [];   // tonalidade [r,g,b] de cada quarteirão
let cellDecor = [];   // uso do solo de cada célula de quarteirão
let laneH = [];       // faixa central tracejada horizontal (borda superior da célula)
let laneV = [];       // faixa central tracejada vertical (borda esquerda da célula)
let isCrossing = [];  // cruzamento de vias (para interromper as faixas centrais)
let startNode = { r: 4, c: 4 };
let endNode = { r: 35, c: 35 };
let isAnimating = false;
let animationAbortController = null;

// Rota em estilo GPS desenhada no overlay + ambulância animada
let routeLines = [];      // [{ type: 'greedy'|'astar', points: [{r,c}...] }]
let ambulanceAnim = null; // { x, y, parked }

// Controle de interação com mouse no Canvas
let isMouseDown = false;
let dragEraseMode = false;

/**
 * Inicializa a matriz 40x40 vazia
 */
function initGrid() {
    grid = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(CELL_STATE.EMPTY)
    );
    costs = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(MIN_COST)
    );
    roadType = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(ROAD.NONE)
    );
    blockIdGrid = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(0)
    );
    cellDecor = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(LAND.BUILDING)
    );
    laneH = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(false)
    );
    laneV = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(false)
    );
    isCrossing = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(false)
    );
    blockTone = [];
}


/**
 * Calcula a Distância de Manhattan entre dois pontos (apenas 4 direções)
 */
function manhattanDistance(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

/**
 * Retorna os vizinhos válidos nas 4 direções (Cima, Baixo, Esquerda, Direita)
 */
function getNeighbors(node) {
    const directions = [
        { dr: -1, dc: 0 }, // Cima
        { dr: 1, dc: 0 },  // Baixo
        { dr: 0, dc: -1 }, // Esquerda
        { dr: 0, dc: 1 }   // Direita
    ];

    const neighbors = [];
    for (const { dr, dc } of directions) {
        const nr = node.r + dr;
        const nc = node.c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            if (grid[nr][nc] !== CELL_STATE.WALL) {
                neighbors.push({ r: nr, c: nc });
            }
        }
    }
    return neighbors;
}

/**
 * Utilitários de cor e ruído determinístico (mantém a "textura" da cidade
 * igual em toda renderização, inclusive nas atualizações célula a célula).
 */
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function rgb(r, g, b) {
    return `rgb(${Math.round(clamp(r, 0, 255))},${Math.round(clamp(g, 0, 255))},${Math.round(clamp(b, 0, 255))})`;
}

function hash2(r, c, salt = 0) {
    let h = (r * 374761393 + c * 668265263 + salt * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
}

function inBounds(r, c) {
    return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
}

function isRoadCell(r, c) {
    return inBounds(r, c) && roadType[r][c] !== ROAD.NONE;
}

/**
 * Pigmento do asfalto: avenidas mais escuras e ruas mais claras, com
 * pequena variação por célula (asfalto "remendado", como em cidade real).
 */
function roadBaseColor(r, c, type) {
    const jitter = (hash2(r, c, 3) - 0.5) * 7;
    if (type === ROAD.AVENUE) {
        return rgb(201 + jitter, 210 + jitter, 221 + jitter);
    }
    return rgb(231 + jitter, 236 + jitter, 242 + jitter);
}

/**
 * Contorno do quarteirão: desenha as bordas apenas quando o vizinho é via
 * (ou o limite do mapa) ou tem outro uso do solo.
 */
function strokeTerrainEdges(r, c, x, y, color, width) {
    const sameTerrain = (dr, dc) => {
        const nr = r + dr;
        const nc = c + dc;
        return inBounds(nr, nc) &&
            roadType[nr][nc] === ROAD.NONE &&
            cellDecor[nr][nc] === cellDecor[r][c];
    };

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    if (!sameTerrain(-1, 0)) {
        ctx.moveTo(x, y + width / 2);
        ctx.lineTo(x + CELL_SIZE, y + width / 2);
    }
    if (!sameTerrain(1, 0)) {
        ctx.moveTo(x, y + CELL_SIZE - width / 2);
        ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE - width / 2);
    }
    if (!sameTerrain(0, -1)) {
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width / 2, y + CELL_SIZE);
    }
    if (!sameTerrain(0, 1)) {
        ctx.moveTo(x + CELL_SIZE - width / 2, y);
        ctx.lineTo(x + CELL_SIZE - width / 2, y + CELL_SIZE);
    }
    ctx.stroke();
}

function drawTree(cx, cy, radius, tint) {
    ctx.beginPath();
    ctx.fillStyle = 'rgba(15, 45, 25, 0.22)';
    ctx.ellipse(cx + 1.2, cy + 1.5, radius, radius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = tint;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.arc(cx - radius * 0.3, cy - radius * 0.35, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Identificador de "lote" dentro de um quarteirão: cria divisórias com
 * tamanhos variados entre prédios vizinhos, quebrando o efeito de bloco
 * monolítico. É determinístico, para a textura não mudar entre renders.
 */
function buildingParcel(r, c) {
    const id = blockIdGrid[r][c] || 0;
    const offsetR = hash2(id, 1, 91) * 3;
    const offsetC = hash2(id, 2, 93) * 3;
    const sizeR = 2 + Math.floor(hash2(id, 3, 95) * 2);
    const sizeC = 2 + Math.floor(hash2(id, 4, 97) * 3);
    return Math.floor((r + offsetR) / sizeR) * 131 + Math.floor((c + offsetC) / sizeC);
}

/**
 * Prédio: tom próprio do quarteirão com leve variação entre células e
 * divisórias sutis entre lotes vizinhos (telhados de alturas diferentes).
 */
function drawBuildingCell(r, c, x, y) {
    const id = blockIdGrid[r][c];
    const tone = blockTone[id] || BUILDING_TONES[0];
    const jitter = (hash2(r, c, 11) - 0.5) * 10;

    ctx.fillStyle = rgb(tone[0] + jitter, tone[1] + jitter, tone[2] + jitter);
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    // Lotes vizinhos dentro do mesmo quarteirão
    const parcel = buildingParcel(r, c);
    const sameBuilding = (dr, dc) => {
        const nr = r + dr;
        const nc = c + dc;
        return inBounds(nr, nc) &&
            roadType[nr][nc] === ROAD.NONE &&
            cellDecor[nr][nc] === LAND.BUILDING &&
            blockIdGrid[nr][nc] === id &&
            buildingParcel(nr, nc) === parcel;
    };

    ctx.strokeStyle = 'rgba(8, 15, 30, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (!sameBuilding(-1, 0)) {
        ctx.moveTo(x, y + 0.5);
        ctx.lineTo(x + CELL_SIZE, y + 0.5);
    }
    if (!sameBuilding(0, -1)) {
        ctx.moveTo(x + 0.5, y);
        ctx.lineTo(x + 0.5, y + CELL_SIZE);
    }
    ctx.stroke();

    strokeTerrainEdges(r, c, x, y, 'rgba(8, 15, 30, 0.9)', 1.2);
}

/**
 * Praça/parque: gramado com manchas, clareiras e árvores espalhadas.
 */
function drawParkCell(r, c, x, y) {
    const h = hash2(r, c, 17);
    ctx.fillStyle = rgb(126 + h * 16, 184 + h * 18, 124 + h * 14);
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    const clearing = hash2(r, c, 23);
    if (clearing > 0.78) {
        ctx.fillStyle = 'rgba(228, 214, 181, 0.55)';
        ctx.beginPath();
        ctx.ellipse(
            x + CELL_SIZE / 2,
            y + CELL_SIZE / 2,
            5 + clearing * 2,
            4 + clearing * 2,
            hash2(r, c, 31) * Math.PI,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    const treeHash = hash2(r, c, 47);
    if (treeHash > 0.34) {
        drawTree(
            x + 5 + hash2(r, c, 53) * 8,
            y + 5 + hash2(r, c, 59) * 8,
            2.8 + treeHash * 1.8,
            treeHash > 0.72 ? '#3f8a4a' : '#4f9f55'
        );
    }

    strokeTerrainEdges(r, c, x, y, '#41703f', 1.1);
}

/**
 * Lagoa dentro de um parque: água com pequenas reflexões.
 */
function drawWaterCell(r, c, x, y) {
    const h = hash2(r, c, 19);
    ctx.fillStyle = rgb(120 + h * 14, 188 + h * 10, 220 + h * 10);
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    if (h > 0.55) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 6 + h * 5);
        ctx.quadraticCurveTo(x + CELL_SIZE / 2, y + 3 + h * 6, x + CELL_SIZE - 4, y + 6 + h * 5);
        ctx.stroke();
    }

    strokeTerrainEdges(r, c, x, y, '#4a9cc4', 1.1);
}

/**
 * Bolsão de estacionamento: piso claro, vagas demarcadas e carrinhos.
 */
function drawParkingCell(r, c, x, y) {
    const h = hash2(r, c, 21);
    ctx.fillStyle = rgb(196 + h * 10, 204 + h * 10, 213 + h * 10);
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    // Faixa branca de demarcação da vaga
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    const horizontal = hash2(r, c, 61) > 0.5;
    ctx.beginPath();
    if (horizontal) {
        ctx.moveTo(x, y + 3);
        ctx.lineTo(x + CELL_SIZE, y + 3);
    } else {
        ctx.moveTo(x + 3, y);
        ctx.lineTo(x + 3, y + CELL_SIZE);
    }
    ctx.stroke();

    if (hash2(r, c, 67) > 0.62) {
        const carHorizontal = hash2(r, c, 71) > 0.5;
        const carColor = CAR_COLORS[Math.floor(hash2(r, c, 73) * CAR_COLORS.length)];
        const w = carHorizontal ? 10 : 6;
        const hgt = carHorizontal ? 6 : 10;
        const cx = x + CELL_SIZE / 2 + (hash2(r, c, 79) - 0.5) * 3;
        const cy = y + CELL_SIZE / 2 + (hash2(r, c, 83) - 0.5) * 3;
        ctx.fillStyle = carColor;
        ctx.fillRect(cx - w / 2, cy - hgt / 2, w, hgt);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
        ctx.fillRect(cx - w / 4, cy - hgt / 4, w / 2, hgt / 2);
    }

    strokeTerrainEdges(r, c, x, y, '#97a3b3', 1);
}

/**
 * Praça pavimentada: calçamento claro, canteiros e árvores isoladas.
 */
function drawPlazaCell(r, c, x, y) {
    const h = hash2(r, c, 27);
    ctx.fillStyle = rgb(226 + h * 12, 214 + h * 10, 190 + h * 10);
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    // Calçamento em blocos irregulares
    ctx.fillStyle = 'rgba(120, 100, 70, 0.13)';
    for (let i = 0; i < 3; i++) {
        const px = x + 2 + hash2(r, c, 90 + i) * (CELL_SIZE - 4);
        const py = y + 2 + hash2(r, c, 95 + i) * (CELL_SIZE - 4);
        ctx.fillRect(px, py, 2.5, 2.5);
    }

    if (hash2(r, c, 101) > 0.76) {
        drawTree(
            x + 5 + hash2(r, c, 103) * 8,
            y + 5 + hash2(r, c, 107) * 8,
            2.6 + hash2(r, c, 109) * 1.4,
            '#4f9f55'
        );
    }

    strokeTerrainEdges(r, c, x, y, '#b3a184', 1);
}

function drawLandCell(r, c, x, y) {
    switch (cellDecor[r][c]) {
        case LAND.PARK:
            drawParkCell(r, c, x, y);
            break;
        case LAND.WATER:
            drawWaterCell(r, c, x, y);
            break;
        case LAND.PARKING:
            drawParkingCell(r, c, x, y);
            break;
        case LAND.PLAZA:
            drawPlazaCell(r, c, x, y);
            break;
        default:
            drawBuildingCell(r, c, x, y);
    }
}

/**
 * Via interditada (obra / acidente): asfalto escuro com faixas de alerta.
 */
function drawClosedRoadCell(r, c, x, y, type) {
    ctx.fillStyle = type === ROAD.AVENUE ? '#7c8899' : '#95a0ad';
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, CELL_SIZE, CELL_SIZE);
    ctx.clip();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.92)';
    ctx.lineWidth = 3;
    for (let i = -CELL_SIZE; i < CELL_SIZE * 2; i += 9) {
        ctx.beginPath();
        ctx.moveTo(x + i, y + CELL_SIZE);
        ctx.lineTo(x + i + CELL_SIZE, y);
        ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
}

/**
 * Faixa tracejada central das avenidas (mão dupla com duas pistas)
 */
function drawAvenueCenterLine(r, c, x, y) {
    if (isCrossing[r][c]) return;

    ctx.save();
    ctx.strokeStyle = COLORS.LANE_DASH;
    ctx.lineWidth = 1.3;
    ctx.setLineDash([6, 3]);
    if (laneH[r][c]) {
        ctx.beginPath();
        ctx.moveTo(x, y + 0.5);
        ctx.lineTo(x + CELL_SIZE, y + 0.5);
        ctx.stroke();
    }
    if (laneV[r][c]) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, y);
        ctx.lineTo(x + 0.5, y + CELL_SIZE);
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * Desenha uma única célula no Canvas
 */
function drawCell(r, c) {
    const x = c * CELL_SIZE;
    const y = r * CELL_SIZE;
    const state = grid[r][c];
    const type = roadType[r][c];

    const isStart = r === startNode.r && c === startNode.c;
    const isEnd = r === endNode.r && c === endNode.c;

    // Marcadores de Ambulância (Início) e Hospital (Fim)
    if (isStart || isEnd) {
        ctx.fillStyle = isStart ? COLORS.START : COLORS.END;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isStart ? 'A' : 'H', x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 0.5);
        return;
    }

    // Quarteirões: prédios, praças, parques, estacionamentos
    if (state === CELL_STATE.WALL) {
        if (type !== ROAD.NONE) {
            drawClosedRoadCell(r, c, x, y, type);
        } else {
            drawLandCell(r, c, x, y);
        }
        return;
    }

    // Piso da via (ou terreno vazio)
    if (type === ROAD.AVENUE || type === ROAD.STREET) {
        ctx.fillStyle = roadBaseColor(r, c, type);
    } else {
        ctx.fillStyle = COLORS.EMPTY;
    }
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    // Sobreposição da exploração/caminho dos algoritmos
    let overlay = null;
    switch (state) {
        case CELL_STATE.EXPLORED_GREEDY: overlay = COLORS.EXPLORED_GREEDY; break;
        case CELL_STATE.PATH_GREEDY: overlay = COLORS.PATH_GREEDY; break;
        case CELL_STATE.EXPLORED_ASTAR: overlay = COLORS.EXPLORED_ASTAR; break;
        case CELL_STATE.PATH_ASTAR: overlay = COLORS.PATH_ASTAR; break;
    }
    if (overlay) {
        ctx.fillStyle = overlay;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    }

    // Sinalização viária (apenas em via livre)
    if (state === CELL_STATE.EMPTY && type === ROAD.AVENUE) {
        drawAvenueCenterLine(r, c, x, y);
    }

    // Custo de trânsito da célula
    const isPath = state === CELL_STATE.PATH_GREEDY || state === CELL_STATE.PATH_ASTAR;
    ctx.fillStyle = isPath
        ? '#ffffff'
        : (state === CELL_STATE.EMPTY ? '#54657a' : 'rgba(30, 41, 59, 0.72)');
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(costs[r][c], x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 0.5);
}


/**
 * Renderiza toda a matriz 40x40
 */
function renderGrid() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            drawCell(r, c);
        }
    }
}

// ============================================================
// Rota em estilo GPS (polilinha) + animação da ambulância
// ============================================================

/**
 * Centro de uma célula em coordenadas de pixel
 */
function cellCenter(r, c) {
    return { x: c * CELL_SIZE + CELL_SIZE / 2, y: r * CELL_SIZE + CELL_SIZE / 2 };
}

/**
 * Remove todas as rotas GPS e a ambulância do overlay
 */
function clearRouteLines() {
    routeLines = [];
    ambulanceAnim = null;
    redrawRouteOverlay();
}

/**
 * Desenha um "pin" do ponto de partida/destino por cima das rotas, para
 * que a Ambulância e o Hospital continuem visíveis durante a animação.
 */
function drawEndpointBadge(node, letter, color) {
    const { x, y } = cellCenter(node.r, node.c);
    routeCtx.save();
    routeCtx.beginPath();
    routeCtx.arc(x, y, 6.5, 0, Math.PI * 2);
    routeCtx.fillStyle = color;
    routeCtx.fill();
    routeCtx.lineWidth = 1.6;
    routeCtx.strokeStyle = '#ffffff';
    routeCtx.stroke();
    routeCtx.fillStyle = '#ffffff';
    routeCtx.font = 'bold 8.5px sans-serif';
    routeCtx.textAlign = 'center';
    routeCtx.textBaseline = 'middle';
    routeCtx.fillText(letter, x, y + 0.5);
    routeCtx.restore();
}

/**
 * Redesenha o overlay: rotas GPS (com contorno) + ambulância
 */
function redrawRouteOverlay(now = performance.now()) {
    routeCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    for (const line of routeLines) {
        drawRouteLine(line);
    }
    drawEndpointBadge(startNode, 'A', COLORS.START);
    drawEndpointBadge(endNode, 'H', COLORS.END);
    if (ambulanceAnim) {
        drawAmbulanceMarker(ambulanceAnim.x, ambulanceAnim.y, ambulanceAnim.parked ? null : now);
    }
}

/**
 * Desenha uma rota como polilinha grossa e arredondada, estilo GPS:
 * primeiro o contorno escuro, depois a linha interna colorida.
 */
function drawRouteLine(line) {
    if (line.points.length < 2) return;
    const style = ROUTE_STYLES[line.type] || ROUTE_STYLES.astar;

    routeCtx.save();
    routeCtx.lineJoin = 'round';
    routeCtx.lineCap = 'round';
    for (const pass of ['casing', 'inner']) {
        routeCtx.beginPath();
        line.points.forEach((p, i) => {
            const { x, y } = cellCenter(p.r, p.c);
            if (i === 0) {
                routeCtx.moveTo(x, y);
            } else {
                routeCtx.lineTo(x, y);
            }
        });
        routeCtx.strokeStyle = style[pass];
        routeCtx.lineWidth = pass === 'casing' ? 11 : 6;
        routeCtx.stroke();
    }
    routeCtx.restore();
}

/**
 * Desenha o marcador da ambulância (🚑) com "sirene" pulsante azul/vermelha.
 * Quando `now` é null, desenha estacionada (sem pulsação).
 */
function drawAmbulanceMarker(x, y, now) {
    routeCtx.save();
    if (now === null) {
        routeCtx.beginPath();
        routeCtx.arc(x, y, 11, 0, Math.PI * 2);
        routeCtx.fillStyle = 'rgba(22,163,74,0.28)';
        routeCtx.fill();
    } else {
        const pulse = (Math.sin(now / 170) + 1) / 2;
        const useRed = Math.floor(now / 260) % 2 === 0;
        routeCtx.beginPath();
        routeCtx.arc(x, y, 10 + pulse * 3, 0, Math.PI * 2);
        routeCtx.fillStyle = useRed
            ? `rgba(220,38,38,${0.16 + pulse * 0.24})`
            : `rgba(37,99,235,${0.16 + pulse * 0.24})`;
        routeCtx.fill();
    }
    routeCtx.font = '15px sans-serif';
    routeCtx.textAlign = 'center';
    routeCtx.textBaseline = 'middle';
    routeCtx.fillText('🚑', x, y + 1);
    routeCtx.restore();
}

/**
 * Anima a ambulância "dirigindo" pela rota GPS.
 * A velocidade em cada trecho é proporcional ao custo da célula:
 * a ambulância desacelera nos congestionamentos, como um veículo real.
 */
function animateAmbulanceDrive(points, abortToken) {
    return new Promise(resolve => {
        if (points.length < 2) {
            resolve(false);
            return;
        }

        const sliderVal = parseInt(speedSlider.value, 10);
        const baseMs = sliderVal >= 95 ? 16 : Math.max(28, 130 - sliderVal);

        let durations = [];
        let total = 0;
        for (let i = 1; i < points.length; i++) {
            const cost = costs[points[i].r][points[i].c];
            const d = baseMs * (1 + 0.3 * (cost - MIN_COST));
            durations.push(d);
            total += d;
        }

        // Limita a duração total para não cansar em rotas longas
        const MAX_DRIVE_MS = 8000;
        if (total > MAX_DRIVE_MS) {
            const scale = MAX_DRIVE_MS / total;
            durations = durations.map(d => d * scale);
            total = MAX_DRIVE_MS;
        }

        const centers = points.map(p => cellCenter(p.r, p.c));
        let startTime = null;

        function frame(now) {
            if (abortToken.aborted) {
                ambulanceAnim = null;
                redrawRouteOverlay(now);
                resolve(false);
                return;
            }
            if (startTime === null) startTime = now;
            let t = now - startTime;

            if (t >= total) {
                const last = centers[centers.length - 1];
                ambulanceAnim = { x: last.x, y: last.y, parked: true };
                redrawRouteOverlay(now);
                resolve(true);
                return;
            }

            let seg = 0;
            while (seg < durations.length - 1 && t > durations[seg]) {
                t -= durations[seg];
                seg++;
            }
            const frac = t / durations[seg];
            const a = centers[seg];
            const b = centers[seg + 1];
            ambulanceAnim = {
                x: a.x + (b.x - a.x) * frac,
                y: a.y + (b.y - a.y) * frac,
                parked: false
            };
            redrawRouteOverlay(now);
            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    });
}

/**
 * Limpa apenas as células de exploração e caminho final, mantendo obstáculos
 */
function clearPaths() {
    if (isAnimating) stopAnimation();

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] !== CELL_STATE.WALL) {
                grid[r][c] = CELL_STATE.EMPTY;
            }
        }
    }
    clearRouteLines();
    renderGrid();
    updateDashboard('—', 'Aguardando', 'status-idle', 0, 0);
}

/**
 * Limpa todo o mapa (obstáculos e caminhos) e reseta métricas comparativas
 */
function clearAll() {
    if (isAnimating) stopAnimation();
    initGrid();
    clearRouteLines();
    renderGrid();
    updateDashboard('—', 'Aguardando', 'status-idle', 0, 0);
    resetComparisonTable();
}

/**
 * Reseta a tabela comparativa quando o mapa muda
 */
function resetComparisonTable() {
    compGreedyStatus.textContent = '—';
    compGreedyCost.textContent = '—';
    compGreedyExplored.textContent = '—';

    compAstarStatus.textContent = '—';
    compAstarCost.textContent = '—';
    compAstarExplored.textContent = '—';
}

// ============================================================
// Geração de Cidade Orgânica (bairro real, pouco planejado)
// ============================================================

const DIRS4 = [
    { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
    { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
];

function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function chance(p) {
    return Math.random() < p;
}

/**
 * Marca uma célula como via, respeitando a hierarquia (avenida > rua).
 */
function paintRoadCell(r, c, type) {
    if (!inBounds(r, c)) return;
    const current = roadType[r][c];
    if (current === ROAD.AVENUE) return;
    if (type === ROAD.AVENUE || current === ROAD.NONE) {
        roadType[r][c] = type;
    }
}

/**
 * Subdivide a cidade em quarteirões irregulares (BSP). Cada subdivisão
 * abre uma via no meio de uma área, mas dimensões e posições são sorteadas:
 * o resultado é um mosaico de quadras de tamanhos diferentes, com muitas
 * esquinas em T e eixos que não se alinham de um lado a outro — como um
 * bairro que cresceu por loteamentos independentes, sem plano diretor.
 */
function subdivideCity() {
    divideRegion(0, 0, GRID_SIZE - 1, GRID_SIZE - 1, 0);
}

function divideRegion(r0, c0, r1, c1, depth) {
    const h = r1 - r0 + 1;
    const w = c1 - c0 + 1;
    const area = h * w;

    const mustStop = h < 5 || w < 5 || area < 22;
    const mustSplit = area > 230 || h > 15 || w > 15;
    const bigBlock = chance(0.06);           // quarteirão grande "esquecido"
    const mediumBlock = area < 55 && chance(0.35);
    if (mustStop) return;
    if (!mustSplit && (bigBlock || mediumBlock)) return;

    const horizontal = h > w * 1.25 ? true : (w > h * 1.25 ? false : chance(0.5));
    const length = horizontal ? h : w;
    if (length < 10) return;

    // A primeira divisão é sempre uma avenida; as seguintes são cada vez
    // mais estreitas, formando uma hierarquia viária de cidade real.
    const isAvenue = depth === 0
        ? true
        : chance(depth === 1 ? 0.7 : depth === 2 ? 0.3 : 0.06);
    const width = isAvenue ? 2 : 1;
    const type = isAvenue ? ROAD.AVENUE : ROAD.STREET;

    let offset = Math.round((length - width) * (0.35 + Math.random() * 0.3));
    offset = clamp(offset, 4, length - width - 4);

    // Às vezes a rua não atravessa o quarteirão inteiro: sobra um "gargalo"
    // e os lotes dos dois lados se encontram no fim da rua (quadras em L).
    const partial = !isAvenue && chance(0.28);
    const cut = partial ? randInt(Math.floor(length * 0.55), Math.floor(length * 0.85)) : length;
    const keepStart = !partial || chance(0.5);
    const spanFrom = keepStart ? 0 : length - cut;
    const spanTo = keepStart ? cut : length;

    if (horizontal) {
        const sr = r0 + offset;
        if (sr + width > r1 - 2) return;

        for (let r = sr; r < sr + width; r++) {
            for (let c = c0 + spanFrom; c < c0 + spanTo; c++) {
                paintRoadCell(r, c, type);
            }
        }
        if (isAvenue) {
            for (let c = c0; c <= c1; c++) laneH[sr + 1][c] = true;
        }

        divideRegion(r0, c0, sr - 1, c1, depth + 1);
        divideRegion(sr + width, c0, r1, c1, depth + 1);
    } else {
        const sc = c0 + offset;
        if (sc + width > c1 - 2) return;

        for (let c = sc; c < sc + width; c++) {
            for (let r = r0 + spanFrom; r < r0 + spanTo; r++) {
                paintRoadCell(r, c, type);
            }
        }
        if (isAvenue) {
            for (let r = r0; r <= r1; r++) laneV[r][sc + 1] = true;
        }

        divideRegion(r0, c0, r1, sc - 1, depth + 1);
        divideRegion(r0, sc + width, r1, c1, depth + 1);
    }
}

/**
 * Marca os cruzamentos (via nos dois sentidos) para interromper a faixa
 * tracejada central das avenidas, como acontece nas esquinas reais.
 */
function markCrossings() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!isRoadCell(r, c)) continue;
            const horizontal = isRoadCell(r, c - 1) || isRoadCell(r, c + 1);
            const vertical = isRoadCell(r - 1, c) || isRoadCell(r + 1, c);
            isCrossing[r][c] = horizontal && vertical;
        }
    }
}

/**
 * Ruas sem saída (becos residenciais) que entram no quarteirão.
 */
function addCulDeSacs() {
    const target = randInt(7, 12);
    let made = 0;
    let guard = 0;

    while (made < target && guard++ < 600) {
        const r = randInt(1, GRID_SIZE - 2);
        const c = randInt(1, GRID_SIZE - 2);
        if (roadType[r][c] === ROAD.NONE) continue;

        const options = DIRS4.filter(d =>
            inBounds(r + d.dr, c + d.dc) && roadType[r + d.dr][c + d.dc] === ROAD.NONE
        );
        if (options.length === 0) continue;

        const dir = options[randInt(0, options.length - 1)];
        const len = randInt(2, 5);

        let ok = true;
        for (let k = 1; k <= len; k++) {
            const rr = r + dir.dr * k;
            const cc = c + dir.dc * k;
            if (rr < 1 || rr >= GRID_SIZE - 1 || cc < 1 || cc >= GRID_SIZE - 1 ||
                roadType[rr][cc] !== ROAD.NONE) {
                ok = false;
                break;
            }
        }
        if (!ok) continue;

        for (let k = 1; k <= len; k++) {
            paintRoadCell(r + dir.dr * k, c + dir.dc * k, ROAD.STREET);
        }
        made++;
    }
}

/**
 * Becos que atravessam quarteirões, ligando duas ruas (atalhos estreitos).
 */
function addAlleys() {
    const target = randInt(3, 5);
    let made = 0;
    let guard = 0;

    while (made < target && guard++ < 800) {
        const r = randInt(1, GRID_SIZE - 2);
        const c = randInt(1, GRID_SIZE - 2);
        if (roadType[r][c] !== ROAD.NONE) continue;

        const dir = DIRS4[randInt(0, DIRS4.length - 1)];
        let len = 0;
        while (len < 6) {
            const rr = r + dir.dr * len;
            const cc = c + dir.dc * len;
            if (!inBounds(rr, cc) || roadType[rr][cc] !== ROAD.NONE) break;
            len++;
        }

        const endR = r + dir.dr * len;
        const endC = c + dir.dc * len;
        if (len < 2 || len > 4 || !isRoadCell(endR, endC)) continue;

        for (let k = 0; k < len; k++) {
            paintRoadCell(r + dir.dr * k, c + dir.dc * k, ROAD.STREET);
        }
        made++;
    }
}

/**
 * Planta um parque: gramado, árvores e, em áreas maiores, uma lagoa.
 */
function decoratePark(cells) {
    const pond = cells.length >= 22 && chance(0.6)
        ? cells[randInt(0, cells.length - 1)]
        : null;

    for (const cell of cells) {
        let use = LAND.PARK;
        if (pond) {
            const dist = Math.hypot(cell.r - pond.r, cell.c - pond.c);
            if (dist <= 2.2 && hash2(cell.r, cell.c, 41) > 0.12) {
                use = LAND.WATER;
            }
        }
        cellDecor[cell.r][cell.c] = use;
    }
}

function takeCandidate(candidates, minArea, maxArea) {
    const valid = [];
    for (let i = 0; i < candidates.length; i++) {
        const area = candidates[i].cells.length;
        if (area >= minArea && area <= maxArea) valid.push(i);
    }
    if (valid.length === 0) return null;
    return candidates.splice(valid[randInt(0, valid.length - 1)], 1)[0];
}

/**
 * Cada conjunto de células sem via é um quarteirão. Alguns recebem uso
 * diferente de "prédios": praça, parque (com lagoa), estacionamento.
 * O tom de cada quadra também varia, quebrando a uniformidade do mapa.
 */
function classifyBlocks() {
    const seen = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(false)
    );
    const buildingCandidates = [];
    let parkCount = 0;
    let plazaCount = 0;
    let nextId = 1;

    for (let sr = 0; sr < GRID_SIZE; sr++) {
        for (let sc = 0; sc < GRID_SIZE; sc++) {
            if (seen[sr][sc] || roadType[sr][sc] !== ROAD.NONE) continue;

            const id = nextId++;
            const cells = [];
            const queue = [{ r: sr, c: sc }];
            seen[sr][sc] = true;

            while (queue.length > 0) {
                const curr = queue.shift();
                cells.push(curr);
                for (const d of DIRS4) {
                    const nr = curr.r + d.dr;
                    const nc = curr.c + d.dc;
                    if (inBounds(nr, nc) && !seen[nr][nc] && roadType[nr][nc] === ROAD.NONE) {
                        seen[nr][nc] = true;
                        queue.push({ r: nr, c: nc });
                    }
                }
            }

            let decor = LAND.BUILDING;
            if (cells.length <= 2) {
                // Ilhota cercada de vias: vira uma pracinha (evita "buracos")
                decor = LAND.PLAZA;
            } else if (cells.length >= 10 && cells.length <= 65 && chance(0.09)) {
                decor = LAND.PARK;
            } else if (cells.length >= 8 && cells.length <= 40 && chance(0.05)) {
                decor = LAND.PLAZA;
            } else if (cells.length >= 6 && cells.length <= 26 && chance(0.05)) {
                decor = LAND.PARKING;
            }

            if (decor === LAND.PARK) parkCount++;
            if (decor === LAND.PLAZA) plazaCount++;

            blockTone[id] = BUILDING_TONES[randInt(0, BUILDING_TONES.length - 1)];

            for (const cell of cells) {
                blockIdGrid[cell.r][cell.c] = id;
            }

            if (decor === LAND.PARK) {
                decoratePark(cells);
            } else {
                for (const cell of cells) {
                    cellDecor[cell.r][cell.c] = decor;
                }
            }

            if (decor === LAND.BUILDING && cells.length >= 12) {
                buildingCandidates.push({ cells });
            }
        }
    }

    // Toda cidade tem ao menos uma área verde e uma praça
    if (parkCount === 0) {
        const candidate = takeCandidate(buildingCandidates, 14, 70);
        if (candidate) decoratePark(candidate.cells);
    }
    if (plazaCount === 0) {
        const candidate = takeCandidate(buildingCandidates, 8, 40);
        if (candidate) {
            for (const cell of candidate.cells) {
                cellDecor[cell.r][cell.c] = LAND.PLAZA;
            }
        }
    }
}

/**
 * Define quais células são trafegáveis e aplica o custo base de cada via.
 */
function applyRoadCosts() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (roadType[r][c] === ROAD.AVENUE) {
                grid[r][c] = CELL_STATE.EMPTY;
                costs[r][c] = COST_AVENUE;
            } else if (roadType[r][c] === ROAD.STREET) {
                grid[r][c] = CELL_STATE.EMPTY;
                costs[r][c] = COST_STREET;
            } else {
                grid[r][c] = CELL_STATE.WALL;
                costs[r][c] = MIN_COST;
            }
        }
    }
}

/**
 * Monta o "esqueleto" do bairro: eixos viários irregulares, becos,
 * ruas sem saída e quarteirões com usos variados.
 */
function generateCityLayout() {
    initGrid();

    // Mosaico de quarteirões irregulares e eixos viários desalinhados
    subdivideCity();

    addCulDeSacs();
    addAlleys();
    markCrossings();

    applyRoadCosts(); // também marca os quarteirões como parede
    classifyBlocks();
}

/**
 * Gera uma cidade orgânica: quarteirões irregulares separados por ruas e
 * avenidas, com interdições (obras/acidentes) e manchas de congestionamento.
 * A ambulância e o hospital ficam na via mais próxima, e garante-se que
 * exista rota válida (e não trivialmente curta) entre eles.
 */
function generateCityMap() {
    if (isAnimating) stopAnimation();

    let attempts = 0;

    do {
        generateCityLayout();

        // Ambulância e hospital sempre "na rua" (via aberta mais próxima)
        startNode = snapToStreet(startNode.r, startNode.c);
        endNode = snapToStreet(endNode.r, endNode.c);
        if (startNode.r === endNode.r && startNode.c === endNode.c) {
            endNode = findNearestStreetCell(
                GRID_SIZE - 1 - startNode.r,
                GRID_SIZE - 1 - startNode.c
            ) || { r: startNode.r, c: Math.max(0, startNode.c - 1) };
        }

        // Interdições aleatórias (obras / acidentes de trânsito)
        addRoadClosures();

        // Manchas de congestionamento (custo 3 a 5 ao longo das vias)
        addCongestionPatches();

        // Garante acesso imediato à ambulância e ao hospital
        grid[startNode.r][startNode.c] = CELL_STATE.EMPTY;
        grid[endNode.r][endNode.c] = CELL_STATE.EMPTY;
        costs[startNode.r][startNode.c] = MIN_COST;
        costs[endNode.r][endNode.c] = MIN_COST;

        attempts++;
    } while ((!hasValidPath() || manhattanDistance(startNode, endNode) < 14) && attempts < 25);

    clearRouteLines();
    renderGrid();
    updateDashboard('—', 'Cidade Gerada', 'status-idle', 0, 0);
    resetComparisonTable();
}

/**
 * Indica se a via na célula corre no sentido horizontal
 */
function roadIsHorizontal(r, c) {
    const horizontal = isRoadCell(r, c - 1) || isRoadCell(r, c + 1);
    const vertical = isRoadCell(r - 1, c) || isRoadCell(r + 1, c);
    if (horizontal && vertical) return chance(0.5);
    return horizontal;
}

/**
 * Interdições de via: trechos de rua fechados (obras/acidentes).
 * Ruas secundárias podem ser totalmente bloqueadas (criando becos sem
 * saída — ótimas armadilhas para a Busca Gulosa); avenidas recebem
 * apenas 1 célula interditada (meia pista), mantendo a outra faixa livre.
 */
function addRoadClosures() {
    const protectedCells = new Set();
    for (const node of [startNode, endNode]) {
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                protectedCells.add(`${node.r + dr},${node.c + dc}`);
            }
        }
    }

    const numClosures = randInt(7, 12);
    for (let i = 0; i < numClosures; i++) {
        let r = -1;
        let c = -1;
        let tries = 0;
        do {
            r = randInt(0, GRID_SIZE - 1);
            c = randInt(0, GRID_SIZE - 1);
            tries++;
        } while (tries < 200 && (roadType[r][c] === ROAD.NONE || protectedCells.has(`${r},${c}`)));

        if (roadType[r][c] === ROAD.NONE || protectedCells.has(`${r},${c}`)) continue;

        const horizontal = roadIsHorizontal(r, c);
        const onStreet = roadType[r][c] === ROAD.STREET;
        const len = onStreet ? randInt(1, 3) : 1;
        const direction = chance(0.5) ? 1 : -1;

        for (let k = 0; k < len; k++) {
            const rr = horizontal ? r : r + direction * k;
            const cc = horizontal ? c + direction * k : c;
            if (!isRoadCell(rr, cc) || protectedCells.has(`${rr},${cc}`)) break;
            grid[rr][cc] = CELL_STATE.WALL;
        }
    }
}

/**
 * Pinta a lentidão em uma célula (e na pista vizinha, se for avenida)
 */
function paintCongestion(r, c, horizontal) {
    if (!isRoadCell(r, c) || grid[r][c] === CELL_STATE.WALL) return;
    if ((r === startNode.r && c === startNode.c) ||
        (r === endNode.r && c === endNode.c)) return;

    const rnd = Math.random();
    const cost = rnd < 0.45 ? 3 : (rnd < 0.8 ? 4 : MAX_COST);
    costs[r][c] = cost;

    if (roadType[r][c] !== ROAD.AVENUE) return;

    const neighbors = horizontal
        ? [{ r: r - 1, c }, { r: r + 1, c }]
        : [{ r, c: c - 1 }, { r, c: c + 1 }];

    for (const n of neighbors) {
        if (roadType[n.r]?.[n.c] !== ROAD.AVENUE) continue;
        if (grid[n.r][n.c] === CELL_STATE.WALL) continue;
        if ((n.r === startNode.r && n.c === startNode.c) ||
            (n.r === endNode.r && n.c === endNode.c)) continue;
        costs[n.r][n.c] = cost;
    }
}

/**
 * Manchas de congestionamento: trechos contíguos de via com custo 3 a 5,
 * simulando trânsito pesado. O A* desvia deles quando compensa; a Busca
 * Gulosa ignora o custo e atravessa o congestionamento.
 */
function addCongestionPatches() {
    const numPatches = randInt(5, 8);
    for (let i = 0; i < numPatches; i++) {
        let r = -1;
        let c = -1;
        let tries = 0;
        do {
            r = randInt(0, GRID_SIZE - 1);
            c = randInt(0, GRID_SIZE - 1);
            tries++;
        } while (tries < 200 && (roadType[r][c] === ROAD.NONE || grid[r][c] === CELL_STATE.WALL));

        if (roadType[r][c] === ROAD.NONE || grid[r][c] === CELL_STATE.WALL) continue;

        const horizontal = roadIsHorizontal(r, c);
        const len = randInt(3, 7);
        const startK = -Math.floor(len / 2);

        for (let k = startK; k < startK + len; k++) {
            const rr = horizontal ? r : r + k;
            const cc = horizontal ? c + k : c;
            paintCongestion(rr, cc, horizontal);
        }
    }
}

/**
 * Verifica rapidamente via BFS se há caminho entre a Ambulância e o Hospital
 */
function hasValidPath() {
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    const queue = [startNode];
    visited[startNode.r][startNode.c] = true;

    while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.r === endNode.r && curr.c === endNode.c) return true;

        for (const next of getNeighbors(curr)) {
            if (!visited[next.r][next.c]) {
                visited[next.r][next.c] = true;
                queue.push(next);
            }
        }
    }
    return false;
}

/**
 * Executa a lógica matemática do algoritmo selecionado ("greedy" ou "astar")
 * Retorna a lista ordenada de nós explorados e o caminho final reconstruído.
 */
function computeSearchAlgorithm(type) {
    const key = (r, c) => `${r},${c}`;

    // Conjunto de nós já avaliados (Closed Set)
    const closedSet = new Set();

    // Lista de prioridades (Open Set)
    const openSet = [];

    // Mapa para reconstruir o caminho final
    const cameFrom = new Map();

    // Custo g(n): soma dos custos das células percorridas desde o início
    const gScore = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(Infinity)
    );

    gScore[startNode.r][startNode.c] = 0;
    const hStart = manhattanDistance(startNode, endNode);

    let insertionCounter = 0;
    openSet.push({
        r: startNode.r,
        c: startNode.c,
        g: 0,
        h: hStart,
        f: type === 'greedy' ? hStart : hStart, // Na origem g = 0
        order: insertionCounter++
    });

    const exploredOrder = [];
    let found = false;

    while (openSet.length > 0) {
        // Ordena a fila de prioridade pelo menor f(n)
        // Desempate por menor h(n) e ordem de inserção mais recente
        openSet.sort((a, b) => {
            if (a.f !== b.f) return a.f - b.f;
            if (a.h !== b.h) return a.h - b.h;
            return b.order - a.order;
        });

        const current = openSet.shift();
        const currKey = key(current.r, current.c);

        if (closedSet.has(currKey)) continue;
        closedSet.add(currKey);

        const isStart = current.r === startNode.r && current.c === startNode.c;
        const isEnd = current.r === endNode.r && current.c === endNode.c;

        if (!isStart && !isEnd) {
            exploredOrder.push({ r: current.r, c: current.c });
        }

        // Chegou ao Hospital (Destino)
        if (isEnd) {
            found = true;
            break;
        }

        // Explora vizinhos em 4 direções
        for (const neighbor of getNeighbors(current)) {
            const neighborKey = key(neighbor.r, neighbor.c);
            if (closedSet.has(neighborKey)) continue;

            const tentativeG = gScore[current.r][current.c] + costs[neighbor.r][neighbor.c];

            if (tentativeG < gScore[neighbor.r][neighbor.c]) {
                cameFrom.set(neighborKey, current);
                gScore[neighbor.r][neighbor.c] = tentativeG;

                const h = manhattanDistance(neighbor, endNode);
                // Busca Gulosa prioriza apenas h(n)
                // A* prioriza g(n) + h(n)
                const f = type === 'greedy' ? h : tentativeG + h;

                openSet.push({
                    r: neighbor.r,
                    c: neighbor.c,
                    g: tentativeG,
                    h: h,
                    f: f,
                    order: insertionCounter++
                });
            }
        }
    }

    // Reconstrução do caminho do Hospital até a Ambulância
    const finalPath = [];
    if (found) {
        let curr = endNode;
        while (!(curr.r === startNode.r && curr.c === startNode.c)) {
            finalPath.push(curr);
            curr = cameFrom.get(key(curr.r, curr.c));
            if (!curr) break;
        }
        finalPath.reverse();
    }

    return {
        found,
        exploredOrder,
        finalPath, // Inclui o nó de destino (número de passos exato da rota)
        pathCost: found ? gScore[endNode.r][endNode.c] : 0,
        exploredCount: exploredOrder.length
    };
}

/**
 * Converte o valor do slider (1..100) em atraso (ms) e quantidade de células por quadro
 */
function getSpeedConfig() {
    const val = parseInt(speedSlider.value, 10);

    if (val >= 95) {
        return { delayMs: 0, stepsPerFrame: 8, label: 'Instantânea / Turbo' };
    } else if (val >= 75) {
        return { delayMs: 8, stepsPerFrame: 3, label: 'Rápida' };
    } else if (val >= 45) {
        return { delayMs: 22, stepsPerFrame: 1, label: 'Normal' };
    } else if (val >= 20) {
        return { delayMs: 55, stepsPerFrame: 1, label: 'Lenta' };
    } else {
        return { delayMs: 120, stepsPerFrame: 1, label: 'Passo a Passo' };
    }
}

/**
 * Utilitário de pausa assíncrona controlada
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Atualiza o Dashboard de Métricas principal
 */
function updateDashboard(algoName, statusText, statusClass, cost, explored) {
    metricAlgo.textContent = algoName;
    metricStatus.textContent = statusText;
    metricStatus.className = `status-pill ${statusClass}`;
    metricCost.textContent = cost;
    metricExplored.textContent = explored;
}

/**
 * Atualiza a tabela comparativa ao final da execução
 */
function updateComparisonRow(type, found, cost, steps, explored) {
    const statusStr = found ? '✅ Alcançado' : '❌ Sem Rota';
    const costStr = found ? `${cost} (${steps} passos)` : '—';
    if (type === 'greedy') {
        compGreedyStatus.textContent = statusStr;
        compGreedyCost.textContent = costStr;
        compGreedyExplored.textContent = `${explored} nós`;
    } else {
        compAstarStatus.textContent = statusStr;
        compAstarCost.textContent = costStr;
        compAstarExplored.textContent = `${explored} nós`;
    }
}

/**
 * Bloqueia/desbloqueia botões durante a execução da animação
 */
function setControlsDisabled(disabled) {
    btnGreedy.disabled = disabled;
    btnAstar.disabled = disabled;
    btnBoth.disabled = disabled;
    btnRandom.disabled = disabled;
}

/**
 * Interrompe qualquer animação em andamento
 */
function stopAnimation() {
    if (animationAbortController) {
        animationAbortController.aborted = true;
    }
    isAnimating = false;
    setControlsDisabled(false);
}

/**
 * Anima a execução da Busca Gulosa ou do A*
 * driveAmbulance: ao final, uma ambulância animada "dirige" pela rota GPS
 */
async function runSearchAnimation(type, clearBefore = true, driveAmbulance = true) {
    if (isAnimating) stopAnimation();

    if (clearBefore) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] !== CELL_STATE.WALL) {
                    grid[r][c] = CELL_STATE.EMPTY;
                }
            }
        }
        clearRouteLines();
        renderGrid();
    }

    isAnimating = true;
    const abortToken = { aborted: false };
    animationAbortController = abortToken;
    setControlsDisabled(true);

    const algoTitle = type === 'greedy' ? 'Busca Gulosa (Greedy)' : 'Algoritmo A* (A-Estrela)';
    const exploredState = type === 'greedy' ? CELL_STATE.EXPLORED_GREEDY : CELL_STATE.EXPLORED_ASTAR;
    const pathState = type === 'greedy' ? CELL_STATE.PATH_GREEDY : CELL_STATE.PATH_ASTAR;

    updateDashboard(algoTitle, 'Executando...', 'status-running', 0, 0);

    const result = computeSearchAlgorithm(type);

    // 1. Animação dos Nós Explorados
    let currentExplored = 0;
    for (let i = 0; i < result.exploredOrder.length; i++) {
        if (abortToken.aborted) return;

        const node = result.exploredOrder[i];
        grid[node.r][node.c] = exploredState;
        drawCell(node.r, node.c);
        currentExplored++;

        const { delayMs, stepsPerFrame } = getSpeedConfig();
        if (i % stepsPerFrame === 0 || i === result.exploredOrder.length - 1) {
            metricExplored.textContent = currentExplored;
            if (delayMs > 0) {
                await sleep(delayMs);
            } else {
                await new Promise(requestAnimationFrame);
            }
        }
    }

    if (abortToken.aborted) return;

    // 2. Animação do Caminho Final (se encontrado) com rota em estilo GPS
    if (result.found) {
        const linePoints = [{ r: startNode.r, c: startNode.c }];
        routeLines.push({ type, points: linePoints });

        let currentCost = 0;
        for (let i = 0; i < result.finalPath.length; i++) {
            if (abortToken.aborted) return;

            const node = result.finalPath[i];
            const isEnd = node.r === endNode.r && node.c === endNode.c;

            if (!isEnd) {
                grid[node.r][node.c] = pathState;
                drawCell(node.r, node.c);
            }

            // A linha GPS cresce junto com o caminho
            linePoints.push({ r: node.r, c: node.c });
            redrawRouteOverlay();

            currentCost += costs[node.r][node.c];
            metricCost.textContent = currentCost;

            const { delayMs } = getSpeedConfig();
            await sleep(Math.max(12, Math.floor(delayMs * 0.8)));
        }

        if (abortToken.aborted) return;

        // 3. A ambulância dirige pela rota, desacelerando no trânsito
        if (driveAmbulance) {
            updateDashboard(algoTitle, 'Ambulância a caminho...', 'status-running', result.pathCost, result.exploredCount);
            await animateAmbulanceDrive(linePoints, abortToken);
            if (abortToken.aborted) return;
        }

        updateDashboard(
            algoTitle,
            'Destino Alcançado',
            'status-success',
            result.pathCost,
            result.exploredCount
        );
    } else {
        updateDashboard(
            algoTitle,
            'Sem Caminho Possível',
            'status-fail',
            0,
            result.exploredCount
        );
    }

    updateComparisonRow(type, result.found, result.pathCost, result.finalPath.length, result.exploredCount);

    isAnimating = false;
    setControlsDisabled(false);
}

/**
 * Executa a Busca Gulosa seguida do A* no mesmo mapa para facilitar a comparação visual e métrica.
 * A ambulância animada dirige apenas na rota final do A*.
 */
async function runBothComparison() {
    await runSearchAnimation('greedy', true, false);
    if (!animationAbortController || animationAbortController.aborted) return;
    await sleep(650);
    if (!animationAbortController || animationAbortController.aborted) return;
    await runSearchAnimation('astar', false, true);
}

/**
 * Interação com o Canvas: Desenhar obstáculos ou mover Ambulância / Hospital
 */
function getGridCoordsFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const c = Math.floor(x / CELL_SIZE);
    const r = Math.floor(y / CELL_SIZE);

    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        return { r, c };
    }
    return null;
}

function getSelectedTool() {
    const checked = document.querySelector('input[name="draw-tool"]:checked');
    return checked ? checked.value : 'wall';
}

/**
 * Encontra a rua/avenida aberta mais próxima de (sr, sc) via BFS.
 * Retorna null se não existir nenhuma via no mapa.
 */
function findNearestStreetCell(sr, sc) {
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    const queue = [{ r: sr, c: sc }];
    visited[sr][sc] = true;

    while (queue.length > 0) {
        const curr = queue.shift();
        if (roadType[curr.r][curr.c] !== ROAD.NONE && grid[curr.r][curr.c] !== CELL_STATE.WALL) {
            return { r: curr.r, c: curr.c };
        }
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nr = curr.r + dr;
            const nc = curr.c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc });
            }
        }
    }
    return null;
}

/**
 * Ambulância e hospital só podem ficar em vias: reposiciona o clique
 * para a rua/avenida aberta mais próxima (como em um GPS de verdade).
 */
function snapToStreet(r, c) {
    if (grid[r][c] !== CELL_STATE.WALL && roadType[r][c] !== ROAD.NONE) {
        return { r, c };
    }
    const nearest = findNearestStreetCell(r, c);
    return nearest || { r, c };
}

function handleCanvasInteraction(e, isInitialClick = false) {
    if (isAnimating) return;

    const coords = getGridCoordsFromEvent(e);
    if (!coords) return;

    const { r, c } = coords;
    const tool = getSelectedTool();

    if (tool === 'start') {
        const target = snapToStreet(r, c);
        if (target.r === endNode.r && target.c === endNode.c) return;
        grid[target.r][target.c] = CELL_STATE.EMPTY;
        startNode = target;
        clearPaths();
        resetComparisonTable();
    } else if (tool === 'end') {
        const target = snapToStreet(r, c);
        if (target.r === startNode.r && target.c === startNode.c) return;
        grid[target.r][target.c] = CELL_STATE.EMPTY;
        costs[target.r][target.c] = MIN_COST;
        endNode = target;
        clearPaths();
        resetComparisonTable();
    } else if (tool === 'wall') {
        if ((r === startNode.r && c === startNode.c) || (r === endNode.r && c === endNode.c)) {
            return;
        }
        if (isInitialClick) {
            dragEraseMode = grid[r][c] === CELL_STATE.WALL;
        }

        if (dragEraseMode) {
            // Demolir um prédio abre passagem: vira uma viela/terreno livre
            grid[r][c] = CELL_STATE.EMPTY;
            if (roadType[r][c] === ROAD.NONE) {
                roadType[r][c] = ROAD.STREET;
                cellDecor[r][c] = LAND.BUILDING;
                blockIdGrid[r][c] = 0;
                costs[r][c] = COST_STREET;
            } else {
                costs[r][c] = roadType[r][c] === ROAD.AVENUE ? COST_AVENUE : COST_STREET;
            }
        } else {
            // Obstáculo manual: sobre uma via vira interdição (obra/acidente)
            grid[r][c] = CELL_STATE.WALL;
            if (roadType[r][c] === ROAD.NONE) {
                cellDecor[r][c] = LAND.BUILDING;
                blockIdGrid[r][c] = 0;
            }
        }

        drawCell(r, c);
        clearRouteLines(); // o mapa mudou: rotas GPS antigas deixam de valer
        resetComparisonTable();
    }
}

// Eventos do Mouse no Canvas
canvas.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    handleCanvasInteraction(e, true);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    handleCanvasInteraction(e, false);
});

window.addEventListener('mouseup', () => {
    isMouseDown = false;
});

// Eventos dos Botões e Controles
btnGreedy.addEventListener('click', () => runSearchAnimation('greedy', true));
btnAstar.addEventListener('click', () => runSearchAnimation('astar', true));
btnBoth.addEventListener('click', () => runBothComparison());
btnRandom.addEventListener('click', () => generateCityMap());
btnClearPaths.addEventListener('click', () => clearPaths());
btnClearAll.addEventListener('click', () => clearAll());

speedSlider.addEventListener('input', () => {
    const { label } = getSpeedConfig();
    speedLabel.textContent = label;
});

// Inicialização ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    const { label } = getSpeedConfig();
    speedLabel.textContent = label;
    generateCityMap();
});
