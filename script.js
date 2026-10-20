/**
 * Simulador Interativo de Algoritmos de Busca: Busca Gulosa vs A*
 * Matriz 40x40 em HTML5 Canvas
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
    WALL: '#1e293b',           // Preto / Cinza Escuro (Obstáculos)
    EXPLORED_GREEDY: '#7dd3fc',// Azul Claro (Exploração Busca Gulosa)
    PATH_GREEDY: '#1d4ed8',    // Azul Escuro (Caminho Final Busca Gulosa)
    EXPLORED_ASTAR: '#fef08a', // Amarelo Claro (Exploração A*)
    PATH_ASTAR: '#b45309'      // Amarelo Escuro (Caminho Final A*)
};

// Elementos do DOM
const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');

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

// Estado da Aplicação
let grid = [];
let startNode = { r: 4, c: 4 };
let endNode = { r: 35, c: 35 };
let isAnimating = false;
let animationAbortController = null;

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
 * Desenha uma única célula no Canvas
 */
function drawCell(r, c) {
    const x = c * CELL_SIZE;
    const y = r * CELL_SIZE;

    const isStart = r === startNode.r && c === startNode.c;
    const isEnd = r === endNode.r && c === endNode.c;

    // Cor de fundo da célula
    if (isStart) {
        ctx.fillStyle = COLORS.START;
    } else if (isEnd) {
        ctx.fillStyle = COLORS.END;
    } else {
        switch (grid[r][c]) {
            case CELL_STATE.WALL:
                ctx.fillStyle = COLORS.WALL;
                break;
            case CELL_STATE.EXPLORED_GREEDY:
                ctx.fillStyle = COLORS.EXPLORED_GREEDY;
                break;
            case CELL_STATE.PATH_GREEDY:
                ctx.fillStyle = COLORS.PATH_GREEDY;
                break;
            case CELL_STATE.EXPLORED_ASTAR:
                ctx.fillStyle = COLORS.EXPLORED_ASTAR;
                break;
            case CELL_STATE.PATH_ASTAR:
                ctx.fillStyle = COLORS.PATH_ASTAR;
                break;
            default:
                ctx.fillStyle = COLORS.EMPTY;
        }
    }

    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    // Borda sutil da grade
    ctx.strokeStyle = COLORS.GRID_LINE;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

    // Marcador visual para Ambulância (Início) e Hospital (Fim)
    if (isStart || isEnd) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isStart ? 'A' : 'H', x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 0.5);
    }
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
    renderGrid();
    updateDashboard('—', 'Aguardando', 'status-idle', 0, 0);
}

/**
 * Limpa todo o mapa (obstáculos e caminhos) e reseta métricas comparativas
 */
function clearAll() {
    if (isAnimating) stopAnimation();
    initGrid();
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

/**
 * Gera um mapa urbano com obstáculos aleatórios (~28% de densidade)
 * Garante que o início e o destino (e seus arredores imediatos) fiquem livres
 * e que exista ao menos um caminho válido até o hospital.
 */
function generateRandomMap() {
    if (isAnimating) stopAnimation();

    const obstacleDensity = 0.28;
    let attempts = 0;

    do {
        initGrid();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const isStart = r === startNode.r && c === startNode.c;
                const isEnd = r === endNode.r && c === endNode.c;

                if (!isStart && !isEnd && Math.random() < obstacleDensity) {
                    grid[r][c] = CELL_STATE.WALL;
                }
            }
        }

        // Adiciona algumas "quadras/armadilhas em U" para evidenciar a diferença entre Gulosa e A*
        createUrbanBlocks();

        // Garante que início e destino não estejam cercados imediatamente
        grid[startNode.r][startNode.c] = CELL_STATE.EMPTY;
        grid[endNode.r][endNode.c] = CELL_STATE.EMPTY;

        attempts++;
    } while (!hasValidPath() && attempts < 15);

    renderGrid();
    updateDashboard('—', 'Mapa Gerado', 'status-idle', 0, 0);
    resetComparisonTable();
}

/**
 * Cria alguns blocos urbanos estruturados para simular barreiras reais de trânsito
 */
function createUrbanBlocks() {
    const numWalls = 4;
    for (let i = 0; i < numWalls; i++) {
        const wr = Math.floor(Math.random() * (GRID_SIZE - 12)) + 6;
        const wc = Math.floor(Math.random() * (GRID_SIZE - 12)) + 6;
        const length = Math.floor(Math.random() * 6) + 4;
        const horizontal = Math.random() < 0.5;

        for (let k = 0; k < length; k++) {
            const r = horizontal ? wr : wr + k;
            const c = horizontal ? wc + k : wc;
            if (
                r >= 0 && r < GRID_SIZE &&
                c >= 0 && c < GRID_SIZE &&
                !(r === startNode.r && c === startNode.c) &&
                !(r === endNode.r && c === endNode.c)
            ) {
                grid[r][c] = CELL_STATE.WALL;
            }
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

    // Custo g(n): distância real desde o início
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

            const tentativeG = gScore[current.r][current.c] + 1;

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
function updateComparisonRow(type, found, cost, explored) {
    const statusStr = found ? '✅ Alcançado' : '❌ Sem Rota';
    if (type === 'greedy') {
        compGreedyStatus.textContent = statusStr;
        compGreedyCost.textContent = found ? `${cost} passos` : '—';
        compGreedyExplored.textContent = `${explored} nós`;
    } else {
        compAstarStatus.textContent = statusStr;
        compAstarCost.textContent = found ? `${cost} passos` : '—';
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
 */
async function runSearchAnimation(type, clearBefore = true) {
    if (isAnimating) stopAnimation();

    if (clearBefore) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] !== CELL_STATE.WALL) {
                    grid[r][c] = CELL_STATE.EMPTY;
                }
            }
        }
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

    // 2. Animação do Caminho Final (se encontrado)
    if (result.found) {
        let currentSteps = 0;
        for (let i = 0; i < result.finalPath.length; i++) {
            if (abortToken.aborted) return;

            const node = result.finalPath[i];
            const isEnd = node.r === endNode.r && node.c === endNode.c;

            if (!isEnd) {
                grid[node.r][node.c] = pathState;
                drawCell(node.r, node.c);
            }
            currentSteps++;
            metricCost.textContent = currentSteps;

            const { delayMs } = getSpeedConfig();
            await sleep(Math.max(12, Math.floor(delayMs * 0.8)));
        }

        updateDashboard(
            algoTitle,
            'Destino Alcançado',
            'status-success',
            result.finalPath.length,
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

    updateComparisonRow(type, result.found, result.finalPath.length, result.exploredCount);

    isAnimating = false;
    setControlsDisabled(false);
}

/**
 * Executa a Busca Gulosa seguida do A* no mesmo mapa para facilitar a comparação visual e métrica
 */
async function runBothComparison() {
    await runSearchAnimation('greedy', true);
    if (!animationAbortController || animationAbortController.aborted) return;
    await sleep(650);
    if (!animationAbortController || animationAbortController.aborted) return;
    await runSearchAnimation('astar', false);
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

function handleCanvasInteraction(e, isInitialClick = false) {
    if (isAnimating) return;

    const coords = getGridCoordsFromEvent(e);
    if (!coords) return;

    const { r, c } = coords;
    const tool = getSelectedTool();

    if (tool === 'start') {
        if (r === endNode.r && c === endNode.c) return;
        grid[r][c] = CELL_STATE.EMPTY;
        startNode = { r, c };
        clearPaths();
        resetComparisonTable();
    } else if (tool === 'end') {
        if (r === startNode.r && c === startNode.c) return;
        grid[r][c] = CELL_STATE.EMPTY;
        endNode = { r, c };
        clearPaths();
        resetComparisonTable();
    } else if (tool === 'wall') {
        if ((r === startNode.r && c === startNode.c) || (r === endNode.r && c === endNode.c)) {
            return;
        }
        if (isInitialClick) {
            dragEraseMode = grid[r][c] === CELL_STATE.WALL;
        }
        grid[r][c] = dragEraseMode ? CELL_STATE.EMPTY : CELL_STATE.WALL;
        drawCell(r, c);
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
btnRandom.addEventListener('click', () => generateRandomMap());
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
    generateRandomMap();
});
