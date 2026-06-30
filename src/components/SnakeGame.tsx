import React, { useEffect, useState, useRef } from 'react';
import { Position, Direction, SnakeSkin } from '../types';
import { synthEngine } from '../lib/audio';
import { Shield, RotateCcw, Award, CheckCircle, Smartphone, Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GRID_SIZE = 20;

const SKINS: SnakeSkin[] = [
  {
    id: 'cyber_cyan',
    name: 'Glitch Cyan',
    headClass: 'bg-cyan-400 border border-white shadow-[0_0_12px_#00ffff]',
    bodyClass: 'bg-cyan-500 shadow-[0_0_8px_rgba(0,255,255,0.7)]',
    glowColor: 'cyan-400'
  },
  {
    id: 'poison_pink',
    name: 'Toxic Pink',
    headClass: 'bg-pink-500 border border-white shadow-[0_0_12px_#ff00ff]',
    bodyClass: 'bg-pink-600 shadow-[0_0_8px_rgba(255,0,255,0.7)]',
    glowColor: 'pink-500'
  },
  {
    id: 'gold_rush',
    name: 'Atomic Gold',
    headClass: 'bg-amber-400 border border-white shadow-[0_0_12px_#f59e0b]',
    bodyClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]',
    glowColor: 'amber-400'
  }
];

export default function SnakeGame() {
  // Game state
  const [snake, setSnake] = useState<Position[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 }
  ]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('UP');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  
  // Game Settings
  const [activeSkinIdx, setActiveSkinIdx] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isBeatSynced, setIsBeatSynced] = useState(false);
  const [beatDivision, setBeatDivision] = useState<'8th' | '16th'>('8th');

  // Beat Flash UI effect
  const [beatPulse, setBeatPulse] = useState(false);

  // Ref to prevent self-collision on rapid key taps
  const lastDirectionRef = useRef<Direction>('UP');
  
  const currentSkin = SKINS[activeSkinIdx];

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem('neon_snake_high_score');
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, []);

  // Beat Synchronizer Listener
  useEffect(() => {
    const unsubscribeStep = synthEngine.subscribeToStep((step) => {
      // Flash grid borders on quarter beats
      if (step % 4 === 0) {
        setBeatPulse(true);
        setTimeout(() => setBeatPulse(false), 120);
      }

      // Move snake in Beat-Sync Mode
      if (isBeatSynced && !isPaused && !isGameOver) {
        if (beatDivision === '16th') {
          gameTick();
        } else if (beatDivision === '8th' && step % 2 === 0) {
          gameTick();
        }
      }
    });

    return unsubscribeStep;
  }, [isBeatSynced, beatDivision, isPaused, isGameOver, snake, direction, food]);

  // Standard Game Loop (runs if NOT in Beat-Sync mode)
  useEffect(() => {
    if (isBeatSynced || isPaused || isGameOver) return;

    let delay = 145; // medium
    if (difficulty === 'easy') delay = 195;
    if (difficulty === 'hard') delay = 90;

    const timer = setInterval(() => {
      gameTick();
    }, delay);

    return () => clearInterval(timer);
  }, [isBeatSynced, isPaused, isGameOver, difficulty, snake, direction, food]);

  // Generate random food coordinates safely outside the snake body
  const generateFood = (currentSnake: Position[]): Position => {
    let newFood: Position;
    let isOnSnake = true;
    while (isOnSnake) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    return newFood!;
  };

  // Main Move Trigger
  const gameTick = () => {
    setSnake((prevSnake) => {
      const head = { ...prevSnake[0] };
      const currentDir = direction;
      lastDirectionRef.current = currentDir;

      // Adjust head position depending on direction
      switch (currentDir) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      // 1. Boundary & Self-Collision Detection
      const hasHitWall = head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
      const hasCollidedSelf = prevSnake.some((segment) => segment.x === head.x && segment.y === head.y);

      if (hasHitWall || hasCollidedSelf) {
        synthEngine.playSfx('crash');
        setIsGameOver(true);
        setIsPaused(true);

        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem('neon_snake_high_score', String(score));
          synthEngine.playSfx('highscore');
        }
        return prevSnake;
      }

      // 2. Eating food check
      const newSnake = [head, ...prevSnake];
      if (head.x === food.x && head.y === food.y) {
        synthEngine.playSfx('eat');
        setScore((prev) => prev + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  };

  // Key Bindings Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isGameOver) return;

      const lastDir = lastDirectionRef.current;
      let newDir: Direction | null = null;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (lastDir !== 'DOWN') newDir = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (lastDir !== 'UP') newDir = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (lastDir !== 'RIGHT') newDir = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (lastDir !== 'LEFT') newDir = 'RIGHT';
          break;
      }

      if (newDir) {
        e.preventDefault();
        setDirection(newDir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, isPaused, isGameOver]);

  // Click handler helper for manual d-pad
  const handleDirectionChange = (newDir: Direction) => {
    synthEngine.playSfx('click');
    const lastDir = lastDirectionRef.current;
    if (newDir === 'UP' && lastDir !== 'DOWN') setDirection('UP');
    if (newDir === 'DOWN' && lastDir !== 'UP') setDirection('DOWN');
    if (newDir === 'LEFT' && lastDir !== 'RIGHT') setDirection('LEFT');
    if (newDir === 'RIGHT' && lastDir !== 'LEFT') setDirection('RIGHT');
  };

  // Reset/Start Game
  const resetGame = () => {
    synthEngine.playSfx('click');
    setSnake([
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 }
    ]);
    setFood({ x: 5, y: 5 });
    setDirection('UP');
    lastDirectionRef.current = 'UP';
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
  };

  const togglePause = () => {
    synthEngine.playSfx('click');
    setIsPaused(!isPaused);
  };

  const getCellClassName = (x: number, y: number) => {
    const isHead = snake[0].x === x && snake[0].y === y;
    const isFoodItem = food.x === x && food.y === y;
    const bodyIdx = snake.findIndex((segment, idx) => idx > 0 && segment.x === x && segment.y === y);

    if (isHead) return 'head';
    if (isFoodItem) return 'food';
    if (bodyIdx !== -1) return 'body';
    return 'empty';
  };

  return (
    <div className="flex flex-col gap-6" id="snake-container">
      {/* Cryptic Hardware Status Registers */}
      <div className="grid grid-cols-2 gap-4">
        {/* Score register */}
        <div className="bg-black border-2 border-cyan-400 rounded-none px-4 py-3 flex items-center justify-between shadow-[0_0_8px_rgba(0,255,255,0.15)] font-mono">
          <div className="flex items-center gap-2">
            <div className="p-1 border border-cyan-400 text-cyan-400 font-bold text-xs uppercase">
              REG_A
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 uppercase tracking-tight">SCORE_COUNTER</span>
              <span className="text-2xl font-bold text-white leading-none tracking-widest">{String(score).padStart(4, '0')}</span>
            </div>
          </div>
        </div>

        {/* High score register */}
        <div className="bg-black border-2 border-pink-500 rounded-none px-4 py-3 flex items-center justify-between shadow-[0_0_8px_rgba(255,0,255,0.15)] font-mono">
          <div className="flex items-center gap-2">
            <div className="p-1 border border-pink-500 text-pink-500 font-bold text-xs uppercase">
              REG_H
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 uppercase tracking-tight">SYS_MAX_PEAK</span>
              <span className="text-2xl font-bold text-pink-500 leading-none tracking-widest">{String(highScore).padStart(4, '0')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Center Window (The Grid Stage with CRT overlay and scanlines) */}
      <div className="relative">
        <div 
          className={`relative border-2 rounded-none overflow-hidden aspect-square bg-black transition-all duration-150 crt-screen ${
            beatPulse 
              ? 'border-pink-500 shadow-[0_0_20px_#ff00ff]' 
              : 'border-cyan-400 shadow-[0_0_12px_#00ffff]'
          }`}
        >
          <div className="crt-scanline" />
          
          {/* Subtle Grid backdrop */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#110e1a_1px,transparent_1px),linear-gradient(to_bottom,#110e1a_1px,transparent_1px)] bg-[size:5%] pointer-events-none opacity-60 z-0" />

          {/* Actual 20x20 Game Board */}
          <div className="w-full h-full p-1 relative z-10" style={{ display: 'grid', gridTemplateColumns: 'repeat(20, minmax(0, 1fr))', gridTemplateRows: 'repeat(20, minmax(0, 1fr))' }}>
            {Array.from({ length: GRID_SIZE }).map((_, y) => (
              Array.from({ length: GRID_SIZE }).map((_, x) => {
                const cellType = getCellClassName(x, y);

                return (
                  <div key={`${x}-${y}`} className="p-[1px] aspect-square relative">
                    {/* Head Segment with glowing eyes pointing in travel direction */}
                    {cellType === 'head' && (
                      <div className={`w-full h-full rounded-none relative ${currentSkin.headClass}`}>
                        {/* Eyes */}
                        <div className={`absolute w-full h-full flex items-center justify-between p-0.5 ${
                          direction === 'UP' ? 'align-top' :
                          direction === 'DOWN' ? 'align-bottom' :
                          direction === 'LEFT' ? 'flex-col' : 'flex-col'
                        }`}>
                          <div className="w-1 h-1 bg-black" />
                          <div className="w-1 h-1 bg-black" />
                        </div>
                      </div>
                    )}

                    {/* Snake Body segment */}
                    {cellType === 'body' && (
                      <div className={`w-full h-full rounded-none ${currentSkin.bodyClass}`} />
                    )}

                    {/* Floating Glow Food */}
                    {cellType === 'food' && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div 
                          className="w-3.5 h-3.5 rounded-none animate-pulse"
                          style={{
                            backgroundColor: '#ff00ff',
                            boxShadow: '0 0 10px #ff00ff, 0 0 20px #ff00ff'
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            ))}
          </div>

          {/* Overlays (Start/Pause/GameOver) */}
          <AnimatePresence>
            {isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 font-mono border-4 border-pink-500"
              >
                <div className="px-3 py-1 border-2 border-pink-500 text-pink-500 font-bold uppercase text-xs tracking-widest mb-4">
                  [!] SYSTEM_CRITICAL_HALT [!]
                </div>
                <h3 className="text-3xl font-bold tracking-widest text-white mb-1">GRID_COLLISION</h3>
                <p className="text-xs text-pink-500 uppercase tracking-widest mb-6">SNAKE_STEER_VECTOR_TERMINATED</p>
                
                <div className="bg-zinc-950 border-2 border-zinc-800 px-8 py-3 mb-6 rounded-none">
                  <span className="block text-[10px] text-zinc-500 uppercase">SYS_LOG_ACC_SCORE</span>
                  <span className="text-4xl font-black text-cyan-400 tracking-wider">{score}</span>
                </div>

                <button
                  onClick={resetGame}
                  className="px-6 py-3 border-2 border-pink-500 hover:bg-pink-500 hover:text-black bg-black text-pink-500 font-bold transition-all uppercase tracking-widest text-xs"
                  id="snake-btn-restart"
                >
                  REBOOT_SNAKE_CORE()
                </button>
              </motion.div>
            )}

            {!isGameOver && isPaused && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 font-mono border-4 border-cyan-400"
              >
                <div className="px-3 py-1 border border-cyan-400 text-cyan-400 font-bold text-xs tracking-wider mb-4">
                  SYS_STANDBY_COEF_0.0
                </div>
                <h3 className="text-2xl font-bold text-white tracking-widest mb-4">GRID_INTERACTIVE_V1.4</h3>
                
                <button
                  onClick={score === 0 && snake.length === 3 ? resetGame : togglePause}
                  className="px-8 py-3.5 border-2 border-cyan-400 bg-black text-cyan-400 hover:bg-cyan-400 hover:text-black font-bold transition-all uppercase tracking-widest text-xs"
                  id="snake-btn-play"
                >
                  {score === 0 && snake.length === 3 ? 'INITIALIZE_GRID_BOOT' : 'CONTINUE_SEQUENCE'}
                </button>

                <p className="text-[10px] text-zinc-500 mt-6 max-w-xs uppercase leading-normal">
                  KEYBOARD_MAP: [ARROW_KEYS] / [W,A,S,D] TO ADJUST POSITION REGISTER VALUES.<br />
                  ENSURE AUDIO CLOCK SIGNAL IS ENERGETIC.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Control Settings Deck with Matrix styling */}
      <div className="bg-black border-2 border-zinc-800 p-4 rounded-none flex flex-col gap-4 font-mono">
        <h4 className="text-xs text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2 flex items-center gap-1.5 font-bold">
          <Zap className="w-4 h-4 text-pink-500" /> MATRIX_SYSTEM_PROTOCOL_DUMP
        </h4>

        {/* Sync Mode and Skins selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Synchronizer settings */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 uppercase font-bold tracking-tight">
                CLOCK_SYNC_GATE
              </span>
              <button
                onClick={() => {
                  synthEngine.playSfx('click');
                  setIsBeatSynced(!isBeatSynced);
                }}
                className={`text-[10px] font-bold px-3 py-1 border transition-all ${
                  isBeatSynced 
                    ? 'bg-pink-500/15 border-pink-500 text-pink-500 shadow-[0_0_8px_rgba(255,0,255,0.3)]' 
                    : 'bg-black border-zinc-800 text-zinc-500'
                }`}
                id="snake-sync-toggle"
              >
                {isBeatSynced ? 'SYNCED_OK' : 'FREE_RUN'}
              </button>
            </div>

            {isBeatSynced ? (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => { synthEngine.playSfx('click'); setBeatDivision('8th'); }}
                  className={`text-[10px] py-1.5 border transition-all ${
                    beatDivision === '8th' 
                      ? 'bg-black border-cyan-400 text-cyan-400' 
                      : 'bg-black border-zinc-900 text-zinc-600'
                  }`}
                  id="snake-sync-8th"
                >
                  8th_DIV (MODERATE)
                </button>
                <button
                  onClick={() => { synthEngine.playSfx('click'); setBeatDivision('16th'); }}
                  className={`text-[10px] py-1.5 border transition-all ${
                    beatDivision === '16th' 
                      ? 'bg-black border-pink-500 text-pink-500' 
                      : 'bg-black border-zinc-900 text-zinc-600'
                  }`}
                  id="snake-sync-16th"
                >
                  16th_DIV (EXCESSIVE)
                </button>
              </div>
            ) : (
              /* Regular Speed Difficulties */
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => { synthEngine.playSfx('click'); setDifficulty(diff); }}
                    className={`text-[10px] py-1.5 border uppercase transition-all ${
                      difficulty === diff 
                        ? 'bg-black border-cyan-400 text-cyan-400' 
                        : 'bg-black border-zinc-900 text-zinc-600'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Snake skin customization */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-zinc-300 uppercase font-bold tracking-tight">VISUAL_SKIN_SELECTION</span>
            <div className="grid grid-cols-3 gap-1.5">
              {SKINS.map((skin, idx) => (
                <button
                  key={skin.id}
                  onClick={() => { synthEngine.playSfx('click'); setActiveSkinIdx(idx); }}
                  className={`relative p-1.5 border flex flex-col items-center gap-1 transition-all ${
                    activeSkinIdx === idx 
                      ? `bg-black border-${skin.glowColor} text-${skin.glowColor}` 
                      : 'bg-black border-zinc-900 text-zinc-600'
                  }`}
                  title={skin.name}
                >
                  <div className={`w-3 h-3 rounded-none ${skin.bodyClass}`} />
                  <span className="text-[10px] uppercase tracking-tighter truncate w-full text-center">{skin.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* On-screen D-Pad Controls for tablets/mobile frame integration styled as electronic pads */}
      <div className="flex flex-col items-center select-none" id="mobile-dpad">
        <div className="grid grid-cols-3 gap-2 w-32 h-32 lg:hidden">
          <div></div>
          <button
            onClick={() => handleDirectionChange('UP')}
            className="w-10 h-10 border-2 border-cyan-400 bg-black text-cyan-400 flex items-center justify-center font-mono font-bold"
            id="dpad-up"
          >
            ▲
          </button>
          <div></div>

          <button
            onClick={() => handleDirectionChange('LEFT')}
            className="w-10 h-10 border-2 border-cyan-400 bg-black text-cyan-400 flex items-center justify-center font-mono font-bold"
            id="dpad-left"
          >
            ◀
          </button>
          <div className="w-10 h-10 border border-zinc-800 flex items-center justify-center">
            <div className="w-2 h-2 bg-pink-500" />
          </div>
          <button
            onClick={() => handleDirectionChange('RIGHT')}
            className="w-10 h-10 border-2 border-cyan-400 bg-black text-cyan-400 flex items-center justify-center font-mono font-bold"
            id="dpad-right"
          >
            ▶
          </button>

          <div></div>
          <button
            onClick={() => handleDirectionChange('DOWN')}
            className="w-10 h-10 border-2 border-cyan-400 bg-black text-cyan-400 flex items-center justify-center font-mono font-bold"
            id="dpad-down"
          >
            ▼
          </button>
          <div></div>
        </div>
      </div>

    </div>
  );
}
