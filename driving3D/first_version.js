import React, { useEffect, useState, useRef } from 'react';
import { Box, RotateCcw, Cloud, Droplets, Sun } from 'lucide-react';

const CityDrivingGame = () => {
  const canvasRef = useRef(null);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [weatherMode, setWeatherMode] = useState('sunny'); // sunny, rainy, foggy
  const [driveMode, setDriveMode] = useState('normal'); // normal, sport, manual
  const [speed, setSpeed] = useState(0);
  const [turboActive, setTurboActive] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Game state
  const gameState = useRef({
    car: {
      x: 0,
      y: 0,
      angle: 0,
      speed: 0,
      maxSpeed: 10,
      acceleration: 0.1,
      deceleration: 0.05,
      handling: 0.03,
      drift: 0,
      braking: false,
      turbo: false
    },
    keys: {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false,
      shift: false
    },
    road: {
      width: 800,
      height: 600,
      curves: []
    },
    buildings: [],
    weather: {
      particles: [],
      visibility: 1.0
    },
    camera: {
      depth: 0.5
    }
  });

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Generate road and buildings
    generateCity(width, height);
    
    // Setup weather particles
    setupWeather(weatherMode);
    
    let animationId;
    const gameLoop = () => {
      if (!isGameRunning) return;
      
      // Update car physics
      updateCarPhysics();
      
      // Update weather effects
      updateWeather();
      
      // Render game
      render(ctx, width, height);
      
      // Update UI
      setSpeed(Math.floor(gameState.current.car.speed * 10));
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    if (isGameRunning) {
      animationId = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isGameRunning, weatherMode, driveMode]);
  
  // Set up event listeners for user input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isGameRunning) return;
      
      switch (e.key) {
        case 'ArrowUp':
          gameState.current.keys.up = true;
          break;
        case 'ArrowDown':
          gameState.current.keys.down = true;
          break;
        case 'ArrowLeft':
          gameState.current.keys.left = true;
          break;
        case 'ArrowRight':
          gameState.current.keys.right = true;
          break;
        case ' ':
          gameState.current.keys.space = true; // Brake
          gameState.current.car.braking = true;
          break;
        case 'Shift':
          gameState.current.keys.shift = true; // Turbo
          if (driveMode === 'sport') {
            gameState.current.car.turbo = true;
            setTurboActive(true);
          }
          break;
        default:
          break;
      }
    };
    
    const handleKeyUp = (e) => {
      if (!isGameRunning) return;
      
      switch (e.key) {
        case 'ArrowUp':
          gameState.current.keys.up = false;
          break;
        case 'ArrowDown':
          gameState.current.keys.down = false;
          break;
        case 'ArrowLeft':
          gameState.current.keys.left = false;
          break;
        case 'ArrowRight':
          gameState.current.keys.right = false;
          break;
        case ' ':
          gameState.current.keys.space = false;
          gameState.current.car.braking = false;
          break;
        case 'Shift':
          gameState.current.keys.shift = false;
          gameState.current.car.turbo = false;
          setTurboActive(false);
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isGameRunning, driveMode]);
  
  // Helper functions
  const generateCity = (width, height) => {
    // Generate random buildings
    const buildings = [];
    for (let i = 0; i < 100; i++) {
      buildings.push({
        x: Math.random() * width * 2 - width,
        y: Math.random() * height * 2 - height,
        width: 50 + Math.random() * 100,
        height: 50 + Math.random() * 100,
        color: `rgb(${100 + Math.random() * 100}, ${100 + Math.random() * 100}, ${100 + Math.random() * 100})`
      });
    }
    
    // Generate road curves
    const curves = [];
    for (let i = 0; i < 20; i++) {
      curves.push({
        x: Math.random() * width * 2 - width,
        y: Math.random() * height * 2 - height,
        radius: 100 + Math.random() * 200,
        angle: Math.random() * Math.PI * 2
      });
    }
    
    gameState.current.buildings = buildings;
    gameState.current.road.curves = curves;
  };
  
  const setupWeather = (mode) => {
    const particles = [];
    
    switch (mode) {
      case 'rainy':
        // Create raindrops
        for (let i = 0; i < 300; i++) {
          particles.push({
            x: Math.random() * 800,
            y: Math.random() * 600,
            speed: 5 + Math.random() * 10,
            size: 2 + Math.random() * 3
          });
        }
        gameState.current.car.handling = 0.02; // Reduced handling in rain
        gameState.current.weather.visibility = 0.8;
        break;
      case 'foggy':
        // Create fog particles
        for (let i = 0; i < 200; i++) {
          particles.push({
            x: Math.random() * 800,
            y: Math.random() * 600,
            speed: 0.5 + Math.random() * 1,
            size: 20 + Math.random() * 30,
            opacity: 0.1 + Math.random() * 0.2
          });
        }
        gameState.current.car.handling = 0.015; // Very reduced handling in fog
        gameState.current.weather.visibility = 0.3;
        break;
      default: // sunny
        gameState.current.car.handling = 0.03; // Best handling in sunny weather
        gameState.current.weather.visibility = 1.0;
        break;
    }
    
    gameState.current.weather.particles = particles;
  };
  
  const updateCarPhysics = () => {
    const { car, keys } = gameState.current;
    
    // Apply driving mode effects
    switch (driveMode) {
      case 'sport':
        car.handling = weatherMode === 'sunny' ? 0.04 : (weatherMode === 'rainy' ? 0.025 : 0.02);
        car.maxSpeed = 15;
        car.acceleration = 0.15;
        break;
      case 'manual':
        car.handling = weatherMode === 'sunny' ? 0.035 : (weatherMode === 'rainy' ? 0.022 : 0.018);
        car.maxSpeed = 12;
        car.acceleration = 0.12;
        break;
      default: // normal
        car.handling = weatherMode === 'sunny' ? 0.03 : (weatherMode === 'rainy' ? 0.02 : 0.015);
        car.maxSpeed = 10;
        car.acceleration = 0.1;
        break;
    }
    
    // Apply turbo boost
    if (car.turbo) {
      car.acceleration *= 1.5;
      car.maxSpeed *= 1.2;
    }
    
    // Apply acceleration/deceleration
    if (keys.up) {
      car.speed = Math.min(car.speed + car.acceleration, car.maxSpeed);
    } else if (keys.down) {
      car.speed = Math.max(car.speed - car.acceleration * 1.5, -car.maxSpeed / 2);
    } else {
      // Natural deceleration
      if (car.speed > 0) {
        car.speed = Math.max(0, car.speed - car.deceleration);
      } else if (car.speed < 0) {
        car.speed = Math.min(0, car.speed + car.deceleration);
      }
    }
    
    // Apply braking
    if (car.braking) {
      car.speed *= 0.95;
    }
    
    // Apply steering
    let turnFactor = car.handling * (car.speed / car.maxSpeed) * 2;
    
    // Adjust turn factor based on weather
    if (weatherMode === 'rainy') {
      // Add some randomness to simulate hydroplaning
      if (Math.random() < 0.05 && car.speed > car.maxSpeed * 0.7) {
        turnFactor *= 0.5 + Math.random() * 0.5;
      }
    } else if (weatherMode === 'foggy') {
      // More precise steering in fog mode due to assist systems
      turnFactor *= 0.9;
    }
    
    if (keys.left) {
      car.angle -= turnFactor;
      car.drift = weatherMode === 'rainy' ? -0.02 : -0.01;
    } else if (keys.right) {
      car.angle += turnFactor;
      car.drift = weatherMode === 'rainy' ? 0.02 : 0.01;
    } else {
      car.drift *= 0.9; // Drift recovery
    }
    
    // Apply drift effect
    car.angle += car.drift;
    
    // Move car based on current speed and angle
    car.x += Math.sin(car.angle) * car.speed;
    car.y -= Math.cos(car.angle) * car.speed;
    
    // Simple collision with boundaries (stop car if hit boundary)
    const boundary = 2000;
    if (Math.abs(car.x) > boundary || Math.abs(car.y) > boundary) {
      car.speed *= 0.9;
    }
  };
  
  const updateWeather = () => {
    const { weather } = gameState.current;
    const { particles } = weather;
    
    if (weatherMode === 'rainy') {
      // Update raindrops
      for (let i = 0; i < particles.length; i++) {
        particles[i].y += particles[i].speed;
        particles[i].x += (gameState.current.car.speed * 0.1);
        
        // Reset particles that go off screen
        if (particles[i].y > 600) {
          particles[i].y = 0;
          particles[i].x = Math.random() * 800;
        }
        if (particles[i].x > 800) particles[i].x = 0;
        if (particles[i].x < 0) particles[i].x = 800;
      }
    } else if (weatherMode === 'foggy') {
      // Update fog particles
      for (let i = 0; i < particles.length; i++) {
        particles[i].x += particles[i].speed * (Math.random() - 0.5);
        particles[i].y += particles[i].speed * (Math.random() - 0.5);
        
        // Wrap particles around screen
        if (particles[i].y > 600) particles[i].y = 0;
        if (particles[i].y < 0) particles[i].y = 600;
        if (particles[i].x > 800) particles[i].x = 0;
        if (particles[i].x < 0) particles[i].x = 800;
      }
    }
  };
  
  const render = (ctx, width, height) => {
    const { car, buildings, weather, road } = gameState.current;
    
    // Clear canvas
    ctx.fillStyle = weatherMode === 'foggy' ? 'rgba(200, 200, 200, 0.8)' : 'rgb(100, 100, 100)';
    ctx.fillRect(0, 0, width, height);
    
    // Set camera transform
    ctx.save();
    ctx.translate(width / 2, height / 2);
    
    // Draw road
    ctx.fillStyle = weatherMode === 'rainy' ? '#303030' : '#404040'; // Darker when wet
    ctx.fillRect(-width / 2, -height / 2, width, height);
    
    // Draw road markings
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 5;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(0, -height / 2);
    ctx.lineTo(0, height / 2);
    ctx.stroke();
    
    // Reset line dash
    ctx.setLineDash([]);
    
    // Draw buildings with perspective
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const dx = b.x - car.x;
      const dy = b.y - car.y;
      
      // Rotate position based on car angle
      const rotX = dx * Math.cos(-car.angle) - dy * Math.sin(-car.angle);
      const rotY = dx * Math.sin(-car.angle) + dy * Math.cos(-car.angle);
      
      // Apply perspective
      const distance = Math.max(1, Math.abs(rotY));
      const perspectiveScale = 1 / (distance * 0.01);
      
      // Only draw buildings in front of the car and within view
      if (rotY > 0 && Math.abs(rotX) < width * 2) {
        const screenX = rotX * perspectiveScale;
        const screenY = (height / 2) - (rotY * perspectiveScale * 0.5);
        const screenW = b.width * perspectiveScale;
        const screenH = b.height * perspectiveScale;
        
        ctx.fillStyle = b.color;
        ctx.globalAlpha = Math.min(1, weather.visibility / (distance * 0.01));
        ctx.fillRect(
          screenX - screenW / 2,
          screenY - screenH,
          screenW,
          screenH
        );
        
        // Draw windows
        ctx.fillStyle = 'rgba(255, 255, 200, 0.5)';
        const windowSize = screenW * 0.1;
        const windowGap = screenW * 0.05;
        const windowRows = Math.floor(screenH / (windowSize + windowGap));
        const windowCols = Math.floor(screenW / (windowSize + windowGap));
        
        for (let row = 0; row < windowRows; row++) {
          for (let col = 0; col < windowCols; col++) {
            // Randomly omit some windows
            if (Math.random() > 0.3) {
              ctx.fillRect(
                screenX - screenW / 2 + col * (windowSize + windowGap) + windowGap,
                screenY - screenH + row * (windowSize + windowGap) + windowGap,
                windowSize,
                windowSize
              );
            }
          }
        }
      }
    }
    
    // Draw weather effects
    if (weatherMode === 'rainy') {
      ctx.fillStyle = 'rgba(120, 160, 255, 0.6)';
      for (const p of weather.particles) {
        ctx.fillRect(p.x - width / 2, p.y - height / 2, 1, p.size);
      }
      
      // Draw puddles
      ctx.fillStyle = 'rgba(50, 50, 80, 0.2)';
      for (let i = 0; i < 20; i++) {
        const puddleX = ((i * 200) % width) - width / 2;
        const puddleY = ((i * 150) % height) - height / 2;
        const puddleSize = 20 + Math.random() * 30;
        
        ctx.beginPath();
        ctx.ellipse(puddleX, puddleY, puddleSize, puddleSize * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (weatherMode === 'foggy') {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.1)';
      for (const p of weather.particles) {
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x - width / 2, p.y - height / 2, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Overlay fog effect
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(220, 220, 220, 0.3)';
      ctx.fillRect(-width / 2, -height / 2, width, height);
    }
    
    // Reset alpha
    ctx.globalAlpha = 1;
    
    // Draw car
    ctx.fillStyle = '#FF0000'; // Bright red sports car
    ctx.fillRect(-20, -40, 40, 80);
    
    // Draw car details
    ctx.fillStyle = '#000000';
    ctx.fillRect(-15, -35, 30, 10); // Windshield
    
    // Draw headlights (brighter in fog mode)
    ctx.fillStyle = weatherMode === 'foggy' ? '#FFFFAA' : '#FFFF00';
    ctx.fillRect(-12, 30, 8, 8);
    ctx.fillRect(4, 30, 8, 8);
    
    // Draw brake lights (red when braking)
    ctx.fillStyle = car.braking ? '#FF0000' : '#660000';
    ctx.fillRect(-12, -35, 8, 5);
    ctx.fillRect(4, -35, 8, 5);
    
    // Draw turbo effect if active
    if (car.turbo) {
      ctx.fillStyle = '#FFAA00';
      ctx.beginPath();
      ctx.moveTo(-15, -40);
      ctx.lineTo(15, -40);
      ctx.lineTo(0, -60);
      ctx.fill();
    }
    
    ctx.restore();
    
    // Draw UI overlay
    drawUI(ctx, width, height);
  };
  
  const drawUI = (ctx, width, height) => {
    const { car } = gameState.current;
    
    // Draw speedometer
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(width - 150, height - 100, 140, 90);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText(`${Math.abs(Math.floor(car.speed * 10))} km/h`, width - 140, height - 60);
    
    // Draw mode indicators
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '16px Arial';
    ctx.fillText(`Weather: ${weatherMode}`, width - 140, height - 40);
    ctx.fillText(`Mode: ${driveMode}`, width - 140, height - 20);
    
    // Draw special feature indicator based on weather
    ctx.fillStyle = '#FFFF00';
    let feature = '';
    switch (weatherMode) {
      case 'rainy':
        feature = 'Hydroplaning Detection Active';
        break;
      case 'foggy':
        feature = 'Route Assist Active';
        break;
      default:
        if (driveMode === 'sport') {
          feature = 'Sport Handling Active';
        }
    }
    
    if (feature) {
      ctx.fillText(feature, 10, height - 20);
    }
    
    // Draw turbo indicator
    if (car.turbo) {
      ctx.fillStyle = '#FF5500';
      ctx.font = '20px Arial';
      ctx.fillText('TURBO', width - 240, height - 60);
    }
  };
  
  const toggleGame = () => {
    setIsGameRunning(!isGameRunning);
  };
  
  const changeWeather = (mode) => {
    setWeatherMode(mode);
    setupWeather(mode);
  };
  
  const changeDriveMode = (mode) => {
    setDriveMode(mode);
  };
  
  const toggleControls = () => {
    setShowControls(!showControls);
  };

  return (
    <div className="flex flex-col items-center w-full h-full bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">3D City Driving Simulator</h1>
      
      {!isGameRunning && (
        <div className="absolute z-10 inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-800 p-6 rounded-lg text-center">
            <h2 className="text-xl mb-4">City Driving Experience</h2>
            <p className="mb-6">Pilot a bright red sports car through winding city streets in various weather conditions</p>
            <button 
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg mb-4"
              onClick={toggleGame}
            >
              Start Driving
            </button>
          </div>
        </div>
      )}
      
      <div className="relative w-full max-w-4xl">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600} 
          className="border-2 border-gray-700 bg-gray-800 rounded-lg"
        />
        
        <div className="absolute top-4 right-4 flex gap-2">
          <button 
            className="bg-gray-700 p-2 rounded hover:bg-gray-600" 
            onClick={toggleControls}
            title="Toggle Controls"
          >
            <Box size={18} />
          </button>
          
          <button 
            className="bg-gray-700 p-2 rounded hover:bg-gray-600" 
            onClick={toggleGame}
            title={isGameRunning ? "Pause" : "Resume"}
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
      
      {showControls && (
        <div className="w-full max-w-4xl mt-4 p-4 bg-gray-800 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <h3 className="font-bold mb-2">Weather Conditions</h3>
              <div className="flex gap-2">
                <button 
                  className={`flex items-center gap-1 p-2 rounded ${weatherMode === 'sunny' ? 'bg-yellow-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                  onClick={() => changeWeather('sunny')}
                >
                  <Sun size={16} />
                  Sunny
                </button>
                <button 
                  className={`flex items-center gap-1 p-2 rounded ${weatherMode === 'rainy' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                  onClick={() => changeWeather('rainy')}
                >
                  <Droplets size={16} />
                  Rainy
                </button>
                <button 
                  className={`flex items-center gap-1 p-2 rounded ${weatherMode === 'foggy' ? 'bg-gray-400 text-gray-900' : 'bg-gray-600 hover:bg-gray-500'}`}
                  onClick={() => changeWeather('foggy')}
                >
                  <Cloud size={16} />
                  Foggy
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-gray-700 rounded-lg">
              <h3 className="font-bold mb-2">Driving Mode</h3>
              <div className="flex gap-2">
                <button 
                  className={`p-2 rounded ${driveMode === 'normal' ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                  onClick={() => changeDriveMode('normal')}
                >
                  Normal
                </button>
                <button 
                  className={`p-2 rounded ${driveMode === 'sport' ? 'bg-red-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                  onClick={() => changeDriveMode('sport')}
                >
                  Sport
                </button>
                <button 
                  className={`p-2 rounded ${driveMode === 'manual' ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                  onClick={() => changeDriveMode('manual')}
                >
                  Manual
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-gray-700 rounded-lg">
              <h3 className="font-bold mb-2">Controls</h3>
              <ul className="text-sm">
                <li>Arrow Keys: Steering and Acceleration</li>
                <li>Space: Brake</li>
                <li>Shift: Turbo Boost (in Sport Mode)</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-700 rounded-lg">
            <h3 className="font-bold mb-2">Current Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-gray-400">Speed:</span> 
                <span className="ml-2 font-bold">{speed} km/h</span>
              </div>
              <div>
                <span className="text-gray-400">Weather:</span> 
                <span className="ml-2 font-bold capitalize">{weatherMode}</span>
              </div>
              <div>
                <span className="text-gray-400">Mode:</span> 
                <span className="ml-2 font-bold capitalize">{driveMode}</span>
              </div>
              <div>
                <span className="text-gray-400">Turbo:</span> 
                <span className={`ml-2 font-bold ${turboActive ? 'text-red-500' : 'text-gray-500'}`}>
                  {turboActive ? 'ACTIVE' : 'Off'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityDrivingGame;