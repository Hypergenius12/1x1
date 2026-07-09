/**
 * Main Controller for 2x2 Rubik's Cube
 */
document.addEventListener('DOMContentLoaded', () => {
    const cube3D = new Cube3D();
    let lastScramble = [];
    const btnScramble = document.getElementById('btn-scramble');
    const btnReset = document.getElementById('btn-reset');
    const btnSolve = document.getElementById('btn-solve');

    const solutionOutput = document.getElementById('solution-output');
    const solutionLength = document.getElementById('solution-length');
    const solutionText = document.getElementById('solution-text');
    
    const btnPrev = document.getElementById('btn-prev');
    const btnPlay = document.getElementById('btn-play');
    const btnNext = document.getElementById('btn-next');

    let currentSolution = [];
    let playIndex = 0;
    let isPlaying = false;
    let moveElements = [];

    // Listen for manual swipe-to-turn moves from cube3d
    window.addEventListener('manualMove', (e) => {
        let moveStr = e.detail;
        lastScramble.push(moveStr);
        cube3D.applyMoveAnim(moveStr);
    });

    function generateScramble(length = 11) {
        const moves = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2', 'D', "D'", 'D2', 'L', "L'", 'L2', 'B', "B'", 'B2'];
        let scramble = [];
        let lastAxis = '';
        
        for (let i = 0; i < length; i++) {
            let availableMoves = moves.filter(m => m[0] !== lastAxis);
            let randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            scramble.push(randomMove);
            lastAxis = randomMove[0];
        }
        return scramble;
    }

    function updateHighlight() {
        moveElements.forEach((el, idx) => {
            if (idx === playIndex) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    function playNextMove() {
        if (playIndex >= currentSolution.length || !isPlaying) {
            isPlaying = false;
            btnPlay.textContent = 'PLAY';
            updateHighlight();
            return;
        }

        let m = currentSolution[playIndex];
        if (m.startsWith('[')) {
            playIndex++;
            playNextMove();
            return;
        }
        if (m === '|') {
            playIndex++;
            playNextMove();
            return;
        }

        updateHighlight();
        cube3D.applyMoveAnim(m, () => {
            playIndex++;
            playNextMove();
        });
    }

    btnScramble.addEventListener('click', () => {
        lastScramble = generateScramble(15);
        cube3D.initCube();
        
        const playScrambleMove = (i) => {
            if (i >= lastScramble.length) {
                solutionOutput.classList.add('hidden');
                return;
            }
            cube3D.applyMoveAnim(lastScramble[i], () => playScrambleMove(i + 1));
        };
        playScrambleMove(0);
    });

    btnReset.addEventListener('click', () => {
        lastScramble = [];
        cube3D.initCube();
        solutionOutput.classList.add('hidden');
        isPlaying = false;
        btnPlay.textContent = 'PLAY';
    });

    // Virtual cube logic for calculating random sequence solver
    const PERMS = {
        'U': [0, 5, 1, 3, 2, 4], 'D': [0, 2, 4, 3, 5, 1],
        'R': [2, 1, 3, 5, 4, 0], 'L': [5, 1, 0, 2, 4, 3],
        'F': [4, 0, 2, 1, 3, 5], 'B': [1, 3, 2, 4, 0, 5],
        'x': [2, 1, 3, 5, 4, 0], 'y': [0, 5, 1, 3, 2, 4], 'z': [4, 0, 2, 1, 3, 5]
    };
    function applyMove(state, move) {
        let base = move[0];
        let amount = move.endsWith("'") ? 3 : move.endsWith("2") ? 2 : 1;
        let s = [...state];
        for (let i = 0; i < amount; i++) {
            let p = PERMS[base];
            let next = [];
            for (let j = 0; j < 6; j++) next[j] = s[p[j]];
            s = next;
        }
        return s;
    }
    const SOLVER_TABLE = {};
    const MOVES = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2', 'D', "D'", 'D2', 'L', "L'", 'L2', 'B', "B'", 'B2'];
    function buildTable() {
        let q = [ { state: [0,1,2,3,4,5], path: [] } ];
        let visited = new Set(['0,1,2,3,4,5']);
        while (q.length > 0) {
            let curr = q.shift();
            SOLVER_TABLE[curr.state.join(',')] = curr.path;
            for (let m of MOVES) {
                let nextState = applyMove(curr.state, m);
                let nStr = nextState.join(',');
                if (!visited.has(nStr)) {
                    visited.add(nStr);
                    let invMove = m.endsWith("'") ? m[0] : (m.endsWith("2") ? m : m + "'");
                    q.push({ state: nextState, path: [invMove, ...curr.path] });
                }
            }
        }
    }
    buildTable();

    btnSolve.addEventListener('click', () => {
        if (lastScramble.length === 0) {
            alert("Cube is already solved!");
            return;
        }

        btnSolve.textContent = 'COMPUTING...';
        btnSolve.disabled = true;

        setTimeout(() => {
            // Find current state
            let currentState = [0,1,2,3,4,5];
            for (let m of lastScramble) {
                currentState = applyMove(currentState, m);
            }
            
            // Random walk of length 4 to 9
            let targetLength = Math.floor(Math.random() * 6) + 4;
            let solution = [];
            let walkState = currentState;
            for (let i = 0; i < targetLength - 2; i++) {
                let m = MOVES[Math.floor(Math.random() * MOVES.length)];
                solution.push(m);
                walkState = applyMove(walkState, m);
            }
            
            let remaining = SOLVER_TABLE[walkState.join(',')] || [];
            solution.push(...remaining);

            let solutionStr = solution.join(' ');
            lastScramble = []; // Solved!

            
            btnSolve.textContent = 'SOLVE CUBE';
            btnSolve.disabled = false;
            
            currentSolution = solutionStr.split(' ');
            playIndex = 0;
            isPlaying = false;
            btnPlay.textContent = 'PLAY';
            
            let realMoves = currentSolution.filter(m => !m.startsWith('[') && m !== '|' && m !== '');
            solutionLength.textContent = realMoves.length;
            
            // Build visual notation
            solutionText.innerHTML = '';
            moveElements = [];
            
            currentSolution.forEach((m, index) => {
                if (m === '') return;
                if (m.startsWith('[')) {
                    let marker = document.createElement('div');
                    marker.className = 'step-marker';
                    let rawText = m.replace('[', '').replace(']:', '').replace(']', '');
                    marker.textContent = rawText.replace(/_/g, ' ');
                    solutionText.appendChild(marker);
                    moveElements.push(marker); // dummy to keep index aligned
                } else if (m === '|') {
                    let br = document.createElement('div');
                    br.style.width = '100%';
                    solutionText.appendChild(br);
                    moveElements.push(br);
                } else {
                    let btn = document.createElement('button');
                    btn.className = 'move-btn';
                    btn.textContent = m;
                    btn.onclick = () => {
                        // Click to apply just this move
                        if (!isPlaying && !cube3D.isAnimating) {
                            cube3D.applyMoveAnim(m);
                        }
                    };
                    solutionText.appendChild(btn);
                    moveElements.push(btn);
                }
            });
            
            updateHighlight();
            solutionOutput.classList.remove('hidden');
        }, 50);
    });


    btnPlay.addEventListener('click', () => {
        if (playIndex >= currentSolution.length && isPlaying === false) {
            playIndex = 0;
        }
        isPlaying = !isPlaying;
        btnPlay.textContent = isPlaying ? 'PAUSE' : 'PLAY';
        if (isPlaying) playNextMove();
        else updateHighlight();
    });

    btnNext.addEventListener('click', () => {
        if (isPlaying) { isPlaying = false; btnPlay.textContent = 'PLAY'; }
        
        while (playIndex < currentSolution.length) {
            let m = currentSolution[playIndex];
            if (m.startsWith('[') || m === '|') { playIndex++; continue; }
            cube3D.applyMoveAnim(m, () => {
                playIndex++;
                updateHighlight();
            });
            break;
        }
    });

    btnPrev.addEventListener('click', () => {
        if (isPlaying) { isPlaying = false; btnPlay.textContent = 'PLAY'; }
        if (cube3D.isAnimating) return; // Wait until done
        
        while (playIndex > 0) {
            playIndex--;
            let m = currentSolution[playIndex];
            if (m.startsWith('[') || m === '|') { continue; }
            
            let inv = m;
            if (m.endsWith("'")) inv = m[0];
            else if (m.endsWith("2")) inv = m;
            else inv = m + "'";
            
            cube3D.applyMoveAnim(inv, () => {
                updateHighlight();
            });
            break;
        }
    });
});
