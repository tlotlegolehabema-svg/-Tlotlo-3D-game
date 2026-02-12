// Game Configuration
const CONFIG = {
    PLAYER_SPEED: 0.15,
    PLAYER_SIZE: 0.5,
    CUBE_SIZE: 0.4,
    WORLD_SIZE: 50,
    NUM_CUBES: 20,
    CUBE_SPAWN_DISTANCE: 5,
    CAMERA_DISTANCE: 8,
    CAMERA_HEIGHT: 5
};

// Game State
const gameState = {
    score: 0,
    health: 100,
    playerPosition: new THREE.Vector3(0, CONFIG.PLAYER_SIZE, 0),
    playerVelocity: new THREE.Vector3(0, 0, 0),
    isJumping: false,
    cubes: [],
    keys: {},
    touchControls: {}
};

// Scene Setup
let scene, camera, renderer;
let playerMesh, groundMesh;
let animationId;

// Initialize Game
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    scene.fog = new THREE.Fog(0x000011, 100, 150);

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    document.getElementById('gameContainer').appendChild(renderer.domElement);

    // Lighting
    setupLighting();

    // Ground
    createGround();

    // Player
    createPlayer();

    // Cubes
    spawnCubes();

    // Event Listeners
    setupControls();
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('orientationchange', onWindowResize);

    // Hide title after 3 seconds
    setTimeout(() => {
        document.getElementById('title').classList.add('hidden');
    }, 3000);

    // Start Game Loop
    gameLoop();
}

// Setup Lighting
function setupLighting() {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    // Directional Light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Point Light (Glowing effect)
    const pointLight = new THREE.PointLight(0x00ff00, 1, 50);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);
}

// Create Ground
function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE * 2, CONFIG.WORLD_SIZE * 2);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a3a1a,
        metalness: 0.3,
        roughness: 0.8
    });

    groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Add grid lines
    const gridHelper = new THREE.GridHelper(CONFIG.WORLD_SIZE * 2, 50, 0x00ff00, 0x003300);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
}

// Create Player
function createPlayer() {
    const playerGeometry = new THREE.IcosahedronGeometry(CONFIG.PLAYER_SIZE, 4);
    const playerMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00aa00,
        metalness: 0.5,
        roughness: 0.5
    });

    playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.position.copy(gameState.playerPosition);
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true;
    scene.add(playerMesh);
}

// Spawn Cubes
function spawnCubes() {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];

    for (let i = 0; i < CONFIG.NUM_CUBES; i++) {
        const cube = createCube(colors[i % colors.length]);
        gameState.cubes.push(cube);
    }
}

// Create Individual Cube
function createCube(color) {
    const cubeGeometry = new THREE.BoxGeometry(
        CONFIG.CUBE_SIZE,
        CONFIG.CUBE_SIZE,
        CONFIG.CUBE_SIZE
    );
    const cubeMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        metalness: 0.6,
        roughness: 0.4
    });

    const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cubeMesh.castShadow = true;
    cubeMesh.receiveShadow = true;

    // Random spawn position
    const angle = Math.random() * Math.PI * 2;
    const distance = CONFIG.CUBE_SPAWN_DISTANCE + Math.random() * 10;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    cubeMesh.position.set(x, CONFIG.CUBE_SIZE / 2, z);
    cubeMesh.userData.collected = false;

    scene.add(cubeMesh);

    return {
        mesh: cubeMesh,
        originalY: cubeMesh.position.y,
        color: color
    };
}

// Setup Controls
function setupControls() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
        gameState.keys[e.key.toLowerCase()] = true;
        if (e.key === ' ') {
            e.preventDefault();
            jump();
        }
    });

    window.addEventListener('keyup', (e) => {
        gameState.keys[e.key.toLowerCase()] = false;
    });

    // Mobile Controls
    const mobileControls = document.getElementById('mobileControls');
    const buttons = mobileControls.querySelectorAll('.control-btn');

    buttons.forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const direction = btn.dataset.direction;
            gameState.touchControls[direction] = true;
        });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            const direction = btn.dataset.direction;
            gameState.touchControls[direction] = false;
        });

        btn.addEventListener('mousedown', () => {
            const direction = btn.dataset.direction;
            gameState.touchControls[direction] = true;
        });

        btn.addEventListener('mouseup', () => {
            const direction = btn.dataset.direction;
            gameState.touchControls[direction] = false;
        });
    });

    // Show mobile controls on mobile devices
    if (isMobile()) {
        mobileControls.classList.add('active');
    }
}

// Check if Mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Jump Function
function jump() {
    if (!gameState.isJumping) {
        gameState.playerVelocity.y = 0.25;
        gameState.isJumping = true;
    }
}

// Update Player Position
function updatePlayer() {
    const moveDirection = new THREE.Vector3();

    // Keyboard Controls
    if (gameState.keys['arrowup'] || gameState.keys['w']) moveDirection.z -= 1;
    if (gameState.keys['arrowdown'] || gameState.keys['s']) moveDirection.z += 1;
    if (gameState.keys['arrowleft'] || gameState.keys['a']) moveDirection.x -= 1;
    if (gameState.keys['arrowright'] || gameState.keys['d']) moveDirection.x += 1;

    // Mobile Controls
    if (gameState.touchControls.up) moveDirection.z -= 1;
    if (gameState.touchControls.down) moveDirection.z += 1;
    if (gameState.touchControls.left) moveDirection.x -= 1;
    if (gameState.touchControls.right) moveDirection.x += 1;

    // Normalize diagonal movement
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        gameState.playerPosition.x += moveDirection.x * CONFIG.PLAYER_SPEED;
        gameState.playerPosition.z += moveDirection.z * CONFIG.PLAYER_SPEED;
    }

    // Apply Gravity
    gameState.playerVelocity.y -= 0.01;
    gameState.playerPosition.y += gameState.playerVelocity.y;

    // Ground Collision
    if (gameState.playerPosition.y <= CONFIG.PLAYER_SIZE) {
        gameState.playerPosition.y = CONFIG.PLAYER_SIZE;
        gameState.playerVelocity.y = 0;
        gameState.isJumping = false;
    }

    // World Boundaries
    const boundary = CONFIG.WORLD_SIZE;
    gameState.playerPosition.x = Math.max(-boundary, Math.min(boundary, gameState.playerPosition.x));
    gameState.playerPosition.z = Math.max(-boundary, Math.min(boundary, gameState.playerPosition.z));

    // Update Player Mesh
    playerMesh.position.copy(gameState.playerPosition);

    // Rotate Player
    playerMesh.rotation.x += 0.005;
    playerMesh.rotation.z += 0.003;
}

// Update Cubes
function updateCubes() {
    gameState.cubes.forEach((cubeObj, index) => {
        const cube = cubeObj.mesh;

        // Floating Animation
        cube.position.y = cubeObj.originalY + Math.sin(Date.now() * 0.001 + index) * 0.3;

        // Rotation
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        // Check Collision with Player
        const distance = gameState.playerPosition.distanceTo(cube.position);
        if (distance < CONFIG.PLAYER_SIZE + CONFIG.CUBE_SIZE && !cube.userData.collected) {
            collectCube(cubeObj, index);
        }
    });
}

// Collect Cube
function collectCube(cubeObj, index) {
    const cube = cubeObj.mesh;
    cube.userData.collected = true;

    // Add Score
    gameState.score += 10;
    document.getElementById('score').textContent = gameState.score;

    // Remove from scene
    scene.remove(cube);

    // Respawn Cube
    setTimeout(() => {
        scene.remove(cubeObj.mesh);
        const newCube = createCube(cubeObj.color);
        gameState.cubes[index] = newCube;
    }, 500);
}

// Update Camera
function updateCamera() {
    const cameraOffset = new THREE.Vector3(
        Math.sin(Date.now() * 0.0003) * CONFIG.CAMERA_DISTANCE,
        CONFIG.CAMERA_HEIGHT,
        Math.cos(Date.now() * 0.0003) * CONFIG.CAMERA_DISTANCE
    );

    camera.position.lerp(
        gameState.playerPosition.clone().add(cameraOffset),
        0.1
    );
    camera.lookAt(gameState.playerPosition);
}

// Window Resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Game Loop
function gameLoop() {
    animationId = requestAnimationFrame(gameLoop);

    updatePlayer();
    updateCubes();
    updateCamera();

    renderer.render(scene, camera);
}

// Start Game
window.addEventListener('load', init);
