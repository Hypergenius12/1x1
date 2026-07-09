/**
 * 3D Renderer for 2x2 Rubik's Cube
 */
let COLORS = {
    U: 0xffffff, // White
    D: 0xffd500, // Yellow
    F: 0x009e60, // Green
    B: 0x0051ba, // Blue
    R: 0xc41e3a, // Red
    L: 0xff5800, // Orange
    X: 0x222222  // Interior (Black/Dark Grey)
};

class Cube3D {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(4, 4, 6);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xffffff, 1); // White bg for minimal css
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        this.controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
        this.controls.rotateSpeed = 3.0;
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 0.8;
        this.controls.noPan = true; // Prevents panning the cube off center

        // Lighting
        let ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        this.pieces = []; // length 8, stores the 3D meshes in logical index order
        this.isAnimating = false;
        this.animationQueue = [];
        this.animSpeed = 8;
        this.initCube();
        
        // Raycasting for interactive turning
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragInfo = null;

        this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this), { capture: true });
        window.addEventListener('pointermove', this.onPointerMove.bind(this), { capture: true });
        window.addEventListener('pointerup', this.onPointerUp.bind(this), { capture: true });
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    getMaterials(idx) {
        // For a 1x1 cube, the faces are: Right, Left, Top, Bottom, Front, Back
        let cols = [
            COLORS.R, // Right
            COLORS.L, // Left
            COLORS.U, // Top
            COLORS.D, // Bottom
            COLORS.F, // Front
            COLORS.B  // Back
        ];
        
        return cols.map(c => new THREE.MeshBasicMaterial({ 
            color: c, 
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        }));
    }

    setSpeed(speedVal) {
        if (speedVal === 'slow') this.animSpeed = 16;
        else if (speedVal === 'fast') this.animSpeed = 4;
        else if (speedVal === 'instant') this.animSpeed = 1;
        else this.animSpeed = 8;
    }

    setColors(scheme) {
        if (scheme === 'pastel') {
            COLORS = { U: 0xffffff, D: 0xfdfd96, F: 0x77dd77, B: 0x84b6f4, R: 0xff6961, L: 0xffb347, X: 0x222222 };
        } else if (scheme === 'neon') {
            COLORS = { U: 0xffffff, D: 0xccff00, F: 0x39ff14, B: 0x04d9ff, R: 0xff003f, L: 0xff7300, X: 0x111111 };
        } else {
            COLORS = { U: 0xffffff, D: 0xffd500, F: 0x009e60, B: 0x0051ba, R: 0xc41e3a, L: 0xff5800, X: 0x222222 };
        }
        
        if (this.pieces && this.pieces.length === 1) {
            let mesh = this.pieces[0];
            let originalIndex = mesh.userData.logicalIndex;
            mesh.material = this.getMaterials(originalIndex);
        } else {
            this.initCube();
        }
    }

    setAutoRotate(enabled) {
        this.controls.autoRotate = enabled;
        this.controls.autoRotateSpeed = 2.0;
    }

    setCamera(type) {
        let aspect = window.innerWidth / window.innerHeight;
        let d = 4;
        
        if (type === 'orthographic' || type === 'isometric') {
            if (!(this.camera instanceof THREE.OrthographicCamera)) {
                let currentPos = this.camera.position.clone();
                this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100);
                this.camera.position.copy(currentPos);
                this.controls.object = this.camera;
            }
        } else {
            if (!(this.camera instanceof THREE.PerspectiveCamera)) {
                let currentPos = this.camera.position.clone();
                this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
                this.camera.position.copy(currentPos);
                this.controls.object = this.camera;
            }
        }
        
        if (type === 'isometric') {
            this.camera.position.set(5, 5, 5);
        }
        
        this.camera.lookAt(0,0,0);
        this.controls.target.set(0,0,0);
        this.camera.updateProjectionMatrix();
        this.controls.update();
    }

    setStyle(type) {
        this.stickerStyle = type;
        this.initCube();
    }

    initCube() {
        if (this.pieces.length > 0) {
            this.pieces.forEach(p => {
                if (p.parent) p.parent.remove(p);
            });
            this.pieces = [];
        }
        
        this.animationQueue.forEach(anim => {
            if (anim.group && anim.group.parent) anim.group.parent.remove(anim.group);
        });
        this.animationQueue = [];
        this.isAnimating = false;

        const positions = [
            [0, 0, 0] // Only 1 piece for 1x1
        ];

        let geoType = this.stickerStyle || 'block';
        let geometry;
        if (geoType === 'floating') {
            geometry = new THREE.BoxGeometry(0.75, 0.75, 0.75);
        } else {
            geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
        }

        for (let i = 0; i < 1; i++) {
            let materials = this.getMaterials(i);
            if (geoType === 'wireframe') {
                materials.forEach(m => {
                    m.transparent = true;
                    m.opacity = 0.15;
                });
            }
            let mesh = new THREE.Mesh(geometry, materials);
            
            let geo = new THREE.EdgesGeometry(mesh.geometry);
            let edgeColor = geoType === 'wireframe' ? 0xaaaaaa : 0x000000;
            let mat = new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 });
            let wireframe = new THREE.LineSegments(geo, mat);
            mesh.add(wireframe);

            mesh.position.set(...positions[i]);
            mesh.userData = { logicalIndex: i };
            this.scene.add(mesh);
            this.pieces.push(mesh);
        }
    }


    applyMoveAnim(moveStr, callback) {
        let axis, dir, piecesToMove;
        let isPrime = false;
        let isDouble = false;
        let baseMove = moveStr[0];
        let angle = Math.PI / 2;
        if (moveStr.endsWith("'")) {
            isPrime = true;
            angle = -Math.PI / 2;
        } else if (moveStr.endsWith("2")) {
            isDouble = true;
            angle = Math.PI;
        }
        
        if (baseMove === 'x') {
            axis = new THREE.Vector3(1, 0, 0); dir = -1; piecesToMove = [0];
        } else if (baseMove === 'y') {
            axis = new THREE.Vector3(0, 1, 0); dir = -1; piecesToMove = [0];
        } else if (baseMove === 'z') {
            axis = new THREE.Vector3(0, 0, 1); dir = -1; piecesToMove = [0];
        }

        let targetAngle = angle * dir;
        
        let group = new THREE.Group();
        this.scene.add(group);
        let activeMeshes = piecesToMove.map(idx => this.pieces[idx]);
        
        activeMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            group.add(mesh);
        });

        this.animationQueue.push({
            group,
            activeMeshes,
            axis,
            targetAngle,
            currentAngle: 0,
            piecesToMove,
            isPrime,
            isDouble,
            callback
        });
        
        this.isAnimating = true;
    }

    updateAnimation() {
        if (this.animationQueue.length === 0) {
            this.isAnimating = false;
            return;
        }

        this.isAnimating = true;
        let anim = this.animationQueue[0];
        
        // Speed
        let step = (Math.PI / 2) / this.animSpeed; 
        if (anim.targetAngle < 0) step = -step;

        anim.currentAngle += step;
        
        if (Math.abs(anim.currentAngle) >= Math.abs(anim.targetAngle)) {
            let diff = anim.targetAngle - (anim.currentAngle - step);
            anim.group.rotateOnAxis(anim.axis, diff);
            
            anim.activeMeshes.forEach(mesh => {
                mesh.updateMatrixWorld();
                this.scene.attach(mesh);
            });
            this.scene.remove(anim.group);

            // No permutation needed for 1x1 cube.

            this.animationQueue.shift();
            if (anim.callback) anim.callback();
        } else {
            anim.group.rotateOnAxis(anim.axis, step);
        }
    }

    onWindowResize() {
        let aspect = window.innerWidth / window.innerHeight;
        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.camera.aspect = aspect;
        } else {
            let d = 4;
            this.camera.left = -d * aspect;
            this.camera.right = d * aspect;
            this.camera.top = d;
            this.camera.bottom = -d;
        }
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.controls.handleResize();
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.updateAnimation();
        this.renderer.render(this.scene, this.camera);
    }
}
