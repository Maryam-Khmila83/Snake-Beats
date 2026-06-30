import React, { useEffect, useRef, useState } from 'react';
import { synthEngine, TRACKS } from '../lib/audio';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Terminal, Disc, Cpu } from 'lucide-react';

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.4);
  const [isMuted, setIsMuted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const activeTrack = TRACKS[activeTrackIndex];

  // Sync state from engine
  useEffect(() => {
    const unsubscribeState = synthEngine.subscribeToStateChange((playing, trackIdx) => {
      setIsPlaying(playing);
      setActiveTrackIndex(trackIdx);
    });

    const unsubscribeStep = synthEngine.subscribeToStep((step) => {
      setCurrentStep(step);
    });

    // Initialize initial values
    synthEngine.setVolume(volume);

    return () => {
      unsubscribeState();
      unsubscribeStep();
    };
  }, []);

  // Handle play/pause
  const handlePlayPause = () => {
    synthEngine.playSfx('click');
    synthEngine.togglePlay();
  };

  // Next/prev tracks
  const handleNext = () => {
    synthEngine.playSfx('click');
    synthEngine.nextTrack();
  };

  const handlePrev = () => {
    synthEngine.playSfx('click');
    synthEngine.prevTrack();
  };

  // Handle volume sliders
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) {
      setIsMuted(false);
      synthEngine.setVolume(val);
    } else {
      setIsMuted(true);
      synthEngine.setVolume(0);
    }
  };

  const toggleMute = () => {
    synthEngine.playSfx('click');
    if (isMuted) {
      setIsMuted(false);
      synthEngine.setVolume(volume);
    } else {
      setIsMuted(true);
      synthEngine.setVolume(0);
    }
  };

  // Render the spectrum visualizer on Canvas with extreme pixel art look
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();

    const analyser = synthEngine.getAnalyser();
    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    // Jarring contrasting colors
    const primaryGlow = '#00ffff'; // Neon Cyan
    const secondaryGlow = '#ff00ff'; // Neon Magenta

    let fakeTimer = 0;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      // Pure black backing with retro frame trail
      ctx.fillStyle = 'rgba(2, 2, 5, 0.28)';
      ctx.fillRect(0, 0, w, h);

      if (isPlaying && analyser) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        fakeTimer += 0.06;
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.sin(i * 0.22 + fakeTimer) * 35 + 40 + Math.cos(i * 0.1 - fakeTimer) * 20;
        }
      }

      // CRT retro pixel block visualizer style
      const barWidth = Math.floor(w / 16) - 3;
      const numBars = 16;
      ctx.shadowBlur = 0;

      for (let i = 0; i < numBars; i++) {
        const val = dataArray[i] || 0;
        const normalized = val / 255;
        const fullHeight = normalized * h * 0.9;
        
        // Draw segment blocks to look like vintage computer hardware registers
        const numBlocks = 8;
        const blockSpacing = 2;
        const blockHeight = Math.floor((h - 6) / numBlocks) - blockSpacing;
        const activeBlocksCount = Math.floor(normalized * numBlocks);

        const xPos = i * (barWidth + 3) + 2;

        for (let b = 0; b < numBlocks; b++) {
          const isActive = b < activeBlocksCount;
          const yPos = h - 3 - (b * (blockHeight + blockSpacing)) - blockHeight;

          if (isActive) {
            // Glitch alternating cyan and magenta blocks
            ctx.fillStyle = (i + b + Math.floor(fakeTimer * 2)) % 2 === 0 ? primaryGlow : secondaryGlow;
          } else {
            // Dark grid backdrop blocks
            ctx.fillStyle = '#0f0c15';
          }
          ctx.fillRect(xPos, yPos, barWidth, blockHeight);
        }
      }
    };

    draw();

    window.addEventListener('resize', resizeCanvas);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isPlaying, activeTrackIndex]);

  return (
    <div className="flex flex-col bg-black border-2 border-magenta-500 rounded-none p-5 shadow-[0_0_15px_rgba(255,0,255,0.3)] h-full justify-between static-noise-bg crt-screen" id="neon-music-player" style={{ borderColor: '#ff00ff' }}>
      <div className="crt-scanline" />
      
      {/* Jarring Pixelated Title */}
      <div className="flex items-center justify-between mb-4 border-b border-cyan-400 pb-2 z-10 relative">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h2 className="font-mono text-lg tracking-wider text-cyan-400 font-bold uppercase glitch-hover">
            SYNTH_MATRIX://TRACKS
          </h2>
        </div>
        <div className="flex items-center gap-1 bg-black px-2 py-0.5 border border-cyan-400/40">
          <span className={`inline-block w-2 h-2 rounded-none ${isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-pink-500'}`}></span>
          <span className="font-mono text-[10px] uppercase text-cyan-400 tracking-tight">
            {isPlaying ? 'ACTIVE_GEN' : 'SUSPENDED'}
          </span>
        </div>
      </div>

      {/* Cyberpunk Track Info Card - Glitch Screen Tearing visual */}
      <div className="relative overflow-hidden bg-zinc-950 border-2 border-cyan-400 p-3 mb-4 flex items-center gap-4 z-10">
        {/* Animated Spin Disc */}
        <div className="relative shrink-0">
          <div className={`w-14 h-14 rounded-none bg-magenta-500 flex items-center justify-center p-0.5 shadow-lg ${isPlaying ? 'animate-spin [animation-duration:5s]' : ''}`} style={{ backgroundColor: '#ff00ff' }}>
            <div className="w-full h-full rounded-none bg-black flex items-center justify-center border border-zinc-900">
              <Disc className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          {/* Hardware tone indicator */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 border border-black" />
        </div>

        <div className="flex-1 min-w-0 font-mono">
          <div className="text-[10px] text-pink-500 uppercase tracking-widest font-black flex items-center justify-between">
            <span>GENRE: {activeTrack.genre}</span>
            <span className="text-cyan-400">SYS_OK</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-wide uppercase truncate">
            {activeTrack.name}
          </h3>
          <p className="text-[11px] text-zinc-400 uppercase line-clamp-2 mt-0.5 leading-none">
            {activeTrack.description}
          </p>
        </div>
      </div>

      {/* Real-time Web Audio Interactive Visualizer Box */}
      <div className="relative h-24 bg-black border-2 border-cyan-400 overflow-hidden mb-4 shadow-[inset_0_0_10px_#00ffff] z-10">
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        <div className="absolute top-1.5 left-1.5 flex gap-1 pointer-events-none">
          {activeTrack.tags.map((tag) => (
            <span key={tag} className="text-[9px] font-mono bg-black text-pink-500 px-1 py-0.5 border border-pink-500">
              {tag.toUpperCase()}
            </span>
          ))}
        </div>
        <div className="absolute right-2 bottom-1 pointer-events-none">
          <span className="font-mono text-xs text-cyan-400 tracking-wider">
            SPEED_BPM: <span className="font-bold underline text-white">{activeTrack.bpm}</span>
          </span>
        </div>
      </div>

      {/* Sequencer Step Matrix Timeline (Pulses live!) */}
      <div className="mb-4 bg-zinc-950 border border-pink-500/40 p-2 rounded-none z-10">
        <div className="flex justify-between items-center mb-1 px-0.5">
          <span className="font-mono text-[10px] uppercase text-cyan-400 font-bold tracking-tight">SEQUENCER_CLOCK:</span>
          <span className="font-mono text-xs text-white">
            PTR:[<span className="text-pink-500 font-bold">{String(currentStep + 1).padStart(2, '0')}</span>/16]
          </span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 16 }).map((_, i) => {
            const isCurrent = currentStep === i && isPlaying;
            const isQuarter = i % 4 === 0;
            return (
              <div
                key={i}
                className={`h-5 rounded-none transition-all duration-75 relative flex items-center justify-center border ${
                  isCurrent
                    ? 'bg-cyan-400 border-white text-black scale-105 z-10 shadow-[0_0_8px_#00ffff]'
                    : isQuarter
                    ? 'bg-zinc-900 border-pink-500/80 text-pink-500 text-[10px]'
                    : 'bg-black border-zinc-800 text-zinc-600 text-[9px]'
                }`}
              >
                <span className="font-mono text-[10px] font-bold">
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Playback & Volume Control Deck */}
      <div className="flex flex-col gap-4 z-10">
        {/* Playback Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrev}
            className="px-3 py-2 rounded-none bg-black hover:bg-zinc-900 border-2 border-cyan-400 text-cyan-400 font-mono text-xs font-bold transition-all active:translate-y-0.5"
            title="Previous Signal"
            id="audio-prev"
          >
            &lt;&lt;_PREV
          </button>

          <button
            onClick={handlePlayPause}
            className={`px-5 py-3 rounded-none border-2 flex items-center justify-center font-mono text-sm font-black transition-all active:scale-95 ${
              isPlaying
                ? 'bg-black text-pink-500 border-pink-500 shadow-[0_0_12px_rgba(255,0,255,0.4)]'
                : 'bg-cyan-400 text-black border-cyan-400 font-bold shadow-[0_0_12px_rgba(0,255,255,0.4)]'
            }`}
            title={isPlaying ? 'HALT_SYNTH' : 'EXECUTE_SYNTH'}
            id="audio-toggle-play"
          >
            {isPlaying ? '■_HALT' : '▶_EXECUTE'}
          </button>

          <button
            onClick={handleNext}
            className="px-3 py-2 rounded-none bg-black hover:bg-zinc-900 border-2 border-cyan-400 text-cyan-400 font-mono text-xs font-bold transition-all active:translate-y-0.5"
            title="Next Signal"
            id="audio-next"
          >
            NEXT_&gt;&gt;
          </button>
        </div>

        {/* Volume & Mute control slider */}
        <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 px-3 py-2.5 rounded-none">
          <button
            onClick={toggleMute}
            className="text-pink-500 hover:text-cyan-400 font-mono text-xs font-bold shrink-0"
            title="MUT_GATE"
            id="audio-toggle-mute"
          >
            {isMuted ? '[MUTED]' : '[MUTE]'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-full h-2 rounded-none bg-black border border-pink-500 cursor-pointer accent-cyan-400"
            id="audio-volume-slider"
          />
          <span className="font-mono text-xs text-cyan-400 shrink-0 w-10 text-right font-bold">
            {isMuted ? '00%' : `${String(Math.round(volume * 100)).padStart(2, '0')}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
