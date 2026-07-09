/**
 * Main Controller for 2x2 Rubik's Cube
 */
document.addEventListener('DOMContentLoaded', () => {
    const cube3D = new Cube3D();
    let lastScramble = [];
    const btnScramble = document.getElementById('btn-scramble');
    const btnReset = document.getElementById('btn-reset');
    const btnSolve = document.getElementById('btn-solve');
    const solveMethodSelect = document.getElementById('solve-method');
    const settingSpeed = document.getElementById('setting-speed');
    const settingColors = document.getElementById('setting-colors');
    const settingCamera = document.getElementById('setting-camera');
    const settingStyle = document.getElementById('setting-style');
    
    if (settingSpeed) settingSpeed.addEventListener('change', (e) => cube3D.setSpeed(e.target.value));
    if (settingColors) settingColors.addEventListener('change', (e) => cube3D.setColors(e.target.value));
    if (settingCamera) settingCamera.addEventListener('change', (e) => cube3D.setCamera(e.target.value));
    if (settingStyle) settingStyle.addEventListener('change', (e) => cube3D.setStyle(e.target.value));

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
        cube3D.applyMoveAnim(moveStr);
    });

    function generateScramble(length = 11) {
        const moves = ['x', "x'", 'x2', 'y', "y'", 'y2', 'z', "z'", 'z2'];
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

    btnSolve.addEventListener('click', () => {
        if (lastScramble.length === 0) {
            alert("Cube is already solved!");
            return;
        }

        btnSolve.textContent = 'COMPUTING...';
        btnSolve.disabled = true;

        setTimeout(() => {
            // Inverse the scramble!
            let solution = [...lastScramble].reverse().map(m => {
                if (m.endsWith("'")) return m[0];
                if (m.endsWith("2")) return m;
                return m + "'";
            });
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
                            cubeState.applySequence(m);
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

    function solveMethodFn(cube, method) {
        return solveMethod(cube, method);
    }

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
            cubeState.applySequence(m);
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
            
            cubeState.applySequence(inv);
            cube3D.applyMoveAnim(inv, () => {
                updateHighlight();
            });
            break;
        }
    });
});
