// Game initialization and main loop
document.addEventListener('DOMContentLoaded', () => {
    console.log('Game initializing...');
    
    // Canvas setup
    const gameCanvas = document.getElementById('gameCanvas');
    const mapCanvas = document.getElementById('mapCanvas');
    
    if (!gameCanvas || !mapCanvas) {
        console.error('Canvas elements not found!');
        return;
    } // Ensure this closing brace is correctly placed and matches an opening brace.
    
    const ctx = gameCanvas.getContext('2d');
    const mapCtx = mapCanvas.getContext('2d');
    
    // Resize canvas to fill window
    function resizeCanvas() {
        gameCanvas.width = window.innerWidth;
        gameCanvas.height = window.innerHeight;
        
        // Mini-map is square, set size based on the smaller dimension
        const mapSize = Math.min(window.innerWidth, window.innerHeight) * 0.2;
        mapCanvas.width = mapSize;
        mapCanvas.height = mapSize;
        document.getElementById('miniMap').style.width = mapSize + 'px';
        document.getElementById('miniMap').style.height = mapSize + 'px';
    } // Ensure this closing brace matches an opening brace
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Game state
    const game = {
        isRunning: false,
        isPaused: false,
        showControls: false,
        showHUD: true,
        bigMap: false,
        lastTime: 0,
        deltaTime: 0,
    };
    
    // Weather and driving mode settings
    const settings = {
        weather: 'sunny', // sunny, rainy, foggy
        drivingMode: 'normal', // normal, sport, manual
        currentGear: 'N',
        assists: {
            traction: true,
            abs: true,
            hydroplaning: false,
            fogAssist: false
        } // Ensure this closing brace matches an opening brace
    };
    
    // Player car
    const player = {
        // Position and movement
        x: 0,
        y: 0,
        z: 0.5, // Height offset for camera
        angle: 0,
        speed: 0,
        acceleration: 0,
        steering: 0,
        maxSteeringAngle: 0.03,
        drift: 0,
        rpm: 0,
        
        // Vehicle stats (modified by driving mode & weather)
        maxSpeed: 200,
        accelerationRate: 0.3,
        brakeForce: 0.7,
        handling: 1.0,
        traction: 1.0,
        
        // Current state
        isAccelerating: false,
        isBraking: false,
        isTurboActive: false,
        isHandbraking: false,
        isSkidding: false,
        isHydroplaning: false,
        isInFog: false,
        
        // Effects
        skidMarks: [],
        exhaust: []
    };
    
    // Camera and view settings
    const camera = {
        height: 1.2, // Height above ground
        depth: 0.4,  // Distance forward from car position
        fov: 90,     // Field of view in degrees
        // Head movement simulation
        horizonOffset: 0, 
        sideOffset: 0
    };
    
    // World and environment
    const world = {
        // City layout
        width: 4000,
        height: 4000,
        cityBlocks: [],
        buildings: [],
        roads: [],
        roadWidth: 25,
        intersections: [],
        trees: [],
        props: [], // Street lamps, trash cans, benches, etc.
        
        // Weather effects
        raindrops: [],
        fogPatches: [],
        puddles: [],
        
        // Lighting
        ambientLight: 1.0,
        sunDirection: { x: 0.5, y: 1.0, z: 0.8 }, // Normalized vec3
        
        // Sky
        skyColor: '#87CEEB', // Sky blue
        horizonColor: '#E0F8FF', // Light blue
        
        // Ground properties
        groundFriction: 1.0, // Modified by weather
    };
    
    // Controls and input
    const keys = {
        up: false,
        down: false,
        left: false,
        right: false,
        shift: false,   // Turbo
        space: false,   // Handbrake
        m: false,       // Map toggle
        h: false,       // HUD toggle
        p: false,       // Pause
        one: false,     // Gear 1
        two: false,     // Gear 2
        three: false,   // Gear 3
        // Keep track of key states to prevent repeated presses
        lastM: false,
        lastH: false,
        lastP: false
    };
    
    // UI Elements
    const ui = {
        speedValue: document.querySelector('.speed-value'),
        rpmValue: document.querySelector('.rpm-value'),
        gearIndicator: document.querySelector('.gear-indicator'),
        modeIndicator: document.querySelector('.mode-indicator'),
        weatherIndicator: document.querySelector('.weather-indicator'),
        playerIndicator: document.querySelector('.player-indicator'),
        featureNotification: document.getElementById('featureNotification'),
        featureText: document.getElementById('featureText'),
        tractionStatus: document.getElementById('tractionStatus'),
        absStatus: document.getElementById('absStatus'),
        hydroStatus: document.getElementById('hydroStatus'),
        fogStatus: document.getElementById('fogStatus'),
        rainOverlay: document.getElementById('rainOverlay'),
        fogOverlay: document.getElementById('fogOverlay'),
        startMenu: document.getElementById('startMenu'),
        pauseMenu: document.getElementById('pauseMenu'),
        gameControls: document.getElementById('gameControls'),
    };
    
    // Check UI elements
    function checkUIElements() {
        console.log('Checking UI elements...');
        const elements = [
            { name: 'startMenu', elem: ui.startMenu },
            { name: 'startGame button', elem: document.getElementById('startGame') },
            { name: 'pauseMenu', elem: ui.pauseMenu },
            { name: 'gameControls', elem: ui.gameControls },
            { name: 'speedValue', elem: ui.speedValue },
            { name: 'rpmValue', elem: ui.rpmValue },
            { name: 'gearIndicator', elem: ui.gearIndicator },
            { name: 'miniMap', elem: document.getElementById('miniMap') }
        ];
        
        elements.forEach(item => {
            console.log(`${item.name}: ${item.elem ? 'Found' : 'NOT FOUND'}`);
        });
    }
    
    // Generate city layout
    function generateCity() {
        console.log('Generating city...');
        const { width, height, roadWidth } = world;
        
        // Create a grid of city blocks
        const blockSize = 200;
        const numBlocksX = Math.floor(width / blockSize);
        const numBlocksY = Math.floor(height / blockSize);
        
        // Generate city blocks and roads
        for (let y = 0; y < numBlocksY; y++) {
            for (let x = 0; x < numBlocksX; x++) {
                // Block position (center)
                const blockX = x * blockSize - width / 2 + blockSize / 2;
                const blockY = y * blockSize - height / 2 + blockSize / 2;
                
                // Add block to array
                world.cityBlocks.push({
                    x: blockX,
                    y: blockY,
                    width: blockSize - roadWidth,
                    height: blockSize - roadWidth
                });
                
                // Create intersection at each corner
                if (x < numBlocksX - 1 && y < numBlocksY - 1) {
                    const intersectionX = blockX + blockSize / 2 - roadWidth / 2;
                    const intersectionY = blockY + blockSize / 2 - roadWidth / 2;
                    
                    world.intersections.push({
                        x: intersectionX,
                        y: intersectionY,
                        width: roadWidth,
                        height: roadWidth
                    });
                }
                
                // Generate buildings for this block (3-8 buildings per block)
                const numBuildings = 3 + Math.floor(Math.random() * 6);
                const blockActualWidth = blockSize - roadWidth;
                const blockActualHeight = blockSize - roadWidth;
                
                for (let i = 0; i < numBuildings; i++) {
                    // Building size and position within the block
                    const buildingWidth = 20 + Math.random() * 40;
                    const buildingDepth = 20 + Math.random() * 40;
                    const buildingHeight = 30 + Math.random() * 120;
                    
                    // Position within block, with some margin
                    const margin = 5;
                    const posX = blockX - blockActualWidth/2 + margin + Math.random() * (blockActualWidth - 2*margin - buildingWidth);
                    const posY = blockY - blockActualHeight/2 + margin + Math.random() * (blockActualHeight - 2*margin - buildingDepth);
                    
                    // Generate random building style
                    const buildingType = Math.floor(Math.random() * 5); // 0-4 different types
                    const colors = [
                        '#6D9886', '#F2E7D5', '#D9CAB3', '#F6F6F6', // Modern
                        '#8B4513', '#A0522D', '#CD853F', '#DEB887', // Brown brick
                        '#708090', '#778899', '#B0C4DE', '#D3D3D3', // Steel/glass
                        '#800000', '#8B0000', '#B22222', '#CD5C5C', // Red brick
                        '#2F4F4F', '#696969', '#808080', '#A9A9A9'  // Stone/concrete
                    ];
                    
                    // Get color range based on building type (each type has 4 colors)
                    const colorOffset = buildingType * 4;
                    const baseColor = colors[colorOffset + Math.floor(Math.random() * 4)];
                    
                    // Add window tint variation
                    const windowTints = ['#ADD8E6', '#87CEEB', '#FFD700', '#F8F8FF', '#000000'];
                    const windowTint = windowTints[Math.floor(Math.random() * windowTints.length)];
                    
                    // Add building to world
                    world.buildings.push({
                        x: posX,
                        y: posY,
                        width: buildingWidth,
                        depth: buildingDepth,
                        height: buildingHeight,
                        type: buildingType,
                        color: baseColor,
                        windowTint: windowTint,
                        floors: 1 + Math.floor(buildingHeight / 15),
                        hasFire: false, // For emergency scenarios
                        details: {
                            hasAwning: Math.random() > 0.7,
                            hasDoor: true,
                            hasAntenna: Math.random() > 0.8,
                            hasAirCon: Math.random() > 0.5,
                            windowDensity: 0.4 + Math.random() * 0.4
                        }
                    });
                }
                
                // Add trees and vegetation
                const numTrees = Math.floor(Math.random() * 6); // 0-5 trees per block
                for (let i = 0; i < numTrees; i++) {
                    const treeX = blockX - blockActualWidth/2 + Math.random() * blockActualWidth;
                    const treeY = blockY - blockActualHeight/2 + Math.random() * blockActualHeight;
                    
                    // Check if not too close to a building
                    let tooClose = false;
                    for (const building of world.buildings) {
                        const dx = Math.abs(treeX - building.x);
                        const dy = Math.abs(treeY - building.y);
                        if (dx < building.width/2 + 5 && dy < building.depth/2 + 5) {
                            tooClose = true;
                            break;
                        }
                    }
                    
                    if (!tooClose) {
                        const treeType = Math.floor(Math.random() * 3); // 0: Pine, 1: Oak, 2: Palm
                        const treeHeight = 8 + Math.random() * 15;
                        const trunkWidth = 1 + Math.random() * 2;
                        
                        world.trees.push({
                            x: treeX,
                            y: treeY,
                            height: treeHeight,
                            trunkWidth: trunkWidth,
                            type: treeType,
                            // Colors for the different tree types
                            leafColor: treeType === 0 ? '#2E8B57' : 
                                       treeType === 1 ? '#228B22' : '#32CD32',
                            trunkColor: treeType === 0 ? '#8B4513' : 
                                        treeType === 1 ? '#A0522D' : '#CD853F'
                        });
                    }
                }
                
                // Add street props (lamp posts, benches, trash cans, etc.)
                const lampPostSpacing = 80;
                // Add lamps along the roads
                if (x < numBlocksX - 1) { // Horizontal road
                    const roadY = blockY + blockSize/2 - roadWidth/2;
                    for (let i = 0; i < blockSize/lampPostSpacing; i++) {
                        const lampX = blockX - blockSize/2 + i * lampPostSpacing;
                        world.props.push({
                            type: 'lampPost',
                            x: lampX,
                            y: roadY + roadWidth - 3, // Just off the road
                            height: 15,
                            isLit: Math.random() > 0.1 // 10% chance lamp is broken
                        });
                    }
                }
                
                if (y < numBlocksY - 1) { // Vertical road
                    const roadX = blockX + blockSize/2 - roadWidth/2;
                    for (let i = 0; i < blockSize/lampPostSpacing; i++) {
                        const lampY = blockY - blockSize/2 + i * lampPostSpacing;
                        world.props.push({
                            type: 'lampPost',
                            x: roadX + roadWidth - 3, // Just off the road
                            y: lampY,
                            height: 15,
                            isLit: Math.random() > 0.1 // 10% chance lamp is broken
                        });
                    }
                }
                
                // Add other props randomly
                const numProps = Math.floor(Math.random() * 3);
                for (let i = 0; i < numProps; i++) {
                    const propType = ['bench', 'trashCan', 'mailbox', 'fireHydrant'][Math.floor(Math.random() * 4)];
                    const propX = blockX - blockActualWidth/2 + Math.random() * blockActualWidth;
                    const propY = blockY - blockActualHeight/2 + Math.random() * blockActualHeight;
                    
                    world.props.push({
                        type: propType,
                        x: propX,
                        y: propY,
                        rot: Math.random() * Math.PI * 2 // Random orientation
                    });
                }
            }
        }

        
        for (let y = 0; y < numBlocksY; y++) {
            for (let x = 0; x < numBlocksX - 1; x++) {
                const startX = x * blockSize - width/2 + blockSize;
                const endX = (x + 1) * blockSize - width/2;
                const roadY = y * blockSize - height/2 + blockSize/2;
                
                world.roads.push({
                    start: { x: startX, y: roadY },
                    end: { x: endX, y: roadY },
                    width: roadWidth,
                    type: 'horizontal'
                });
            }
        }
        
        // Vertical roads
        for (let x = 0; x < numBlocksX; x++) {
            for (let y = 0; y < numBlocksY - 1; y++) {
                const startY = y * blockSize - height/2 + blockSize;
                const endY = (y + 1) * blockSize - height/2;
                const roadX = x * blockSize - width/2 + blockSize/2;
                
                world.roads.push({
                    start: { x: roadX, y: startY },
                    end: { x: roadX, y: endY },
                    width: roadWidth,
                    type: 'vertical'
                });
            }
        }


        function setupWeatherEffects() {
        // Clear previous effects
        world.raindrops = [];
        world.fogPatches = [];
        world.puddles = [];
        
        // Update UI
        if (ui.rainOverlay) ui.rainOverlay.classList.add('hidden');
        if (ui.fogOverlay) ui.fogOverlay.classList.add('hidden');
        
        // Reset ground friction
        world.groundFriction = 1.0;
        
        switch (settings.weather) {
            case 'rainy':
                // Generate raindrops
                for (let i = 0; i < 500; i++) {
                    world.raindrops.push({
                        x: Math.random() * gameCanvas.width,
                        y: Math.random() * gameCanvas.height,
                        length: 10 + Math.random() * 15,
                        speed: 15 + Math.random() * 10
                    });
                }
                
                // Generate puddles
                for (let i = 0; i < 100; i++) {
                    world.puddles.push({
                        x: Math.random() * world.width - world.width/2,
                        y: Math.random() * world.height - world.height/2,
                        radius: 5 + Math.random() * 15,
                        depth: 0.2 + Math.random() * 0.5 // How deep/reflective
                    });
                }
                
                // Reduce ground friction
                world.groundFriction = 0.7;
                
                // Show rain overlay
                if (ui.rainOverlay) ui.rainOverlay.classList.remove('hidden');
                
                // Update assists
                settings.assists.hydroplaning = true;
                settings.assists.traction = true;
                if (ui.hydroStatus) {
                    ui.hydroStatus.textContent = 'ON';
                    ui.hydroStatus.className = 'on';
                }
                break;
                
            case 'foggy':
                // Generate fog patches
                for (let i = 0; i < 80; i++) {
                    world.fogPatches.push({
                        x: Math.random() * world.width - world.width/2,
                        y: Math.random() * world.height - world.height/2,
                        radius: 50 + Math.random() * 150,
                        density: 0.3 + Math.random() * 0.5
                    });
                }
                
                // Slightly reduce ground friction
                world.groundFriction = 0.9;
                
                // Reduce ambient light
                world.ambientLight = 0.7;
                
                // Show fog overlay
                if (ui.fogOverlay) ui.fogOverlay.classList.remove('hidden');
                
                // Update assists
                settings.assists.fogAssist = true;
                if (ui.fogStatus) {
                    ui.fogStatus.textContent = 'ON';
                    ui.fogStatus.className = 'on';
                }
                break;
                
            default: // sunny
                // Full ground friction
                world.groundFriction = 1.0;
                
                // Full ambient light
                world.ambientLight = 1.0;
                
                // Reset assists
                settings.assists.hydroplaning = false;
                settings.assists.fogAssist = false;
                if (ui.hydroStatus) {
                    ui.hydroStatus.textContent = 'OFF';
                    ui.hydroStatus.className = 'off';
                }
                if (ui.fogStatus) {
                    ui.fogStatus.textContent = 'OFF';
                    ui.fogStatus.className = 'off';
                }
                break;
        }
        
        // Update UI to reflect weather mode
        if (ui.weatherIndicator) {
            ui.weatherIndicator.textContent = settings.weather.toUpperCase();
        }
    }
        // Generate weather effects
        setupWeatherEffects();
        console.log('City generation complete');
        // Draw trees with perspective
        for (const tree of world.trees) {
            // Transform tree position to camera space
            const tx = tree.x - player.x;
            const ty = tree.y - player.y;
            
            // Rotate based on player's angle
            const cosA = Math.cos(-player.angle);
            const sinA = Math.sin(-player.angle);
            const rotX = tx * cosA - ty * sinA;
            const rotY = tx * sinA + ty * cosA;
            
            // Only draw trees that are in front of the player
            if (rotY > 0) {
                // Calculate perspective scaling based on distance
                const distance = rotY;
                const scale = 50 / distance;
                
                // Calculate screen coordinates
                const screenX = rotX * scale;
                const screenY = height / 2 - (camera.height * scale) - 10 / distance;
                
                // Calculate screen dimensions
                const screenHeight = tree.height * scale;
                const trunkWidth = tree.trunkWidth * scale;
                
                // Only draw if at least partially on screen
                if (Math.abs(screenX) < width / 2 + screenWidth) {
                    // Calculate fog factor based on distance
                    let fogFactor = 1;
                    if (settings.weather === 'foggy') {
                        // More fog with distance
                        fogFactor = Math.max(0, 1 - distance / 300);
                        // Also apply local fog density
                        fogFactor *= 1 - calculateFogDensityAtPosition(building.x, building.y) * 0.5;
                    }
                    
                    // Draw trunk
                    ctx.fillStyle = shadeColor(tree.trunkColor, 0, fogFactor);
                    ctx.fillRect(
                        screenX - trunkWidth / 2,
                        screenY - screenHeight,
                        trunkWidth,
                        screenHeight
                    );
                    
                    // Draw tree crown based on type
                    ctx.fillStyle = shadeColor(tree.leafColor, 0, fogFactor);
                    
                    if (tree.type === 0) { // Pine
                        // Draw cone shape
                        const crownWidth = screenHeight * 0.7;
                        ctx.beginPath();
                        ctx.moveTo(screenX, screenY - screenHeight - crownWidth);
                        ctx.lineTo(screenX + crownWidth / 2, screenY - screenHeight);
                        ctx.lineTo(screenX - crownWidth / 2, screenY - screenHeight);
                        ctx.closePath();
                        ctx.fill();
                        
                        // Second layer
                        ctx.beginPath();
                        ctx.moveTo(screenX, screenY - screenHeight * 0.7 - crownWidth);
                        ctx.lineTo(screenX + crownWidth * 0.7, screenY - screenHeight * 0.7);
                        ctx.lineTo(screenX - crownWidth * 0.7, screenY - screenHeight * 0.7);
                        ctx.closePath();
                        ctx.fill();
                    } else if (tree.type === 1) { // Oak
                        // Draw round crown
                        ctx.beginPath();
                        ctx.arc(screenX, screenY - screenHeight - screenHeight * 0.4, screenHeight * 0.5, 0, Math.PI * 2);
                        ctx.fill();
                    } else { // Palm
                        // Draw palm leaves
                        const leafSize = screenHeight * 0.7;
                        ctx.beginPath();
                        ctx.ellipse(screenX, screenY - screenHeight - leafSize * 0.3, leafSize * 0.6, leafSize * 0.3, 0, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Draw individual leaves
                        for (let i = 0; i < 7; i++) {
                            const angle = i * Math.PI / 3.5;
                            ctx.save();
                            ctx.translate(screenX, screenY - screenHeight - leafSize * 0.1);
                            ctx.rotate(angle);
                            
                            // Leaf shape
                            ctx.beginPath();
                            ctx.moveTo(0, 0);
                            ctx.quadraticCurveTo(leafSize * 0.4, -leafSize * 0.2, leafSize, 0);
                            ctx.quadraticCurveTo(leafSize * 0.4, leafSize * 0.2, 0, 0);
                            ctx.fill();
                            
                            ctx.restore();
                        }
                    }
                }
            }
        }
        
        // Draw props (lamp posts, benches, etc.) with perspective
        for (const prop of world.props) {
            // Transform prop position to camera space
            const px = prop.x - player.x;
            const py = prop.y - player.y;
            
            // Rotate based on player's angle
            const cosA = Math.cos(-player.angle);
            const sinA = Math.sin(-player.angle);
            const rotX = px * cosA - py * sinA;
            const rotY = px * sinA + py * cosA;
            
            // Only draw props that are in front of the player
            if (rotY > 0) {
                // Calculate perspective scaling based on distance
                const distance = rotY;
                const scale = 50 / distance;
                
                // Calculate screen coordinates
                const screenX = rotX * scale;
                const screenY = height / 2 - (camera.height * scale) - 10 / distance;
                
                // Only draw if at least partially on screen
                if (Math.abs(screenX) < width / 2 + 50) {
                    // Calculate fog factor based on distance
                    let fogFactor = 1;
                    if (settings.weather === 'foggy') {
                        // More fog with distance
                        fogFactor = Math.max(0, 1 - distance / 300);
                        // Also apply local fog density
                        fogFactor *= 1 - calculateFogDensityAtPosition(prop.x, prop.y) * 0.5;
                    }
                    
                    // Draw based on prop type
                    switch (prop.type) {
                        case 'lampPost':
                            // Draw post
                            ctx.fillStyle = shadeColor('#888888', 0, fogFactor);
                            const lampPostWidth = 2 * scale;
                            const lampPostHeight = prop.height * scale;
                            ctx.fillRect(
                                screenX - lampPostWidth / 2,
                                screenY - postHeight,
                                lampPostWidth,
                                postHeight
                            );
                            
                            // Draw light
                            if (prop.isLit) {
                                // Light fixture
                                ctx.fillStyle = shadeColor('#444444', 0, fogFactor);
                                ctx.fillRect(
                                    screenX - postWidth * 2,
                                    screenY - postHeight,
                                    postWidth * 4,
                                    postWidth * 2
                                );
                                
                                // Light glow
                                const gradient = ctx.createRadialGradient(
                                    screenX, screenY - postHeight, 0,
                                    screenX, screenY - postHeight, postWidth * 8
                                );
                                gradient.addColorStop(0, 'rgba(255, 255, 200, 0.7)');
                                gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
                                ctx.fillStyle = gradient;
                                ctx.beginPath();
                                ctx.arc(screenX, screenY - postHeight, postWidth * 8, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            break;
                            
                        case 'bench':
                            // Draw bench
                            ctx.fillStyle = shadeColor('#8B4513', 0, fogFactor); // Brown
                            const benchWidth = 10 * scale;
                            const benchHeight = 5 * scale;
                            const benchDepth = 4 * scale;
                            
                            // Adjust for rotation
                            ctx.save();
                            ctx.translate(screenX, screenY);
                            ctx.rotate(prop.rot);
                            
                            // Seat
                            ctx.fillRect(-benchWidth / 2, -benchHeight, benchWidth, benchHeight / 2);
                            
                            // Backrest
                            ctx.fillRect(-benchWidth / 2, -benchHeight, benchWidth / 10, -benchHeight);
                            ctx.fillRect(benchWidth / 2 - benchWidth / 10, -benchHeight, benchWidth / 10, -benchHeight);
                            
                            ctx.restore();
                            break;
                            
                        case 'trashCan':
                            // Draw trash can
                            ctx.fillStyle = shadeColor('#2F4F4F', 0, fogFactor); // Dark slate gray
                            const canRadius = 4 * scale;
                            const canHeight = 8 * scale;
                            
                            ctx.beginPath();
                            ctx.arc(screenX, screenY, canRadius, 0, Math.PI * 2);
                            ctx.fill();
                            
                            ctx.beginPath();
                            ctx.arc(screenX, screenY - canHeight, canRadius, 0, Math.PI * 2);
                            ctx.fill();
                            
                            // Connect the circles
                            ctx.beginPath();
                            ctx.moveTo(screenX - canRadius, screenY);
                            ctx.lineTo(screenX - canRadius, screenY - canHeight);
                            ctx.lineTo(screenX + canRadius, screenY - canHeight);
                            ctx.lineTo(screenX + canRadius, screenY);
                            ctx.fill();
                            break;
                            
                        case 'mailbox':
                            // Draw mailbox
                            ctx.fillStyle = shadeColor('#000080', 0, fogFactor); // Navy blue
                            const boxWidth = 5 * scale;
                            const boxHeight = 8 * scale;
                            const postWidth = 2 * scale;
                            const postHeight = 12 * scale;
                            
                            // Post
                            ctx.fillRect(
                                screenX - postWidth / 2,
                                screenY - postHeight,
                                postWidth,
                                postHeight
                            );
                            
                            // Box
                            ctx.fillRect(
                                screenX - boxWidth / 2,
                                screenY - postHeight + boxHeight / 2,
                                boxWidth,
                                boxHeight
                            );
                            break;
                            
                        case 'fireHydrant':
                            // Draw fire hydrant
                            ctx.fillStyle = shadeColor('#FF0000', 0, fogFactor); // Red
                            const hydrantRadius = 3 * scale;
                            const hydrantHeight = 6 * scale;
                            
                            // Main body
                            ctx.beginPath();
                            ctx.rect(
                                screenX - hydrantRadius,
                                screenY - hydrantHeight,
                                hydrantRadius * 2,
                                hydrantHeight
                            );
                            ctx.fill();
                            
                            // Top cap
                            ctx.fillStyle = shadeColor('#A0A0A0', 0, fogFactor); // Silver
                            ctx.beginPath();
                            ctx.arc(screenX, screenY - hydrantHeight, hydrantRadius * 1.2, 0, Math.PI * 2);
                            ctx.fill();
                            
                            // Side connectors
                            ctx.beginPath();
                            ctx.arc(screenX - hydrantRadius, screenY - hydrantHeight * 0.3, hydrantRadius * 0.4, 0, Math.PI * 2);
                            ctx.fill();
                            
                            ctx.beginPath();
                            ctx.arc(screenX + hydrantRadius, screenY - hydrantHeight * 0.3, hydrantRadius * 0.4, 0, Math.PI * 2);
                            ctx.fill();
                            break;
                    }
                }
            }
        }
        
        // Draw weather effects (rain, fog)
        if (settings.weather === 'rainy') {
            // Draw raindrops
            ctx.strokeStyle = 'rgba(200, 200, 255, 0.5)';
            ctx.lineWidth = 1;
            
            for (const drop of world.raindrops) {
                ctx.beginPath();
                ctx.moveTo(drop.x, drop.y);
                ctx.lineTo(drop.x - drop.length * 0.5, drop.y + drop.length);
                ctx.stroke();
            }
            
            // Draw puddles
            for (const puddle of world.puddles) {
                // Only draw puddles in front of the player
                const px = puddle.x - player.x;
                const py = puddle.y - player.y;
                
                // Rotate based on player's angle
                const cosA = Math.cos(-player.angle);
                const sinA = Math.sin(-player.angle);
                const rotX = px * cosA - py * sinA;
                const rotY = px * sinA + py * cosA;
                
                if (rotY > 0) {
                    // Calculate perspective scaling based on distance
                    const distance = rotY;
                    const scale = 50 / distance;
                    
                    // Calculate screen coordinates
                    const screenX = rotX * scale;
                    const screenY = height / 2 - 5 / distance; // Puddles are on the ground
                    
                    // Calculate screen dimensions
                    const screenRadius = puddle.radius * scale;
                    
                    // Draw puddle
                    const gradient = ctx.createRadialGradient(
                        screenX, screenY, 0,
                        screenX, screenY, screenRadius
                    );
                    gradient.addColorStop(0, 'rgba(100, 100, 150, 0.3)');
                    gradient.addColorStop(1, 'rgba(100, 100, 150, 0.1)');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.ellipse(screenX, screenY, screenRadius, screenRadius / 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (settings.weather === 'foggy') {
            // Draw fog patches
            ctx.fillStyle = 'rgba(220, 220, 220, 0.3)';
            
            // Create overall fog effect
            ctx.save();
            const fogAmount = 0.3 + calculateFogDensityAtPosition(player.x, player.y) * 0.4;
            ctx.fillStyle = `rgba(220, 220, 220, ${fogAmount})`;
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.restore();
        }
        
        // Draw skid marks
        for (const skid of player.skidMarks) {
            // Transform skid mark position to camera space
            const sx = skid.x - player.x;
            const sy = skid.y - player.y;
            
            // Rotate based on player's angle
            const cosA = Math.cos(-player.angle);
            const sinA = Math.sin(-player.angle);
            const rotX = sx * cosA - sy * sinA;
            const rotY = sx * sinA + sy * cosA;
            
            // Only draw skid marks that are in front of the player
            if (rotY > 0) {
                // Calculate perspective scaling based on distance
                const distance = rotY;
                const scale = 50 / distance;
                
                // Calculate screen coordinates
                const screenX = rotX * scale;
                const screenY = height / 2 - 1 / distance; // Skid marks are on the ground
                
                // Calculate screen dimensions
                const screenRadius = skid.width * scale;
                
                // Draw skid mark
                const opacity = Math.max(0, 1 - skid.age / 30);
                ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.7})`;
                ctx.beginPath();
                ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw exhaust particles
        for (const particle of player.exhaust) {
            // Transform particle position to camera space
            const px = particle.x - player.x;
            const py = particle.y - player.y;
            
            // Rotate based on player's angle
            const cosA = Math.cos(-player.angle);
            const sinA = Math.sin(-player.angle);
            const rotX = px * cosA - py * sinA;
            const rotY = px * sinA + py * cosA;
            
            // Only draw particles that are in front of the player
            if (rotY > 0) {
                // Calculate perspective scaling based on distance
                const distance = rotY;
                const scale = 50 / distance;
                
                // Calculate screen coordinates
                const screenX = rotX * scale;
                const screenY = height / 2 - (camera.height * 0.7) * scale - 5 / distance;
                
                // Calculate screen dimensions
                const screenRadius = particle.size * scale;
                
                // Draw particle
                ctx.fillStyle = `rgba(200, 200, 200, ${particle.opacity})`;
                ctx.beginPath();
                ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Reset transform
        ctx.restore();
        
        // Draw HUD and UI elements
        if (game.showHUD) {
            // Draw speedometer
            ctx.save();
            ctx.translate(width - 120, height - 120);
            
            // Speedometer background
            ctx.beginPath();
            ctx.arc(0, 0, 80, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fill();
            
            // Speed markers
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            for (let i = 0; i <= 12; i++) {
                const angle = i * Math.PI / 6 - Math.PI / 2;
                const innerRadius = i % 3 === 0 ? 55 : 65;
                
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
                ctx.lineTo(Math.cos(angle) * 75, Math.sin(angle) * 75);
                ctx.stroke();
                
                // Add number labels for major ticks
                if (i % 3 === 0) {
                    const speed = i * 20;
                    const textX = Math.cos(angle) * 40;
                    const textY = Math.sin(angle) * 40;
                    
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = '12px Arial';
                    ctx.fillText(speed.toString(), textX, textY);
                }
            }
            
            // Speed needle
            const speed = Math.abs(Math.min(player.speed, player.maxSpeed));
            const speedAngle = (speed / 240) * Math.PI * 2 - Math.PI / 2;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(speedAngle) * 70, Math.sin(speedAngle) * 70);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Center cap
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#444';
            ctx.fill();
            
            // Digital speed display
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = '24px Arial';
            ctx.fillText(Math.floor(speed).toString(), 0, 30);
            
            ctx.font = '12px Arial';
            ctx.fillText('km/h', 0, 48);
            
            ctx.restore();
            
            // Draw tachometer (RPM gauge)
            ctx.save();
            ctx.translate(width - 280, height - 120);
            
            // Tachometer background
            ctx.beginPath();
            ctx.arc(0, 0, 80, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fill();
            
            // RPM markers
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            for (let i = 0; i <= 10; i++) {
                const angle = i * Math.PI / 5 - Math.PI / 2;
                const innerRadius = i % 2 === 0 ? 55 : 65;
                
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
                ctx.lineTo(Math.cos(angle) * 75, Math.sin(angle) * 75);
                ctx.stroke();
                
                // Add number labels for major ticks
                if (i % 2 === 0) {
                    const rpm = i * 1000;
                    const textX = Math.cos(angle) * 40;
                    const textY = Math.sin(angle) * 40;
                    
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = '12px Arial';
                    ctx.fillText((rpm / 1000).toString(), textX, textY);
                }
            }
            
            // RPM red zone
            ctx.beginPath();
            ctx.arc(0, 0, 75, Math.PI * 0.7, Math.PI * 1.5);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 10;
            ctx.stroke();
            
            // RPM needle
            const rpmAngle = (player.rpm / 8000) * Math.PI * 2 - Math.PI / 2;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(rpmAngle) * 70, Math.sin(rpmAngle) * 70);
            ctx.strokeStyle = player.rpm > 6500 ? 'red' : 'yellow';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Center cap
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#444';
            ctx.fill();
            
            // Digital RPM display
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = '24px Arial';
            ctx.fillText(Math.floor(player.rpm).toString(), 0, 30);
            
            ctx.font = '12px Arial';
            ctx.fillText('RPM', 0, 48);
            
            ctx.restore();
            
            // Draw gear indicator
            ctx.save();
            ctx.translate(width - 200, height - 50);
            
            // Gear box
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(-30, -30, 60, 60);
            
            // Gear text
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '36px Arial Bold';
            ctx.fillText(settings.currentGear, 0, 0);
            
            ctx.restore();
            
            // Draw driving mode indicator
            ctx.save();
            ctx.translate(width - 360, height - 50);
            
            // Mode box
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(-50, -20, 100, 40);
            
            // Mode text
            ctx.fillStyle = settings.drivingMode === 'sport' ? '#FF4500' : 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '18px Arial';
            ctx.fillText(settings.drivingMode.toUpperCase(), 0, 0);
            
            ctx.restore();
            
            // Draw weather indicator
            ctx.save();
            ctx.translate(width - 480, height - 50);
            
            // Weather box
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(-50, -20, 100, 40);
            
            // Weather text
            ctx.fillStyle = settings.weather === 'sunny' ? '#FFD700' : 
                            settings.weather === 'rainy' ? '#00BFFF' : '#A9A9A9';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '18px Arial';
            ctx.fillText(settings.weather.toUpperCase(), 0, 0);
            
            ctx.restore();
            
            // Draw assist indicators
            ctx.save();
            ctx.translate(80, height - 80);
            
            // Assists background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(-70, -70, 140, 140);
            
            // Assist labels and status
            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.font = '14px Arial';
            
            // TCS (Traction Control)
            ctx.fillText('TCS:', -60, -40);
            ctx.fillStyle = settings.assists.traction ? '#00FF00' : '#FF0000';
            ctx.fillText(settings.assists.traction ? 'ON' : 'OFF', 0, -40);
            
            // ABS
            ctx.fillStyle = 'white';
            ctx.fillText('ABS:', -60, -10);
            ctx.fillStyle = settings.assists.abs ? '#00FF00' : '#FF0000';
            ctx.fillText(settings.assists.abs ? 'ON' : 'OFF', 0, -10);
            
            // Hydroplaning Assist
            ctx.fillStyle = 'white';
            ctx.fillText('HYDRO:', -60, 20);
            ctx.fillStyle = settings.assists.hydroplaning ? '#00FF00' : '#FF0000';
            ctx.fillText(settings.assists.hydroplaning ? 'ON' : 'OFF', 0, 20);
            
            // Fog Assist
            ctx.fillStyle = 'white';
            ctx.fillText('FOG:', -60, 50);
            ctx.fillStyle = settings.assists.fogAssist ? '#00FF00' : '#FF0000';
            ctx.fillText(settings.assists.fogAssist ? 'ON' : 'OFF', 0, 50);
            
            ctx.restore();
        }
        
        // Draw mini-map
        if (!game.bigMap) {
            // Draw to the mini-map canvas
            const mapCtx = mapCanvas.getContext('2d');
            const mapSize = mapCanvas.width;
            
            // Clear the mini-map
            mapCtx.fillStyle = '#111';
            mapCtx.fillRect(0, 0, mapSize, mapSize);
            
            // Calculate the scale for the mini-map (how much world space fits on the map)
            const miniMapRange = 300; // How far to show on the mini-map
            const mapScale = mapSize / (miniMapRange * 2);
            
            // Center the map on the player
            mapCtx.save();
            mapCtx.translate(mapSize / 2, mapSize / 2);
            
            // Rotate the map based on player angle (so up is always forward)
            mapCtx.rotate(player.angle);
            
            // Draw roads
            mapCtx.strokeStyle = '#444';
            mapCtx.lineWidth = 2;
            
            for (const road of world.roads) {
                const startX = (road.start.x - player.x) * mapScale;
                const startY = (road.start.y - player.y) * mapScale;
                const endX = (road.end.x - player.x) * mapScale;
                const endY = (road.end.y - player.y) * mapScale;
                
                if (Math.abs(startX) < mapSize / 2 && Math.abs(startY) < mapSize / 2 ||
                    Math.abs(endX) < mapSize / 2 && Math.abs(endY) < mapSize / 2) {
                    mapCtx.beginPath();
                    mapCtx.moveTo(startX, startY);
                    mapCtx.lineTo(endX, endY);
                    mapCtx.stroke();
                }
            }
            
            // Draw buildings
            mapCtx.fillStyle = '#666';
            
            for (const building of world.buildings) {
                const bx = (building.x - player.x) * mapScale;
                const by = (building.y - player.y) * mapScale;
                
                if (Math.abs(bx) < mapSize / 2 && Math.abs(by) < mapSize / 2) {
                    mapCtx.fillRect(
                        bx - (building.width / 2) * mapScale,
                        by - (building.depth / 2) * mapScale,
                        building.width * mapScale,
                        building.depth * mapScale
                    );
                }
            }
            
            // Draw player (as a triangle pointing in the driving direction)
            mapCtx.fillStyle = '#FF0000';
            mapCtx.beginPath();
            mapCtx.moveTo(0, -5);
            mapCtx.lineTo(-3, 3);
            mapCtx.lineTo(3, 3);
            mapCtx.closePath();
            mapCtx.fill();
            
            mapCtx.restore();
        }
    }
    
    // Draw the minimap
    function drawMiniMap() {
        // Implementation...
    }
    
    // Handle keyboard input
    function handleKeyDown(event) {
        switch(event.key) {
            case 'ArrowUp':
            case 'w':
                keys.up = true;
                player.isAccelerating = true;
                break;
            case 'ArrowDown':
            case 's':
                keys.down = true;
                player.isBraking = true;
                break;
            case 'ArrowLeft':
            case 'a':
                keys.left = true;
                player.steering = -player.maxSteeringAngle;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = true;
                player.steering = player.maxSteeringAngle;
                break;
            case 'Shift':
                keys.shift = true;
                player.isTurboActive = true;
                break;
            case ' ':
                keys.space = true;
                player.isHandbraking = true;
                break;
            case 'm':
                keys.m = true;
                break;
            case 'h':
                keys.h = true;
                break;
            case 'p':
                keys.p = true;
                break;
            case '1':
                keys.one = true;
                if (settings.drivingMode === 'manual') {
                    settings.currentGear = '1';
                    updateDrivingMode();
                }
                break;
            case '2':
                keys.two = true;
                if (settings.drivingMode === 'manual') {
                    settings.currentGear = '2';
                    updateDrivingMode();
                }
                break;
            case '3':
                keys.three = true;
                if (settings.drivingMode === 'manual') {
                    settings.currentGear = '3';
                    updateDrivingMode();
                }
                break;
        }
    }
    
    function handleKeyUp(event) {
        switch(event.key) {
            case 'ArrowUp':
            case 'w':
                keys.up = false;
                player.isAccelerating = false;
                break;
            case 'ArrowDown':
            case 's':
                keys.down = false;
                player.isBraking = false;
                break;
            case 'ArrowLeft':
            case 'a':
                keys.left = false;
                if (!keys.right) player.steering = 0;
                else player.steering = player.maxSteeringAngle;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = false;
                if (!keys.left) player.steering = 0;
                else player.steering = -player.maxSteeringAngle;
                break;
            case 'Shift':
                keys.shift = false;
                player.isTurboActive = false;
                break;
            case ' ':
                keys.space = false;
                player.isHandbraking = false;
                break;
            case 'm':
                // Toggle map only on key release
                if (keys.m && !keys.lastM) {
                    game.bigMap = !game.bigMap;
                }
                keys.lastM = keys.m;
                keys.m = false;
                break;
            case 'h':
                // Toggle HUD only on key release
                if (keys.h && !keys.lastH) {
                    game.showHUD = !game.showHUD;
                }
                keys.lastH = keys.h;
                keys.h = false;
                break;
            case 'p':
                // Toggle pause only on key release
                if (keys.p && !keys.lastP) {
                    togglePause();
                }
                keys.lastP = keys.p;
                keys.p = false;
                break;
        }
    }
    
    // Toggle pause state
    function togglePause() {
        game.isPaused = !game.isPaused;
        
        if (game.isPaused) {
            if (ui.pauseMenu) ui.pauseMenu.classList.remove('hidden');
        } else {
            if (ui.pauseMenu) ui.pauseMenu.classList.add('hidden');
        }
    }
    
    // Main game loop
    function gameLoop(timestamp) {
        // Calculate delta time
        if (!game.lastTime) game.lastTime = timestamp;
        game.deltaTime = timestamp - game.lastTime;
        game.lastTime = timestamp;
        
        // Skip updates if game is paused
        if (!game.isPaused && game.isRunning) {
            // Update player physics
            updatePlayerPhysics(game.deltaTime);
            
            // Update weather effects
            updateWeatherEffects();
            
            // Update UI
            if (ui.speedValue) ui.speedValue.textContent = Math.floor(Math.abs(player.speed));
            if (ui.rpmValue) ui.rpmValue.textContent = Math.floor(player.rpm);
            if (ui.gearIndicator) ui.gearIndicator.textContent = settings.currentGear;
        }
        
        // Always render
        renderWorld();
        
        // Request next frame
        requestAnimationFrame(gameLoop);
    }
    
    // Initialize game
    function initGame() {
        // Check UI elements
        checkUIElements();
        
        // Generate city
        generateCity();
        
        // Update driving mode
        updateDrivingMode();
        
        // Set player position
        player.x = 100;
        player.y = 100;
        
        // Set up event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        // Start button event listener
        if (ui.startMenu && document.getElementById('startGame')) {
            document.getElementById('startGame').addEventListener('click', () => {
                ui.startMenu.classList.add('hidden');
                game.isRunning = true;
                gameLoop(0);
            });
        }
        
        // Controls button event listener
        if (document.getElementById('showControls')) {
            document.getElementById('showControls').addEventListener('click', () => {
                game.showControls = !game.showControls;
                if (game.showControls) {
                    ui.gameControls.classList.remove('hidden');
                } else {
                    ui.gameControls.classList.add('hidden');
                }
            });
        }
        
        // Weather selection event listeners
        if (document.getElementById('weatherSunny')) {
            document.getElementById('weatherSunny').addEventListener('click', () => {
                settings.weather = 'sunny';
                setupWeatherEffects();
            });
        }
        
        if (document.getElementById('weatherRainy')) {
            document.getElementById('weatherRainy').addEventListener('click', () => {
                settings.weather = 'rainy';
                setupWeatherEffects();
            });
        }
        
        if (document.getElementById('weatherFoggy')) {
            document.getElementById('weatherFoggy').addEventListener('click', () => {
                settings.weather = 'foggy';
                setupWeatherEffects();
            });
        }
        
        // Driving mode selection event listeners
        if (document.getElementById('modeNormal')) {
            document.getElementById('modeNormal').addEventListener('click', () => {
                settings.drivingMode = 'normal';
                settings.currentGear = 'A';
                updateDrivingMode();
            });
        }
        
        if (document.getElementById('modeSport')) {
            document.getElementById('modeSport').addEventListener('click', () => {
                settings.drivingMode = 'sport';
                settings.currentGear = 'S';
                updateDrivingMode();
            });
        }
        
        if (document.getElementById('modeManual')) {
            document.getElementById('modeManual').addEventListener('click', () => {
                settings.drivingMode = 'manual';
                settings.currentGear = 'N';
                updateDrivingMode();
            });
        }
        
        // Assist toggles
        if (document.getElementById('toggleTraction')) {
            document.getElementById('toggleTraction').addEventListener('click', () => {
                settings.assists.traction = !settings.assists.traction;
                if (ui.tractionStatus) {
                    ui.tractionStatus.textContent = settings.assists.traction ? 'ON' : 'OFF';
                    ui.tractionStatus.className = settings.assists.traction ? 'on' : 'off';
                }
            });
        }
        
        if (document.getElementById('toggleABS')) {
            document.getElementById('toggleABS').addEventListener('click', () => {
                settings.assists.abs = !settings.assists.abs;
                if (ui.absStatus) {
                    ui.absStatus.textContent = settings.assists.abs ? 'ON' : 'OFF';
                    ui.absStatus.className = settings.assists.abs ? 'on' : 'off';
                }
            });
        }
        
        // Show welcome notification
        showFeatureNotification('Welcome to City Driver! Use arrow keys to drive.');
    }
    
    // Initialize the game when DOM is loaded
    initGame();
});
