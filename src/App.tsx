import React, { useState, useEffect } from 'react';
import SnakeGame from './components/SnakeGame';
import MusicPlayer from './components/MusicPlayer';
import { Terminal, Shield, Cpu, Activity, Zap } from 'lucide-react';
import { synthEngine } from './lib/audio';

export default function App() {
  const [activeTrackName, setActiveTrackName] = useState('Cyberpunk Grid');
  const [isPlaying, setIsPlaying] = useState(false);

  // Subscribe to track details to sync dashboard accents
  useEffect(() => {
    const unsubscribe = synthEngine.subscribeToStateChange((playing) => {
      const track = synthEngine.getActiveTrack();
      setActiveTrackName(track.name);
      setIsPlaying(playing);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-pink-500/30 relative overflow-x-hidden crt-screen" id="app-viewport">
      <div className="crt-scanline" />

      {/* Cyberpunk Scanline Noise Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(255,0,255,0.06),transparent_60%)] pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 static-noise-bg">
        
        {/* Top Navbar Header - CRT Glitch Design */}
        <header className="flex flex-col md:flex-row items-center justify-between border-b-2 border-cyan-400 pb-6 mb-8 gap-4 z-10 relative" id="app-header">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-pink-500 text-pink-500 bg-black shadow-[0_0_8px_#ff00ff] animate-pulse">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="font-mono">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-widest text-cyan-400 uppercase glitch-hover" style={{ textShadow: '2px 2px #ff00ff' }}>
                  NEON_BEATS_SNAKE
                </h1>
                <span className="text-[10px] bg-pink-500 text-black px-1.5 py-0.5 border border-black font-extrabold tracking-widest">
                  SYS_V1.40
                </span>
              </div>
              <p className="text-xs text-zinc-400 uppercase tracking-tight mt-0.5">
                PROCEDURAL_SYNTH_SEQUENCER_INTERFACE // ARCADE_STATION
              </p>
            </div>
          </div>

          {/* Quick Hardware Stats Banner */}
          <div className="flex items-center gap-3 bg-zinc-950 border-2 border-cyan-400 px-4 py-2 font-mono text-xs">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <div className="text-zinc-400">
              CORE_AUDIO: <span className="text-pink-500 font-bold underline">{activeTrackName.toUpperCase()}</span>
            </div>
            <div className="h-4 w-[2px] bg-cyan-400/30" />
            <span className={`inline-block w-2.5 h-2.5 ${isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-pink-500'}`}></span>
          </div>
        </header>

        {/* Dashboard Grid Layout */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-10 z-10 relative" id="app-main">
          
          {/* Left Grid Window: The Snake Game Stage */}
          <section className="col-span-1 lg:col-span-7 flex flex-col gap-6" id="game-section">
            <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-pink-500 font-bold text-sm">&gt;</span>
                <h3 className="font-bold text-base text-cyan-400 uppercase tracking-widest">ARCADE_STAGE_GRID</h3>
              </div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest">STATION_REF: 20x20_CELL_MATRIX</span>
            </div>
            <SnakeGame />
          </section>

          {/* Right Grid Window: Synth Music Player */}
          <section className="col-span-1 lg:col-span-5 flex flex-col gap-6" id="player-section">
            <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-pink-500 font-bold text-sm">&gt;</span>
                <h3 className="font-bold text-base text-cyan-400 uppercase tracking-widest">SYNTH_HARDWARE_SEQUENCER</h3>
              </div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest">CLOCK_SIGNAL: ANALOG_SINE</span>
            </div>
            <MusicPlayer />
          </section>

        </main>

        {/* Informative Help Guide & Protocol Explanation - CRT Terminal design */}
        <section className="bg-black border-2 border-zinc-800 p-6 md:p-8 z-10 relative" id="app-guide">
          <div className="flex items-center gap-2 mb-5 border-b border-zinc-800 pb-3 font-mono">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h4 className="font-bold text-sm text-cyan-400 uppercase tracking-widest">SYSTEM_DIAGNOSTICS_PROCEDURES</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-zinc-400 font-mono text-xs leading-relaxed uppercase">
            
            {/* Guide column 1 */}
            <div className="flex flex-col gap-2 bg-zinc-950 border border-zinc-900 p-4 rounded-none">
              <span className="text-pink-500 font-bold flex items-center gap-1.5">
                [01] WEB_AUDIO_PIPELINE
              </span>
              <p className="text-[11px]">
                NO EXTERNAL BULKY MEDIA TRACKS ARE RE-LOADED. THIS APP RUNS A PROCEDURAL SYNTH ENGINE GENERATING RESONANT BASSLINES, DETUNED LEADS, AND REAL NOISE HIGH-HATS PROGRAMMATICALLY.
              </p>
            </div>

            {/* Guide column 2 */}
            <div className="flex flex-col gap-2 bg-zinc-950 border border-zinc-900 p-4 rounded-none">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                [02] VECTOR_STEP_LOCK
              </span>
              <p className="text-[11px]">
                ENGAGE &ldquo;CLOCK_SYNC_GATE&rdquo; TO COALESCE SNAKE VELOCITIES TO THE HARDWARE STEP SEQUENCE TICKS. SPEED ADJUSTMENTS CASCADE IN CONJUNCTION WITH CHANGING BPM COEFFICIENTS.
              </p>
            </div>

            {/* Guide column 3 */}
            <div className="flex flex-col gap-2 bg-zinc-950 border border-zinc-900 p-4 rounded-none">
              <span className="text-pink-500 font-bold flex items-center gap-1.5">
                [03] PERIPHERAL_BUS
              </span>
              <p className="text-[11px]">
                USE ARROW KEYS OR W, A, S, D REGISTERS TO REDIRECT DRIFT DIRECTION. TABLET OPERATORS MAY USE THE MOUNTED D-PAD MICROCONTROLLER BUTTONS.
              </p>
            </div>

          </div>
        </section>

        {/* Humble system credits footer */}
        <footer className="text-center font-mono text-[10px] text-zinc-600 mt-12 mb-4 uppercase tracking-widest" id="app-footer">
          NEON_BEATS_SNAKE // CRITICAL_SYSTEM_INTERFACE // BROWSER_AUDIO_STATION_ACTIVE
        </footer>

      </div>
    </div>
  );
}
