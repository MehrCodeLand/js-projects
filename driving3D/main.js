// Game initialization and main loop
document.addEventListener('DOMContentLoaded', () => {
    console.log('Game initializing...');
    
    // Canvas setup
    const gameCanvas = document.getElementById('gameCanvas');
    const mapCanvas = document.getElementById('mapCanvas');
    
    if (!gameCanvas || !mapCanvas) {
        console.error('Canvas elements not found!');
        return;
    }
    
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
    }
    
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
        }
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
    
    // Helper function to shade colors
    function shadeColor(color, percent, fogFactor = 1) {
        if (color.startsWith('#')) {
            color = color.slice(1);
        }
        
        let R = parseInt(color.substring(0, 2), 16);
        let G = parseInt(color.substring(2, 4), 16);
        let B = parseInt(color.substring(4, 6), 16);
        
        // Apply shading
        R = Math.floor(R * (1 + percent / 100));
        G = Math.floor(G * (1 + percent / 100));
        B = Math.floor(B * (1 + percent / 100));
        
        // Apply fog (blend with fog color)
        if (fogFactor < 1) {
            const fogR = 220;
            const fogG = 220;
            const fogB = 220;
            
            R = Math.floor(R * fogFactor + fogR * (1 - fogFactor));
            G = Math.floor(G * fogFactor + fogG * (1 - fogFactor));
            B = Math.floor(B * fogFactor + fogB * (1 - fogFactor));
        }
        
        // Ensure RGB values are in valid range
        R = Math.min(255, Math.max(0, R));
        G = Math.min(255, Math.max(0, G));
        B = Math.min(255, Math.max(0, B));
        
        // Convert back to hex
        return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`;
    }
    
    // Calculate fog density at a specific position
    function calculateFogDensityAtPosition(x, y) {
        if (settings.weather !== 'foggy' || world.fogPatches.length === 0) {
            return 0;
        }
        
        // Sum up the influence of each fog patch based on distance
        let totalDensity = 0;
        for (const patch of world.fogPatches) {
            const dx = x - patch.x;
            const dy = y - patch.y;
            const distSq = dx * dx + dy * dy;
            
            // If within the patch radius, add its density contribution
            if (distSq < patch.radius * patch.radius) {
                // Density falls off with distance from center
                const dist = Math.sqrt(distSq);
                const factor = 1 - dist / patch.radius;
                totalDensity += patch.density * factor;
            }
        }
        
        // Cap at 1.0 for max fog density
        return Math.min(1.0, totalDensity);
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

        // Create horizontal roads
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

        // Generate weather effects
        setupWeatherEffects();
        console.log('City generation complete');
    }

    // Setup weather effects
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
    
    // Update player physics
    function updatePlayerPhysics(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds
        
        // Calculate acceleration based on driving mode and inputs
        let currentAcceleration = 0;
        
        if (player.isAccelerating) {
            // Base acceleration modified by driving mode
            let accelModifier = 1.0;
            if (settings.drivingMode === 'sport') {
                accelModifier = 1.5;
            } else if (settings.drivingMode === 'manual') {
                // Manual mode depends on gear
                switch (settings.currentGear) {
                    case '1': accelModifier = 0.8; break;
                    case '2': accelModifier = 1.2; break;
                    case '3': accelModifier = 1.6; break;
                    default: accelModifier = 0.2; break; // Neutral gear
                }
            }
            
            // Turbo boost
            if (player.isTurboActive) {
                accelModifier *= 1.5;
            }
            
            currentAcceleration = player.accelerationRate * accelModifier;
        }
        
        // Apply braking
        if (player.isBraking) {
            // Handbrake provides stronger braking force but can cause skidding
            if (player.isHandbraking) {
                currentAcceleration = -player.brakeForce * 1.5;
                
                // Handbrake can cause skidding at higher speeds
                if (Math.abs(player.speed) > 30) {
                    player.isSkidding = true;
                    
                    // Create skid marks
                    if (Math.random() < 0.3) {
                        player.skidMarks.push({
                            x: player.x - Math.sin(player.angle) * 5,
                            y: player.y + Math.cos(player.angle) * 5,
                            width: 1 + Math.random() * 2,
                            age: 0 // Frames
                        });
                    }
                }
            } else {
                currentAcceleration = -player.brakeForce;
                
                // ABS prevents skidding during normal braking if enabled
                player.isSkidding = !settings.assists.abs;
            }
        }
        
        // Update speed based on acceleration
        player.speed += currentAcceleration * dt * 60;
        
        // Apply friction and drag
        const friction = 0.01 * world.groundFriction;
        const drag = 0.0003 * player.speed * player.speed; // Quadratic drag
        
        // Slow down more if not accelerating
        if (!player.isAccelerating && !player.isBraking) {
            player.speed *= (1 - friction * dt * 10);
        } else {
            player.speed *= (1 - friction * dt);
        }
        
        // Apply drag (air resistance)
        if (player.speed > 0) {
            player.speed = Math.max(0, player.speed - drag * dt * 60);
        } else {
            player.speed = Math.min(0, player.speed + drag * dt * 60);
        }
        
        // Cap speed at maximum
        player.speed = Math.min(player.maxSpeed, Math.max(-player.maxSpeed / 2, player.speed));
        
        // Calculate RPM based on speed and gear
        calculateRPM();
        
        // Apply steering
        if (player.steering !== 0) {
            // Base steering sensitivity
            let steeringSensitivity = player.handling;
            
            // Adjust steering based on speed (less responsive at high speeds)
            steeringSensitivity *= Math.max(0.2, 1 - Math.abs(player.speed) / player.maxSpeed * 0.5);
            
            // Apply steering angle change
            const steeringChange = player.steering * steeringSensitivity * dt * 8;
            player.angle += steeringChange * (player.speed / 30); // Steering effect proportional to speed
            
            // Apply drift if handbraking or skidding
            if (player.isHandbraking || player.isSkidding) {
                player.drift = steeringChange * 0.5;
            } else {
                player.drift *= 0.9; // Reduce drift gradually
            }
        } else {
            player.drift *= 0.9; // Reduce drift gradually
        }
        
        // Apply drift to angle
        player.angle += player.drift * dt * 5;
        
        // Weather effects on physics
        if (settings.weather === 'rainy') {
            // Check for hydroplaning if moving fast enough and on a puddle
            if (Math.abs(player.speed) > 50 && !settings.assists.hydroplaning) {
                // Simplified puddle detection - chance-based for now
                if (Math.random() < 0.01) {
                    player.isHydroplaning = true;
                    
                    // When hydroplaning, random steering effect
                    player.angle += (Math.random() - 0.5) * 0.05;
                    
                    // Show notification
                    showFeatureNotification('Hydroplaning! Reduce Speed');
                    
                    // Hydroplaning ends after short time
                    setTimeout(() => {
                        player.isHydroplaning = false;
                    }, 1500);
                }
            }
        }
        
        // Move player based on speed and angle
        const movementX = Math.sin(player.angle) * player.speed * dt;
        const movementY = -Math.cos(player.angle) * player.speed * dt;
        
        player.x += movementX;
        player.y += movementY;
        
        // Update skid marks age and clean up old ones
        for (let i = player.skidMarks.length - 1; i >= 0; i--) {
            player.skidMarks[i].age++;
            if (player.skidMarks[i].age > 120) { // Remove after 2 seconds (60 fps × 2 sec)
                player.skidMarks.splice(i, 1);
            }
        }
        
        // Create exhaust particles
        if (player.isAccelerating && Math.random() < 0.2) {
            player.exhaust.push({
                x: player.x - Math.sin(player.angle) * 8,
                y: player.y + Math.cos(player.angle) * 8,
                size: 0.5 + Math.random() * 1.5,
                opacity: 0.2 + Math.random() * 0.3,
                age: 0
            });
        }
        
        // Update exhaust particles
        for (let i = player.exhaust.length - 1; i >= 0; i--) {
            player.exhaust[i].age++;
            player.exhaust[i].opacity -= 0.01;
            player.exhaust[i].size += 0.03;
            
            if (player.exhaust[i].opacity <= 0) {
                player.exhaust.splice(i, 1);
            }
        }
    }
    
    // Calculate RPM based on speed and gear
    function calculateRPM() {
        // Base RPM proportional to speed
        let baseRPM = Math.abs(player.speed) * 30;
        
        // Apply gear modifier
        let gearModifier = 1;
        
        switch (settings.drivingMode) {
            case 'sport':
                // Sport mode runs at higher RPM
                gearModifier = 1.3;
                break;
                
            case 'manual':
                // Manual mode depends on currently selected gear
                switch (settings.currentGear) {
                    case 'N': gearModifier = 0.3; break; // Idle in neutral
                    case '1': gearModifier = 2.0; break; // First gear: high RPM at low speed
                    case '2': gearModifier = 1.2; break; // Second gear: moderate
                    case '3': gearModifier = 0.8; break; // Third gear: lower RPM at high speed
                    default: gearModifier = 1;
                }
                break;
                
            case 'normal':
            default:
                // Normal mode has automatic gear shifts
                if (player.speed < 20) {
                    gearModifier = 1.8; // First gear
                } else if (player.speed < 60) {
                    gearModifier = 1.2; // Second gear
                } else {
                    gearModifier = 0.8; // Third gear
                }
                break;
        }
        
        // Calculate final RPM
        const rpm = baseRPM * gearModifier;
        
        // Add some variation for realism
        const variation = (Math.sin(Date.now() / 500) * 50);
        
        // Idle RPM when not moving
        const idleRPM = 600 + variation;
        
        // Set RPM, with minimum idle value
        player.rpm = player.isAccelerating ? 
            Math.max(idleRPM, rpm + 200 + variation) : 
            Math.max(idleRPM, rpm + variation);
    }
    
    // Update weather effects
    function updateWeatherEffects() {
        // Update raindrops
        if (settings.weather === 'rainy') {
            for (let i = 0; i < world.raindrops.length; i++) {
                const drop = world.raindrops[i];
                
                // Move drop down
                drop.y += drop.speed;
                
                // If drop goes off screen, reset it to the top
                if (drop.y > gameCanvas.height) {
                    drop.y = 0;
                    drop.x = Math.random() * gameCanvas.width;
                }
            }
        }
        
        // Update fog patches (subtle movement)
        if (settings.weather === 'foggy') {
            for (let i = 0; i < world.fogPatches.length; i++) {
                const patch = world.fogPatches[i];
                
                // Subtle drift
                patch.x += Math.sin(Date.now() / 5000 + i) * 0.1;
                patch.y += Math.cos(Date.now() / 6000 + i) * 0.1;
            }
        }
    }
    
    // Show feature notification
    function showFeatureNotification(text) {
        if (ui.featureNotification && ui.featureText) {
            ui.featureText.textContent = text;
            ui.featureNotification.classList.remove('hidden');
            
            // Hide after delay
            setTimeout(() => {
                ui.featureNotification.classList.add('hidden');
            }, 3000);
        }
    }
    
    // Update driving mode settings
    function updateDrivingMode() {
        switch (settings.drivingMode) {
            case 'sport':
                // Sport mode: More power, less assist
                player.maxSpeed = 250;
                player.accelerationRate = 0.5;
                player.handling = 1.2;
                settings.currentGear = 'S';
                settings.assists.traction = false;
                break;
                
            case 'manual':
                // Manual mode: Player controls gears
                player.maxSpeed = 220;
                player.accelerationRate = 0.4;
                player.handling = 1.0;
                // Gear is set by player
                break;
                
            case 'normal':
            default:
                // Normal mode: Balanced with all assists
                player.maxSpeed = 180;
                player.accelerationRate = 0.3;
                player.handling = 0.8;
                settings.currentGear = 'D';
                settings.assists.traction = true;
                settings.assists.abs = true;
                break;
        }
        
        // Update UI
        if (ui.modeIndicator) {
            ui.modeIndicator.textContent = settings.drivingMode.toUpperCase();
        }
        
        if (ui.gearIndicator) {
            ui.gearIndicator.textContent = settings.currentGear;
        }
        
        if (ui.tractionStatus) {
            ui.tractionStatus.textContent = settings.assists.traction ? 'ON' : 'OFF';
            ui.tractionStatus.className = settings.assists.traction ? 'on' : 'off';
        }
        
        if (ui.absStatus) {
            ui.absStatus.textContent = settings.assists.abs ? 'ON' : 'OFF';
            ui.absStatus.className = settings.assists.abs ? 'on' : 'off';
        }
    }
    
    // Render world function
    function renderWorld() {
        // Get canvas dimensions
        const width = gameCanvas.width;
        const height = gameCanvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Center and apply camera transformation
        ctx.save();
        ctx.translate(width / 2, height / 2);
        
        // Draw sky gradient
        const skyGradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
        skyGradient.addColorStop(0, world.skyColor);
        skyGradient.addColorStop(1, world.horizonColor);
        
        ctx.fillStyle = skyGradient;
        ctx.fillRect(-width / 2, -height / 2, width, height);
        
        // Draw ground
        ctx.fillStyle = '#333333';
        ctx.fillRect(-width / 2, 0, width, height / 2);
        
        // Draw city blocks and buildings
        for (const building of world.buildings) {
            // Transform building position to camera space
            const bx = building.x - player.x;
            const by = building.y - player.y;
            
            // Rotate based on player's angle
            const cosA = Math.cos(-player.angle);
            const sinA = Math.sin(-player.angle);
            const rotX = bx * cosA - by * sinA;
            const rotY = bx * sinA + by * cosA;
            
            // Only draw buildings that are in front of the player
            if (rotY > 0) {
                // Calculate perspective scaling based on distance
                const distance = rotY;
                const scale = 50 / distance;
                
                // Calculate screen coordinates
                const screenX = rotX * scale;
                const screenY = height / 2 - (camera.height * scale);
                
                // Calculate screen dimensions
                const screenWidth = building.width * scale;
                const screenHeight = building.height * scale;
                const screenDepth = building.depth * scale;
                
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
                    
                    // Front face
                    ctx.fillStyle = shadeColor(building.color, 0, fogFactor);
                    ctx.fillRect(
                        screenX - screenWidth / 2,
                        screenY - screenHeight,
                        screenWidth,
                        screenHeight
                    );
                    
                    // Side face if visible
                    if (rotX > 0) {
                        ctx.fillStyle = shadeColor(building.color, -20, fogFactor); // Darker for side
                    } else {
                        ctx.fillStyle = shadeColor(building.color, -10, fogFactor); // Slightly darker
                    }
                    
                    // Draw building side
                    ctx.beginPath();
                    ctx.moveTo(screenX + screenWidth / 2, screenY - screenHeight);
                    ctx.lineTo(screenX + screenWidth / 2, screenY);
                    ctx.lineTo(screenX + screenWidth / 2 + screenDepth, screenY);
                    ctx.lineTo(screenX + screenWidth / 2 + screenDepth, screenY - screenHeight);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Draw windows
                    if (building.floors > 0) {
                        const floorHeight = screenHeight / building.floors;
                        const windowWidth = screenWidth * 0.15;
                        const windowHeight = floorHeight * 0.7;
                        const windowsPerFloor = Math.floor(screenWidth / (windowWidth * 1.5));
                        
                        ctx.fillStyle = shadeColor(building.windowTint, 0, fogFactor);
                        
                        for (let floor = 0; floor < building.floors; floor++) {
                            const windowY = screenY - screenHeight + floor * floorHeight + (floorHeight - windowHeight) / 2;
                            
                            for (let w = 0; w < windowsPerFloor; w++) {
                                // Skip some windows randomly
                                if (Math.random() < building.details.windowDensity) {
                                    const windowX = screenX - screenWidth / 2 + (w + 0.5) * (screenWidth / windowsPerFloor);
                                    
                                    ctx.fillRect(
                                        windowX - windowWidth / 2,
                                        windowY,
                                        windowWidth,
                                        windowHeight
                                    );
                                }
                            }
                        }
                    }
                    
                    // Draw building details
                    if (building.details.hasAwning && distance < 200) {
                        // Awning
                        ctx.fillStyle = shadeColor('#FF0000', 0, fogFactor); // Red awning
                        ctx.fillRect(
                            screenX - screenWidth / 2,
                            screenY - screenHeight / 10,
                            screenWidth,
                            screenHeight / 20
                        );
                    }
                    
                    if (building.details.hasDoor && distance < 200) {
                        // Door
                        ctx.fillStyle = shadeColor('#8B4513', 0, fogFactor); // Brown door
                        const doorWidth = screenWidth * 0.2;
                        const doorHeight = screenHeight * 0.05;
                        ctx.fillRect(
                            screenX - doorWidth / 2,
                            screenY - doorHeight,
                            doorWidth,
                            doorHeight
                        );
                    }
                    
                    if (building.details.hasAntenna && distance < 250) {
                        // Antenna on roof
                        ctx.strokeStyle = shadeColor('#A0A0A0', 0, fogFactor); // Silver
                        ctx.lineWidth = Math.max(1, scale);
                        ctx.beginPath();
                        ctx.moveTo(screenX, screenY - screenHeight);
                        ctx.lineTo(screenX, screenY - screenHeight - screenHeight * 0.1);
                        ctx.stroke();
                    }
                }
            }
        }
        
        // Draw roads
        for (const road of world.roads) {
            // Transform road start and end to camera space
            const startX = road.start.x - player.x;
            const startY = road.start.y - player.y;
            const endX = road.end.x - player.x;
            const endY = road.end.y - player.y;
            
            // Rotate based on player's angle
            const cosA = Math.cos(-player.angle);
            const sinA = Math.sin(-player.angle);
            const rotStartX = startX * cosA - startY * sinA;
            const rotStartY = startX * sinA + startY * cosA;
            const rotEndX = endX * cosA - endY * sinA;
            const rotEndY = endX * sinA + endY * cosA;
            
            // Only draw roads that are at least partially in front of the player
            if (rotStartY > 0 || rotEndY > 0) {
                // Calculate perspective scaling based on distances
                const startScale = rotStartY > 0 ? 50 / rotStartY : 0;
                const endScale = rotEndY > 0 ? 50 / rotEndY : 0;
                
                // Calculate screen coordinates
                let screenStartX, screenStartY, screenEndX, screenEndY;
                
                // Handle case where start or end is behind camera
                if (rotStartY <= 0) {
                    // Calculate intersection with camera plane
                    const t = -rotStartY / (rotEndY - rotStartY);
                    const interX = rotStartX + t * (rotEndX - rotStartX);
                    
                    screenStartX = interX * endScale;
                    screenStartY = height / 2;
                } else {
                    screenStartX = rotStartX * startScale;
                    screenStartY = height / 2 - 1 / rotStartY; // Slight offset for ground
                }
                
                if (rotEndY <= 0) {
                    // Calculate intersection with camera plane
                    const t = -rotEndY / (rotStartY - rotEndY);
                    const interX = rotEndX + t * (rotStartX - rotEndX);
                    
                    screenEndX = interX * startScale;
                    screenEndY = height / 2;
                } else {
                    screenEndX = rotEndX * endScale;
                    screenEndY = height / 2 - 1 / rotEndY; // Slight offset for ground
                }
                
                // Calculate road width at each end
                const startWidth = road.width * startScale;
                const endWidth = road.width * endScale;
                
                // Draw road
                ctx.strokeStyle = '#555555';
                ctx.lineWidth = Math.max(startWidth, endWidth);
                ctx.beginPath();
                ctx.moveTo(screenStartX, screenStartY);
                ctx.lineTo(screenEndX, screenEndY);
                ctx.stroke();
                
                // Draw center line
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(screenStartX, screenStartY);
                ctx.lineTo(screenEndX, screenEndY);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
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
                console.log('Start button clicked');
                ui.startMenu.classList.add('hidden');
                game.isRunning = true;
                gameLoop(0);
            });
        }
        
        // Controls button event listeners
        if (document.getElementById('controlsBtn')) {
            document.getElementById('controlsBtn').addEventListener('click', () => {
                game.showControls = true;
                ui.gameControls.classList.remove('hidden');
            });
        }
        
        if (document.getElementById('closeControls')) {
            document.getElementById('closeControls').addEventListener('click', () => {
                game.showControls = false;
                ui.gameControls.classList.add('hidden');
            });
        }
        
        // Pause button event listener
        if (document.getElementById('pauseBtn')) {
            document.getElementById('pauseBtn').addEventListener('click', togglePause);
        }
        
        // Resume game button
        if (document.getElementById('resumeGame')) {
            document.getElementById('resumeGame').addEventListener('click', () => {
                togglePause();
            });
        }
        
        // Weather button event listeners
        if (document.getElementById('sunnybtn')) {
            document.getElementById('sunnybtn').addEventListener('click', () => {
                // Remove active class from all weather buttons
                document.querySelectorAll('.weather-btn').forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                document.getElementById('sunnybtn').classList.add('active');
                settings.weather = 'sunny';
                setupWeatherEffects();
            });
        }
        
        if (document.getElementById('rainybtn')) {
            document.getElementById('rainybtn').addEventListener('click', () => {
                // Remove active class from all weather buttons
                document.querySelectorAll('.weather-btn').forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                document.getElementById('rainybtn').classList.add('active');
                settings.weather = 'rainy';
                setupWeatherEffects();
            });
        }
        
        if (document.getElementById('foggybtn')) {
            document.getElementById('foggybtn').addEventListener('click', () => {
                // Remove active class from all weather buttons
                document.querySelectorAll('.weather-btn').forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                document.getElementById('foggybtn').classList.add('active');
                settings.weather = 'foggy';
                setupWeatherEffects();
            });
        }
        
        // Driving mode button event listeners
        if (document.getElementById('normalbtn')) {
            document.getElementById('normalbtn').addEventListener('click', () => {
                // Remove active class from all mode buttons
                document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                document.getElementById('normalbtn').classList.add('active');
                settings.drivingMode = 'normal';
                settings.currentGear = 'D';
                updateDrivingMode();
            });
        }
        
        if (document.getElementById('sportbtn')) {
            document.getElementById('sportbtn').addEventListener('click', () => {
                // Remove active class from all mode buttons
                document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                document.getElementById('sportbtn').classList.add('active');
                settings.drivingMode = 'sport';
                settings.currentGear = 'S';
                updateDrivingMode();
            });
        }
        
        if (document.getElementById('manualbtn')) {
            document.getElementById('manualbtn').addEventListener('click', () => {
                // Remove active class from all mode buttons
                document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                document.getElementById('manualbtn').classList.add('active');
                settings.drivingMode = 'manual';
                settings.currentGear = 'N';
                updateDrivingMode();
            });
        }
        
        // Show welcome notification
        showFeatureNotification('Welcome to City Driver! Use arrow keys to drive.');
    }
    
    // Initialize the game when DOM is loaded
    initGame();
});