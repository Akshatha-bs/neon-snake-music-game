import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Trophy, 
  Gamepad2,
  RefreshCw,
  Activity,
  Music
} from 'lucide-react';

// --- Types ---
type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Track {
  id: number;
  title: string;
  artist: string;
  url: string;
}

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;

const TRACKS: Track[] = [
  {
    id: 1,
    title: "NEON_NIGHT.EXE",
    artist: "SYNTH_CORE",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: 2,
    title: "CYBER_PULSE.SYS",
    artist: "BEAT_BOT",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: 3,
    title: "SYNTH_WAVE.ISO",
    artist: "DREAM_OS",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  }
];

// --- Sound Effects Utility ---
const playTone = (freq: number, type: OscillatorType = 'sine', duration: number = 0.1, volume: number = 0.1) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio context failed to initialize:', e);
  }
};

export default function App() {
  // --- Music Player State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Snake Game State ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const directionRef = useRef<Direction>('RIGHT');
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const lastUpdateRef = useRef<number>(0);

  // --- Music Player Logic ---
  const currentTrack = TRACKS[currentTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  // --- Snake Game Logic (Canvas) ---
  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      const isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    const initialSnake = [{ x: 10, y: 10 }];
    const initialFood = { x: 5, y: 5 };
    setSnake(initialSnake);
    snakeRef.current = initialSnake;
    setFood(initialFood);
    foodRef.current = initialFood;
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setIsGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameStarted(true);
    lastUpdateRef.current = performance.now();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Background with slight transparency for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Random glitch lines
    if (Math.random() > 0.95) {
      ctx.strokeStyle = Math.random() > 0.5 ? '#00ffff' : '#ff00ff';
      ctx.lineWidth = 1;
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Food (Glitchy)
    const foodX = foodRef.current.x * cellSize;
    const foodY = foodRef.current.y * cellSize;
    const glitchOffset = Math.random() > 0.9 ? (Math.random() - 0.5) * 4 : 0;

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff00ff';
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(
      foodX + 2 + glitchOffset,
      foodY + 2,
      cellSize - 4,
      cellSize - 4
    );

    // Draw Snake
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    
    snakeRef.current.forEach((segment, i) => {
      const x = segment.x * cellSize;
      const y = segment.y * cellSize;
      const sGlitch = Math.random() > 0.99 ? (Math.random() - 0.5) * 2 : 0;

      ctx.fillStyle = i === 0 ? '#00ffff' : `rgba(0, 255, 255, ${1 - i / snakeRef.current.length * 0.7})`;
      ctx.fillRect(
        x + 1 + sGlitch,
        y + 1,
        cellSize - 2,
        cellSize - 2
      );

      // Head detail
      if (i === 0) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + cellSize/3, y + cellSize/3, cellSize/4, cellSize/4);
      }
    });

    ctx.shadowBlur = 0;
  }, []);

  const update = useCallback((time: number) => {
    if (isGameOver || !gameStarted) return;

    if (time - lastUpdateRef.current > speed) {
      const head = snakeRef.current[0];
      const newHead = { ...head };

      switch (directionRef.current) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      if (
        newHead.x < 0 || newHead.x >= GRID_SIZE ||
        newHead.y < 0 || newHead.y >= GRID_SIZE ||
        snakeRef.current.some(segment => segment.x === newHead.x && segment.y === newHead.y)
      ) {
        setIsGameOver(true);
        setGameStarted(false);
        playTone(150, 'sawtooth', 0.5, 0.2);
        return;
      }

      const newSnake = [newHead, ...snakeRef.current];

      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        setScore(s => {
          const newScore = s + 10;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
        const nextFood = generateFood(newSnake);
        setFood(nextFood);
        foodRef.current = nextFood;
        setSpeed(s => Math.max(60, s - SPEED_INCREMENT));
        playTone(880, 'sine', 0.1, 0.1);
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;
      setSnake([...newSnake]);
      lastUpdateRef.current = time;
    }
  }, [isGameOver, gameStarted, speed, highScore, generateFood]);

  useEffect(() => {
    let frameId: number;
    const loop = (time: number) => {
      update(time);
      draw();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [update, draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (directionRef.current !== 'DOWN') directionRef.current = 'UP'; break;
        case 'ArrowDown': if (directionRef.current !== 'UP') directionRef.current = 'DOWN'; break;
        case 'ArrowLeft': if (directionRef.current !== 'RIGHT') directionRef.current = 'LEFT'; break;
        case 'ArrowRight': if (directionRef.current !== 'LEFT') directionRef.current = 'RIGHT'; break;
      }
      setDirection(directionRef.current);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-pixel overflow-hidden">
      {/* Noise Overlay */}
      <div className="noise-overlay" />
      
      {/* CRT Screen Wrapper */}
      <div className="crt-screen w-full max-w-5xl arcade-frame bg-zinc-950 p-6 md:p-10 flex flex-col items-center gap-8 relative overflow-hidden">
        
        {/* Background Audio */}
        <audio 
          ref={audioRef}
          src={currentTrack.url}
          onTimeUpdate={handleTimeUpdate}
          onEnded={nextTrack}
        />

        {/* Header Section */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 border-b-4 border-neon-cyan pb-8">
          <div className="text-center md:text-left space-y-2">
            <h1 className="text-4xl md:text-6xl font-glitch glitch-layer text-neon-cyan" data-text="NEON_SNAKE_V2">
              NEON_SNAKE_V2
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-4">
              <span className="text-[10px] text-neon-magenta animate-pulse">STATUS: ONLINE</span>
              <span className="text-[10px] text-neon-yellow">CREDITS: 99</span>
            </div>
          </div>
          
          <div className="flex gap-4 md:gap-8">
            <div className="arcade-frame p-4 bg-black/60 min-w-[160px] text-center border-neon-cyan">
              <p className="text-[10px] text-zinc-400 mb-2 tracking-widest">HI_SCORE</p>
              <p 
                className="text-3xl md:text-4xl font-glitch text-neon-yellow neon-text-yellow glitch-layer" 
                data-text={highScore.toString().padStart(6, '0')}
              >
                {highScore.toString().padStart(6, '0')}
              </p>
            </div>
            <div className="arcade-frame p-4 bg-black/60 min-w-[160px] text-center border-neon-magenta">
              <p className="text-[10px] text-zinc-400 mb-2 tracking-widest">SCORE</p>
              <p 
                className="text-3xl md:text-4xl font-glitch text-neon-cyan neon-text-cyan glitch-layer" 
                data-text={score.toString().padStart(6, '0')}
              >
                {score.toString().padStart(6, '0')}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Game Area */}
          <div className="lg:col-span-8 flex flex-col items-center gap-6">
            <div className="relative p-2 arcade-frame bg-black group">
              {/* Decorative Corner Accents */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-4 border-l-4 border-neon-magenta" />
              <div className="absolute -top-2 -right-2 w-4 h-4 border-t-4 border-r-4 border-neon-magenta" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-4 border-l-4 border-neon-magenta" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-4 border-r-4 border-neon-magenta" />

              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className="w-full max-w-[400px] aspect-square block cursor-none"
              />

              {/* Game Over Overlay */}
              <AnimatePresence>
                {isGameOver && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-8 text-center"
                  >
                    <div className="mb-6 relative">
                      <Trophy className="w-16 h-16 text-neon-yellow animate-bounce" />
                      <div className="absolute inset-0 blur-xl bg-neon-yellow/20" />
                    </div>
                    <h3 className="text-3xl font-glitch text-neon-magenta glitch-layer mb-2" data-text="GAME_OVER">GAME_OVER</h3>
                    <p className="text-[10px] text-neon-cyan mb-10 tracking-widest">FINAL_SCORE: {score}</p>
                    <button 
                      onClick={resetGame}
                      className="arcade-btn text-lg hover:scale-110 active:scale-95"
                    >
                      RETRY_SESSION
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Start Screen Overlay */}
              {!gameStarted && !isGameOver && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <button 
                      onClick={resetGame}
                      className="arcade-btn text-2xl px-10 py-4"
                    >
                      INSERT_COIN
                    </button>
                  </motion.div>
                  <p className="mt-10 text-[10px] text-zinc-500 animate-pulse font-glitch">PRESS_START_TO_BEGIN</p>
                </div>
              )}
            </div>

            {/* Mobile Controls (Visible on small screens) */}
            <div className="grid grid-cols-3 gap-2 lg:hidden">
              <div />
              <button onClick={() => { if (directionRef.current !== 'DOWN') directionRef.current = 'UP'; setDirection('UP'); }} className="arcade-btn p-4">▲</button>
              <div />
              <button onClick={() => { if (directionRef.current !== 'RIGHT') directionRef.current = 'LEFT'; setDirection('LEFT'); }} className="arcade-btn p-4">◀</button>
              <button onClick={() => { if (directionRef.current !== 'UP') directionRef.current = 'DOWN'; setDirection('DOWN'); }} className="arcade-btn p-4">▼</button>
              <button onClick={() => { if (directionRef.current !== 'LEFT') directionRef.current = 'RIGHT'; setDirection('RIGHT'); }} className="arcade-btn p-4">▶</button>
            </div>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-4 space-y-8">
            {/* Music Player Module */}
            <div className="arcade-frame p-6 bg-black/40 space-y-6 border-neon-magenta">
              <div className="flex items-center gap-3 border-b border-neon-magenta/30 pb-4">
                <Music size={18} className="text-neon-magenta" />
                <h3 className="text-[10px] text-neon-magenta tracking-tighter">AUDIO_CORE_V3</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-[8px] text-zinc-600 uppercase">Streaming...</p>
                    <h2 className="text-xs text-neon-cyan truncate glitch-layer font-glitch" data-text={currentTrack.title}>
                      {currentTrack.title}
                    </h2>
                    <p className="text-[8px] text-neon-magenta/80 italic">{currentTrack.artist}</p>
                  </div>
                  <Volume2 size={14} className="text-neon-cyan animate-pulse" />
                </div>

                <div className="h-2 bg-zinc-900 border border-zinc-800 relative overflow-hidden">
                  <motion.div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-cyan to-neon-magenta"
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-center items-center gap-6">
                <button onClick={prevTrack} className="text-zinc-500 hover:text-neon-cyan transition-colors">
                  <SkipBack size={20} />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-14 h-14 flex items-center justify-center arcade-frame bg-black hover:bg-neon-cyan hover:text-black transition-all group"
                >
                  {isPlaying ? (
                    <Pause size={24} fill="currentColor" className="group-hover:fill-black" />
                  ) : (
                    <Play size={24} fill="currentColor" className="ml-1 group-hover:fill-black" />
                  )}
                </button>
                <button onClick={nextTrack} className="text-zinc-500 hover:text-neon-cyan transition-colors">
                  <SkipForward size={20} />
                </button>
              </div>
            </div>

            {/* System Diagnostics */}
            <div className="arcade-frame p-6 bg-black/20 space-y-6 border-neon-yellow">
              <div className="flex items-center gap-3 border-b border-neon-yellow/30 pb-4">
                <Activity size={18} className="text-neon-yellow" />
                <h3 className="text-[10px] text-neon-yellow tracking-tighter">SYS_DIAGNOSTICS</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="text-zinc-500">NEURAL_LOAD</span>
                    <span className="text-neon-cyan">88.4%</span>
                  </div>
                  <div className="h-1 bg-zinc-900">
                    <motion.div 
                      className="h-full bg-neon-cyan"
                      animate={{ width: ['80%', '90%', '85%'] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="text-zinc-500">BUFFER_SYNC</span>
                    <span className="text-neon-magenta">STABLE</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className={`h-2 flex-1 ${i < 7 ? 'bg-neon-magenta' : 'bg-zinc-800'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Footer */}
        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 text-[8px] text-zinc-600 border-t-2 border-zinc-900 pt-8">
          <div className="flex items-center gap-6">
            <p>OS_KERNEL: 0x7F2A9</p>
            <p>LOC: SECTOR_7G</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              ENCRYPTION_ACTIVE
            </span>
            <p className="font-glitch">© 2026 NEON_SNAKE_CORP</p>
          </div>
        </div>
      </div>
    </div>
  );
}
