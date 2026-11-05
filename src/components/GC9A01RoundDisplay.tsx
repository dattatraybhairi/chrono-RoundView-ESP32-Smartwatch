import React, { useEffect, useRef, useState } from 'react';
import {
  WatchState,
  RotaryEvent,
  MENU_ITEMS,
  CAMERA_CONTROLS,
  MUSIC_TRACKS,
  MUSIC_CONTROLS,
  polarToCartesian,
  angularDistanceDeg,
} from '../watch/watchStateMachine';
import {
  renderOV2640Frame,
  generateSDImageDataUrl,
} from '../watch/cameraSensorRenderer';
import {
  Camera,
  Image as ImageIcon,
  Music,
  Wifi,
  Bluetooth,
  Gamepad2,
  Clock,
  BatteryCharging,
  Disc,
  Radio,
  Sparkles,
  Check,
  Lock,
  Volume2,
  VolumeX,
  Scan,
  Eye,
} from 'lucide-react';

interface GC9A01RoundDisplayProps {
  state: WatchState;
  onRotaryEvent: (
    event: RotaryEvent,
    options?: { capturedDataUrl?: string; timestamp?: string }
  ) => void;
  onDirectSelectMenu?: (menuIdx: number) => void;
  onUpdateScore?: (score: number) => void;
  onTriggerAIDetect?: () => void;
  onSpeakDetection?: (text: string) => void;
  isSpeaking?: boolean;
  liveVideoElement: HTMLVideoElement | null;
  scaleMode: '1x' | '1.6x';
}

export const GC9A01RoundDisplay: React.FC<GC9A01RoundDisplayProps> = ({
  state,
  onRotaryEvent,
  onDirectSelectMenu,
  onUpdateScore,
  onTriggerAIDetect,
  onSpeakDetection,
  isSpeaking = false,
  liveVideoElement,
  scaleMode,
}) => {
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [flashOverlay, setFlashOverlay] = useState(false);
  const [fpsReadout, setFpsReadout] = useState(30);
  const [currentTimeStr, setCurrentTimeStr] = useState('22:28:45');
  const [animTickMs, setAnimTickMs] = useState(0);
  const [sdImageMap, setSdImageMap] = useState<Record<string, string>>({});

  // Keep latest state in a ref for animation loops so 60Hz loops don't tear down
  const stateRef = useRef(state);
  stateRef.current = state;
  const videoRef = useRef(liveVideoElement);
  videoRef.current = liveVideoElement;

  // Generate deterministic dataUrls for pre-seeded SD card images once
  useEffect(() => {
    const nextMap: Record<string, string> = {};
    for (const img of state.sdImages) {
      if (img.dataUrl) {
        nextMap[img.id] = img.dataUrl;
      } else if (sdImageMap[img.id]) {
        nextMap[img.id] = sdImageMap[img.id];
      } else {
        nextMap[img.id] = generateSDImageDataUrl(img);
      }
    }
    setSdImageMap(nextMap);
  }, [state.sdImages]);

  // Smooth 20Hz animation ticker for WearOS Home Watch Faces & I2S Music Player
  useEffect(() => {
    if (state.screen !== 'HOME' && state.screen !== 'MUSIC') return;
    const start = performance.now();
    const updateClockAndAnim = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setCurrentTimeStr(`${hh}:${mm}:${ss}`);
      setAnimTickMs(performance.now() - start);
    };
    updateClockAndAnim();
    const timer = setInterval(updateClockAndAnim, 50);
    return () => clearInterval(timer);
  }, [state.screen]);

  // HandyCam 240x240 Live Stream Canvas Loop
  useEffect(() => {
    if (state.screen !== 'CAMERA') return;
    let rafId = 0;
    let lastFpsTime = performance.now();
    let frames = 0;
    const startTime = performance.now();

    const renderLoop = (now: number) => {
      frames++;
      if (now - lastFpsTime >= 500) {
        setFpsReadout(
          stateRef.current.cameraStreaming
            ? Math.min(32, Math.max(24, Math.round((frames * 1000) / (now - lastFpsTime))))
            : 0
        );
        frames = 0;
        lastFpsTime = now;
      }

      const canvas = cameraCanvasRef.current;
      if (canvas && stateRef.current.cameraStreaming) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const elapsedSec = (now - startTime) / 1000;
          renderOV2640Frame({
            ctx,
            width: 240,
            height: 240,
            scene: stateRef.current.cameraScene,
            filter: stateRef.current.cameraFilter,
            zoom: stateRef.current.cameraZoom,
            exposure: stateRef.current.cameraExposure,
            timeSec: elapsedSec,
            seedHue: 192,
            liveVideo: videoRef.current,
          });
        }
      }
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [state.screen]);

  // 240x240 Circular Arcade Game Loop (Orbital Breaker & Radar Defense)
  useEffect(() => {
    if (state.screen !== 'GAMES' || state.gameMode !== 'PLAYING') return;
    let rafId = 0;
    let lastTime = performance.now();

    // Game simulation state inside closure
    let ballX = 120;
    let ballY = 120;
    let ballVx = 68;
    let ballVy = 82;
    let score = 0;
    let lastPulseSeen = stateRef.current.gamePulseCount;

    // Core targets for Orbital Breaker
    const coreBricks: { angle: number; ring: number; alive: boolean; hue: number }[] = [];
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < 8; i++) {
        coreBricks.push({
          angle: i * 45,
          ring: 26 + ring * 16,
          alive: true,
          hue: (i * 45 + ring * 60) % 360,
        });
      }
    }

    // Asteroids & Bolts for Radar Defense
    const bolts: { x: number; y: number; vx: number; vy: number }[] = [];
    const drones: { angle: number; dist: number; speed: number }[] = [
      { angle: 40, dist: 105, speed: 18 },
      { angle: 165, dist: 112, speed: 22 },
      { angle: 280, dist: 108, speed: 16 },
    ];

    // Expanding Vortex Gates for Cyber Tunnel
    const vortexGates: { radius: number; gapDeg: number; scored: boolean }[] = [
      { radius: 16, gapDeg: 60, scored: false },
      { radius: 48, gapDeg: 185, scored: false },
      { radius: 80, gapDeg: 300, scored: false },
    ];

    // Flappy Bird state
    let birdY = 114;
    let birdVy = -75;
    const flappyPipes: { x: number; gapY: number; scored: boolean }[] = [
      { x: 178, gapY: 102, scored: false },
      { x: 286, gapY: 134, scored: false },
    ];

    let phaseBoostSec = 0;
    let smoothDeg = stateRef.current.paddleAngleDeg;
    let lastTargetDeg = stateRef.current.paddleAngleDeg;

    const stepGame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const canvas = gameCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) {
        rafId = requestAnimationFrame(stepGame);
        return;
      }

      const st = stateRef.current;
      const targetDeg = st.paddleAngleDeg;

      // Shortest-path smooth angular interpolation for silky-smooth rotary motion
      let angDelta = ((targetDeg - smoothDeg + 540) % 360) - 180;
      smoothDeg = (smoothDeg + angDelta * Math.min(1, dt * 22) + 360) % 360;
      const paddleDeg = smoothDeg;

      // Auto-fire assist in RADAR_DEFENSE or Flap in FLAPPY_BIRD when rotating the knob
      if (targetDeg !== lastTargetDeg) {
        lastTargetDeg = targetDeg;
        if (st.selectedGame === 'RADAR_DEFENSE') {
          const rad = ((targetDeg - 90) * Math.PI) / 180;
          bolts.push({
            x: 120 + Math.cos(rad) * 16,
            y: 120 + Math.sin(rad) * 16,
            vx: Math.cos(rad) * 170,
            vy: Math.sin(rad) * 170,
          });
        } else if (st.selectedGame === 'FLAPPY_BIRD') {
          birdVy = -142;
          phaseBoostSec = 0.18;
        }
      }

      // Detect Single-Click action pulse inside game
      if (st.gamePulseCount !== lastPulseSeen) {
        lastPulseSeen = st.gamePulseCount;
        if (st.selectedGame === 'RADAR_DEFENSE') {
          for (const offset of [-7, 7]) {
            const rad = ((paddleDeg + offset - 90) * Math.PI) / 180;
            bolts.push({
              x: 120 + Math.cos(rad) * 16,
              y: 120 + Math.sin(rad) * 16,
              vx: Math.cos(rad) * 175,
              vy: Math.sin(rad) * 175,
            });
          }
          phaseBoostSec = 0.45;
        } else if (st.selectedGame === 'CYBER_TUNNEL') {
          phaseBoostSec = 0.65;
        } else if (st.selectedGame === 'FLAPPY_BIRD') {
          birdVy = -142;
          phaseBoostSec = 0.18;
        } else {
          // Speed boost impulse in Orbital Breaker
          ballVx *= 1.14;
          ballVy *= 1.14;
          phaseBoostSec = 0.65;
        }
      }
      if (phaseBoostSec > 0) phaseBoostSec = Math.max(0, phaseBoostSec - dt);

      // Clear circular playfield
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, 240, 240);

      // Subtle radar rings
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.14)';
      ctx.lineWidth = 1;
      for (const r of [36, 68, 102]) {
        ctx.beginPath();
        ctx.arc(120, 120, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (st.selectedGame === 'ORBITAL_BREAKER') {
        // Draw core targets
        let aliveCount = 0;
        for (const brick of coreBricks) {
          if (!brick.alive) continue;
          aliveCount++;
          const pt = polarToCartesian(120, 120, brick.ring, brick.angle);
          ctx.fillStyle = `hsl(${brick.hue}, 85%, 60%)`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5.5, 0, Math.PI * 2);
          ctx.fill();

          // Check ball collision with brick
          const dx = ballX - pt.x;
          const dy = ballY - pt.y;
          if (dx * dx + dy * dy <= 95) {
            brick.alive = false;
            ballVx = -ballVx;
            ballVy = -ballVy;
            score += 15;
            onUpdateScore?.(score);
          }
        }
        if (aliveCount === 0) {
          for (const b of coreBricks) b.alive = true;
        }

        // Update ball position
        ballX += ballVx * dt;
        ballY += ballVy * dt;

        // Check circular perimeter bounce (radius = 102)
        const dx = ballX - 120;
        const dy = ballY - 120;
        const dist = Math.hypot(dx, dy);
        if (dist >= 98) {
          const ballAngle =
            ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
          const diff = angularDistanceDeg(ballAngle, paddleDeg);
          // Bounce inward toward center with slight angle tweak
          const normX = dx / dist;
          const normY = dy / dist;
          ballX = 120 + normX * 95;
          ballY = 120 + normY * 95;

          const speed = Math.min(130, Math.hypot(ballVx, ballVy));
          const bounceAngle =
            Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 0.45;
          ballVx = Math.cos(bounceAngle) * speed;
          ballVy = Math.sin(bounceAngle) * speed;

          if (diff <= 34) {
            score += 10;
            onUpdateScore?.(score);
          }
        }

        // Draw curved perimeter paddle at paddleDeg (arc of +-28 deg at radius 102)
        const startRad = ((paddleDeg - 90 - 26) * Math.PI) / 180;
        const endRad = ((paddleDeg - 90 + 26) * Math.PI) / 180;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(120, 120, 102, startRad, endRad);
        ctx.stroke();

        // Draw glowing plasma ball
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (st.selectedGame === 'RADAR_DEFENSE') {
        // RADAR_DEFENSE: Center 360 turret + incoming perimeter drones
        const aimRad = ((paddleDeg - 90) * Math.PI) / 180;
        // Aim laser sight
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(120, 120);
        ctx.lineTo(120 + Math.cos(aimRad) * 104, 120 + Math.sin(aimRad) * 104);
        ctx.stroke();
        ctx.setLineDash([]);

        // Center turret
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(120, 120, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(120, 120);
        ctx.lineTo(120 + Math.cos(aimRad) * 18, 120 + Math.sin(aimRad) * 18);
        ctx.stroke();

        // Step bolts
        ctx.fillStyle = '#22d3ee';
        for (let i = bolts.length - 1; i >= 0; i--) {
          const b = bolts[i];
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
          ctx.fill();
          if (Math.hypot(b.x - 120, b.y - 120) > 115) {
            bolts.splice(i, 1);
          }
        }

        // Step incoming drones
        for (const d of drones) {
          d.dist -= d.speed * dt;
          if (d.dist < 16) {
            d.dist = 108;
            d.angle = (d.angle + 115) % 360;
          }
          const dPt = polarToCartesian(120, 120, d.dist, d.angle);
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(dPt.x, dPt.y, 6, 0, Math.PI * 2);
          ctx.fill();

          // Check bolt hit
          for (let i = bolts.length - 1; i >= 0; i--) {
            const b = bolts[i];
            if (Math.hypot(b.x - dPt.x, b.y - dPt.y) < 11) {
              bolts.splice(i, 1);
              d.dist = 110;
              d.angle = Math.floor(Math.random() * 360);
              score += 25;
              onUpdateScore?.(score);
              break;
            }
          }
        }
      } else if (st.selectedGame === 'CYBER_TUNNEL') {
        // CYBER_TUNNEL: 360° Polar Vortex Gate Dodger
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(120, 120, 7, 0, Math.PI * 2);
        ctx.fill();

        for (const gate of vortexGates) {
          gate.radius += 38 * dt;
          const r = gate.radius;

          for (let deg = 0; deg < 360; deg += 10) {
            const diff = angularDistanceDeg(deg, gate.gapDeg);
            const isSafe = diff <= 38;
            const pt = polarToCartesian(120, 120, r, deg);
            ctx.fillStyle = isSafe ? '#10b981' : '#f43f5e';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isSafe ? 1.5 : 2.3, 0, Math.PI * 2);
            ctx.fill();
          }

          if (!gate.scored && r >= 92 && r <= 99) {
            gate.scored = true;
            if (angularDistanceDeg(paddleDeg, gate.gapDeg) <= 40 || phaseBoostSec > 0) {
              score += 30;
              onUpdateScore?.(score);
            }
          }

          if (r > 110) {
            gate.radius = 12;
            gate.gapDeg = (gate.gapDeg + 125) % 360;
            gate.scored = false;
          }
        }

        // Player cyber-glider at r = 94
        const shipPt = polarToCartesian(120, 120, 94, paddleDeg);
        ctx.fillStyle = phaseBoostSec > 0 ? '#10b981' : '#22d3ee';
        ctx.beginPath();
        ctx.arc(shipPt.x, shipPt.y, phaseBoostSec > 0 ? 7.5 : 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // FLAPPY_BIRD: Smooth 60FPS Pipe Flyer
        birdVy = Math.min(195, birdVy + 290 * dt);
        birdY += birdVy * dt;
        if (birdY < 34) {
          birdY = 34;
          birdVy = 0;
        } else if (birdY > 190) {
          birdY = 106;
          birdVy = -95;
        }

        const pipeSpeed = Math.min(115, 68 + score * 0.12);
        const gapHalf = 30;

        for (const p of flappyPipes) {
          p.x -= pipeSpeed * dt;
          if (p.x < 18) {
            p.x += 216;
            p.gapY = 78 + ((Math.floor(now) + score * 13) % 68);
            p.scored = false;
          }
          if (!p.scored && p.x + 10 < 68) {
            p.scored = true;
            score += 10;
            onUpdateScore?.(score);
          }

          const gapTop = p.gapY - gapHalf;
          const gapBot = p.gapY + gapHalf;

          // Draw top & bottom pipes
          ctx.fillStyle = '#10b981';
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.2;
          if (gapTop > 32) {
            ctx.fillRect(p.x, 32, 20, gapTop - 32);
            ctx.strokeRect(p.x, 32, 20, gapTop - 32);
            ctx.fillRect(p.x - 2, gapTop - 6, 24, 6);
          }
          if (197 > gapBot) {
            ctx.fillRect(p.x, gapBot, 20, 197 - gapBot);
            ctx.strokeRect(p.x, gapBot, 20, 197 - gapBot);
            ctx.fillRect(p.x - 2, gapBot, 24, 6);
          }

          // Collision bounce-reset in simulator
          if (p.x <= 75 && p.x + 20 >= 61) {
            if (birdY - 7 < gapTop || birdY + 7 > gapBot) {
              birdY = p.gapY;
              birdVy = -70;
              p.x -= 28;
            }
          }
        }

        // Ground line
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(46, 198);
        ctx.lineTo(194, 198);
        ctx.stroke();

        // Draw Flappy Bird sprite at (68, birdY)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(68, birdY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Wing
        ctx.fillStyle = phaseBoostSec > 0 ? '#22d3ee' : '#ffffff';
        ctx.fillRect(60, birdY + (birdVy < -15 ? -4 : 1), 8, 5);

        // Eye & Beak
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(71, birdY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(76, birdY - 2);
        ctx.lineTo(82, birdY + 1);
        ctx.lineTo(76, birdY + 4);
        ctx.closePath();
        ctx.fill();
      }

      // Draw circular HUD score at top arc
      ctx.fillStyle = 'rgba(11, 14, 23, 0.78)';
      ctx.fillRect(72, 12, 96, 18);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`SCORE ${String(score).padStart(4, '0')}`, 120, 24);

      rafId = requestAnimationFrame(stepGame);
    };

    rafId = requestAnimationFrame(stepGame);
    return () => cancelAnimationFrame(rafId);
  }, [state.screen, state.gameMode, state.selectedGame]);

  // Handle HandyCam Snapshot capture to SD Card
  const triggerCameraRotaryClick = () => {
    const activeTool = CAMERA_CONTROLS[state.cameraControlIndex].id;
    if (activeTool === 'SNAP' && cameraCanvasRef.current) {
      const dataUrl = cameraCanvasRef.current.toDataURL('image/jpeg', 0.92);
      const now = new Date();
      const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setFlashOverlay(true);
      setTimeout(() => setFlashOverlay(false), 180);
      onRotaryEvent('SINGLE_CLICK', { capturedDataUrl: dataUrl, timestamp: ts });
    } else if (activeTool === 'DETECT') {
      if (onTriggerAIDetect) {
        onTriggerAIDetect();
      } else {
        onRotaryEvent('SINGLE_CLICK');
      }
    } else {
      onRotaryEvent('SINGLE_CLICK');
    }
  };

  const renderMenuIcon = (id: string, active: boolean) => {
    const cls = active ? 'w-5 h-5 text-slate-950' : 'w-4 h-4 text-slate-300';
    switch (id) {
      case 'CAMERA':
        return <Camera className={cls} />;
      case 'GALLERY':
        return <ImageIcon className={cls} />;
      case 'MUSIC':
        return <Music className={cls} />;
      case 'WIFI':
        return <Wifi className={cls} />;
      case 'BLUETOOTH':
        return <Bluetooth className={cls} />;
      case 'GAMES':
        return <Gamepad2 className={cls} />;
      default:
        return <Clock className={cls} />;
    }
  };

  // Scale wrapper: 1.6x gives 384x384 physical presence while keeping strict 240x240 native GC9A01 coordinate space
  const outerSizePx = scaleMode === '1.6x' ? 384 : 240;
  const scaleFactor = scaleMode === '1.6x' ? 1.6 : 1;

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Top & Bottom Watch Strap Lugs */}
      <div className="w-28 h-5 bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-lg border-x border-t border-slate-700/80" />

      {/* Machined CNC Aluminum Watch Bezel housing the 240x240 GC9A01 Round Display */}
      <div
        className="relative rounded-full p-4 bg-gradient-to-br from-slate-700 via-slate-900 to-slate-950 shadow-2xl border-2 border-slate-600/80 flex items-center justify-center"
        onWheel={(e) => {
          e.preventDefault();
          onRotaryEvent(e.deltaY > 0 ? 'CW' : 'CCW');
        }}
      >
        {/* Top OV2640 Camera Module Lens Boss Integrated into Watch Bezel at 12-o'clock */}
        <div
          title="ESP32-S3 OV2640 DVP Camera Sensor Lens"
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-600 flex items-center gap-1.5 z-20 shadow-md"
        >
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-cyan-400/70 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
          </div>
          <span className="text-[9px] font-mono tracking-wider text-slate-300">
            OV2640
          </span>
        </div>

        {/* Physical Rotary Crown Visual Indicator on Right Bezel (3-o'clock) */}
        <button
          type="button"
          aria-label="Watch Crown Single Click"
          onClick={() =>
            state.screen === 'CAMERA'
              ? triggerCameraRotaryClick()
              : onRotaryEvent('SINGLE_CLICK')
          }
          onDoubleClick={(e) => {
            e.stopPropagation();
            onRotaryEvent('DOUBLE_CLICK');
          }}
          title="Single-Click: Select · Double-Click: Back · Scroll: Rotate"
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-14 rounded-r-md bg-gradient-to-b from-slate-500 via-slate-300 to-slate-600 border border-slate-400 shadow-lg flex flex-col justify-between py-1.5 px-0.5 hover:brightness-110 active:translate-x-[-2px] transition-transform cursor-pointer"
        >
          <span className="w-full h-0.5 bg-slate-800/70" />
          <span className="w-full h-0.5 bg-slate-800/70" />
          <span className="w-full h-0.5 bg-slate-800/70" />
          <span className="w-full h-0.5 bg-slate-800/70" />
          <span className="w-full h-0.5 bg-slate-800/70" />
        </button>

        {/* Scaled Viewport Holder */}
        <div
          style={{ width: `${outerSizePx}px`, height: `${outerSizePx}px` }}
          className="relative rounded-full overflow-hidden ring-2 ring-slate-800 bg-black flex items-center justify-center"
        >
          {/* TRUE 240x240 GC9A01 NATIVE PIXEL COORDINATE CONTAINER */}
          <div
            data-testid="gc9a01-display"
            data-screen={state.screen}
            style={{
              width: '240px',
              height: '240px',
              transform: `scale(${scaleFactor})`,
              transformOrigin: 'center center',
            }}
            className="relative w-[240px] h-[240px] rounded-full overflow-hidden bg-[#060911] text-slate-100 select-none shrink-0"
          >
            {/* Circular Bezel Degree Ticks (SVG Overlay around r=117) */}
            <svg
              viewBox="0 0 240 240"
              className="absolute inset-0 w-full h-full pointer-events-none z-30"
            >
              <circle
                cx="120"
                cy="120"
                r="118.5"
                fill="none"
                stroke="rgba(56, 189, 248, 0.24)"
                strokeWidth="1.5"
              />
              {Array.from({ length: 60 }).map((_, idx) => {
                const deg = idx * 6;
                const isMajor = idx % 5 === 0;
                const p1 = polarToCartesian(120, 120, isMajor ? 112 : 115, deg);
                const p2 = polarToCartesian(120, 120, 118, deg);
                return (
                  <line
                    key={deg}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={
                      isMajor
                        ? 'rgba(148, 163, 184, 0.55)'
                        : 'rgba(148, 163, 184, 0.2)'
                    }
                    strokeWidth={isMajor ? '1.4' : '0.8'}
                  />
                );
              })}
            </svg>

            {/* ==================== SCREEN 1: HOME WATCH FACE (ANDROID WEAR-OS ANIMATED) ==================== */}
            {state.screen === 'HOME' && (
              <div className="relative w-full h-full flex flex-col items-center justify-between py-5 px-6 text-center">
                {/* Top Arc Status Telemetry */}
                <div className="flex items-center gap-2 text-[9px] font-mono text-slate-300 mt-1 z-20">
                  <span
                    className={
                      state.wifiEnabled ? 'text-cyan-400' : 'text-slate-600'
                    }
                  >
                    WiFi
                  </span>
                  <span>·</span>
                  <span
                    className={
                      state.bleEnabled ? 'text-violet-400' : 'text-slate-600'
                    }
                  >
                    BLE
                  </span>
                  <span>·</span>
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <BatteryCharging className="w-2.5 h-2.5 inline" />
                    {state.batteryPct}%
                  </span>
                </div>

                {/* Watch Face 1: WearOS "Ultra Chrono" Analog + Digital + ECG Hybrid */}
                {state.watchFace === 'CHRONO' && (() => {
                  const smoothSec = ((Date.now() % 60000) / 1000);
                  const secDeg = smoothSec * 6;
                  const minVal = Number(currentTimeStr.slice(3, 5)) || 0;
                  const hourVal = Number(currentTimeStr.slice(0, 2)) || 0;
                  const minDeg = (minVal + smoothSec / 60) * 6;
                  const hourDeg = ((hourVal % 12) + minVal / 60) * 30;
                  const hPt = polarToCartesian(120, 120, 48, hourDeg);
                  const mPt = polarToCartesian(120, 120, 72, minDeg);
                  const sPt = polarToCartesian(120, 120, 88, secDeg);
                  const sTail = polarToCartesian(120, 120, 18, secDeg + 180);
                  const dotPt = polarToCartesian(120, 120, 106, secDeg);

                  return (
                    <div className="flex flex-col items-center my-auto z-10">
                      {/* Animated SVG Analog Hands & Activity Arc Overlay */}
                      <svg
                        viewBox="0 0 240 240"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      >
                        {/* Activity & Battery Gauge Arcs */}
                        <circle
                          cx="120"
                          cy="120"
                          r="104"
                          fill="none"
                          stroke="rgba(6, 182, 212, 0.14)"
                          strokeWidth="3"
                        />
                        <circle
                          cx={dotPt.x}
                          cy={dotPt.y}
                          r="3.2"
                          fill="#22d3ee"
                        />
                        {/* Hour & Minute Hands */}
                        <line
                          x1="120"
                          y1="120"
                          x2={hPt.x}
                          y2={hPt.y}
                          stroke="#f8fafc"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <line
                          x1="120"
                          y1="120"
                          x2={mPt.x}
                          y2={mPt.y}
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        {/* Sweeping Rose Second Hand */}
                        <line
                          x1={sTail.x}
                          y1={sTail.y}
                          x2={sPt.x}
                          y2={sPt.y}
                          stroke="#f43f5e"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                        <circle cx="120" cy="120" r="4" fill="#f8fafc" />
                        <circle cx="120" cy="120" r="2" fill="#f43f5e" />
                      </svg>

                      <div className="text-[8px] font-mono tracking-widest text-cyan-400 uppercase mb-0.5 bg-slate-950/75 px-2 rounded">
                        WEAR-OS · ULTRA CHRONO
                      </div>
                      <div className="text-[30px] leading-none font-mono font-bold tracking-tight text-white tabular-nums drop-shadow">
                        {currentTimeStr.slice(0, 5)}
                      </div>
                      <div className="text-[11px] font-mono text-cyan-300 tabular-nums">
                        :{currentTimeStr.slice(6, 8)}s
                      </div>

                      {/* Animated ECG / Telemetry Pulse Subdial */}
                      <div className="mt-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 flex items-center gap-2">
                        <svg width="64" height="16" viewBox="0 0 64 16">
                          <polyline
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="1.5"
                            points={Array.from({ length: 16 })
                              .map((_, i) => {
                                const x = i * 4;
                                const y =
                                  8 +
                                  Math.sin(i * 0.7 - animTickMs * 0.008) * 5.5;
                                return `${x},${y.toFixed(1)}`;
                              })
                              .join(' ')}
                          />
                        </svg>
                        <span className="text-[8px] font-mono text-emerald-300">
                          SD {state.sdImages.length} JPG
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Watch Face 2: WearOS "Cyber Orbital" Counter-Rotating Rings */}
                {state.watchFace === 'ORBITAL' && (
                  <div className="relative flex flex-col items-center justify-center my-auto w-38 h-38 z-10">
                    <svg
                      viewBox="0 0 150 150"
                      className="absolute inset-0 w-full h-full"
                    >
                      <g
                        style={{
                          transform: `rotate(${(animTickMs * 0.045) % 360}deg)`,
                          transformOrigin: '75px 75px',
                        }}
                      >
                        <circle
                          cx="75"
                          cy="75"
                          r="66"
                          fill="none"
                          stroke="#1e293b"
                          strokeWidth="5"
                        />
                        <circle
                          cx="75"
                          cy="75"
                          r="66"
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="5"
                          strokeDasharray="140 280"
                          strokeLinecap="round"
                        />
                      </g>
                      <g
                        style={{
                          transform: `rotate(${-((animTickMs * 0.032) % 360)}deg)`,
                          transformOrigin: '75px 75px',
                        }}
                      >
                        <circle
                          cx="75"
                          cy="75"
                          r="54"
                          fill="none"
                          stroke="#8b5cf6"
                          strokeWidth="3.5"
                          strokeDasharray="95 245"
                          strokeLinecap="round"
                        />
                      </g>
                    </svg>
                    <span className="text-[8px] font-mono text-violet-300 tracking-wider">
                      CYBER ORBITAL
                    </span>
                    <span className="text-2xl font-mono font-bold text-white tabular-nums">
                      {currentTimeStr.slice(0, 5)}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-300 tabular-nums">
                      SEC .{currentTimeStr.slice(6, 8)} · M2145
                    </span>
                  </div>
                )}

                {/* Watch Face 3: WearOS "Radar Telemetry" Sweeping Horizon */}
                {state.watchFace === 'TELEMETRY' && (() => {
                  const radarDeg = ((animTickMs * 0.09) % 360);
                  const rPt = polarToCartesian(120, 120, 102, radarDeg);
                  return (
                    <div className="flex flex-col items-center justify-center my-auto w-full px-3 z-10">
                      <svg
                        viewBox="0 0 240 240"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      >
                        <circle
                          cx="120"
                          cy="120"
                          r="82"
                          fill="none"
                          stroke="rgba(16, 185, 129, 0.16)"
                          strokeWidth="1"
                        />
                        <line
                          x1="120"
                          y1="120"
                          x2={rPt.x}
                          y2={rPt.y}
                          stroke="rgba(16, 185, 129, 0.55)"
                          strokeWidth="1.5"
                        />
                      </svg>
                      <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums bg-slate-950/85 px-2.5 py-0.5 rounded border border-emerald-500/40">
                        {currentTimeStr}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-mono text-left w-36 mt-2 bg-slate-950/80 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400">CPU:</span>
                        <span className="text-slate-100 text-right">240 MHz</span>
                        <span className="text-slate-400">CAM:</span>
                        <span className="text-cyan-300 text-right">M2145</span>
                        <span className="text-slate-400">SD_MMC:</span>
                        <span className="text-emerald-300 text-right">
                          {state.sdImages.length} FILES
                        </span>
                        <span className="text-slate-400">ENC:</span>
                        <span className="text-slate-200 text-right">
                          STATE-LUT
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Bottom Arc Hint */}
                <button
                  type="button"
                  onClick={() => onRotaryEvent('SINGLE_CLICK')}
                  className="mb-1 px-3 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-[9px] font-mono text-cyan-300 hover:bg-cyan-500/25 transition-colors cursor-pointer z-20"
                >
                  CLICK: MENU · ROTATE: FACE
                </button>
              </div>
            )}

            {/* ==================== SCREEN 2: RADIAL MAIN MENU ==================== */}
            {state.screen === 'MENU' && (() => {
              const activeItem = MENU_ITEMS[state.menuIndex];
              const activeAngleDeg = state.menuIndex * (360 / MENU_ITEMS.length);
              const haloPt = polarToCartesian(120, 120, 78, activeAngleDeg);

              return (
                <div className="relative w-full h-full">
                  {/* Dynamic Color-Changing Orbit Ring & Selection Halo SVG */}
                  <svg
                    viewBox="0 0 240 240"
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  >
                    <circle
                      cx="120"
                      cy="120"
                      r="116"
                      fill="none"
                      stroke={activeItem.accentColor}
                      strokeOpacity="0.45"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="120"
                      cy="120"
                      r="78"
                      fill="none"
                      stroke="rgba(30, 41, 59, 0.9)"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={haloPt.x}
                      cy={haloPt.y}
                      r="23"
                      fill="none"
                      stroke={activeItem.accentColor}
                      strokeWidth="1.8"
                      className="transition-all duration-200"
                    />
                  </svg>

                  {/* Radial Menu Nodes positioned around circular perimeter (r = 78px) */}
                  {MENU_ITEMS.map((item, idx) => {
                    const angleDeg = idx * (360 / MENU_ITEMS.length);
                    const pt = polarToCartesian(120, 120, 78, angleDeg);
                    const isSelected = state.menuIndex === idx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={`Menu ${item.label}`}
                        onClick={() => {
                          if (isSelected) {
                            onRotaryEvent('SINGLE_CLICK');
                          } else if (onDirectSelectMenu) {
                            onDirectSelectMenu(idx);
                          }
                        }}
                        style={{
                          left: `${pt.x}px`,
                          top: `${pt.y}px`,
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: isSelected
                            ? item.accentColor
                            : 'rgba(15, 23, 42, 0.92)',
                          borderColor: isSelected ? '#ffffff' : item.accentColor,
                          boxShadow: isSelected
                            ? `0 0 16px ${item.accentColor}`
                            : 'none',
                        }}
                        className={`absolute z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border cursor-pointer ${
                          isSelected
                            ? 'text-slate-950 scale-110 ring-2 ring-white'
                            : 'text-slate-200 hover:scale-105'
                        }`}
                      >
                        {renderMenuIcon(item.id, isSelected)}
                      </button>
                    );
                  })}

                  {/* Center Hub Displaying Active Selection Info with Color-Changing Ring */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-14 text-center z-20">
                    <div
                      style={{ borderColor: activeItem.accentColor }}
                      className="w-24 h-24 rounded-full bg-slate-900/95 border-2 flex flex-col items-center justify-center p-2 shadow-inner transition-colors duration-200"
                    >
                      <span
                        style={{ color: activeItem.accentColor }}
                        className="text-[8px] font-mono font-bold uppercase tracking-widest"
                      >
                        {state.menuIndex + 1} / {MENU_ITEMS.length}
                      </span>
                      <span className="text-xs font-bold text-white leading-tight mt-0.5">
                        {activeItem.label}
                      </span>
                      <span className="text-[8px] text-slate-400 leading-tight mt-1">
                        {activeItem.shortDesc}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ==================== SCREEN 3: HANDYCAM CONNECTED CAMERA ==================== */}
            {state.screen === 'CAMERA' && (
              <div className="relative w-full h-full">
                {/* 240x240 Live Camera Canvas */}
                <canvas
                  ref={cameraCanvasRef}
                  width={240}
                  height={240}
                  className="w-full h-full block"
                />

                {/* Capture White Flash Overlay */}
                {flashOverlay && (
                  <div className="absolute inset-0 bg-white/90 z-30 pointer-events-none" />
                )}

                {/* HandyCam Circular Viewfinder HUD */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between items-center py-3.5 px-6">
                  {/* Top Arc HandyCam & AI Telemetry */}
                  <div className="px-2.5 py-0.5 rounded-full bg-slate-950/85 border border-slate-700/80 flex items-center gap-1 text-[8px] font-mono">
                    <span
                      className={
                        state.cameraStreaming
                          ? 'text-rose-400 font-bold'
                          : 'text-amber-300'
                      }
                    >
                      {state.cameraStreaming ? '● REC' : '❚❚ PAUSE'}
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-cyan-300">{fpsReadout}FPS</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-emerald-300">
                      {state.cameraZoom.toFixed(1)}x
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-amber-300 font-bold flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      LOCAL AI
                    </span>
                  </div>

                  {/* Speaking / Audio Output Banner when I2S Speaker is active */}
                  {isSpeaking && state.aiDetectionResult && (
                    <div className="absolute top-10 inset-x-8 z-30 pointer-events-auto">
                      <div className="px-2.5 py-0.5 rounded-full bg-emerald-950/95 border border-emerald-400 text-emerald-200 text-[8px] font-mono flex items-center justify-center gap-1.5 shadow-lg animate-pulse">
                        <Volume2 className="w-3 h-3 text-emerald-400" />
                        <span className="truncate font-semibold">
                          SPEAKING: {state.aiDetectionResult.primaryLabel}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* AI Scanning Active Radar Beam */}
                  {state.aiDetecting && (
                    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center">
                      <div className="w-44 h-44 rounded-full border border-cyan-400/80 animate-ping absolute opacity-30" />
                      <div className="w-32 h-32 rounded-full border border-cyan-300/80 animate-spin absolute border-dashed opacity-60" />
                      <div className="px-2.5 py-1 rounded-full bg-slate-950/95 border border-cyan-400 text-cyan-200 text-[8px] font-mono font-bold flex items-center gap-1.5 shadow-xl animate-pulse z-30">
                        <Scan className="w-3 h-3 text-cyan-400 animate-spin" />
                        <span>LOCAL INT8 INFERENCE...</span>
                      </div>
                    </div>
                  )}

                  {/* AI Object Bounding Box & Target Reticle */}
                  {!state.aiDetecting && state.aiDetectionResult && state.aiHudVisible && (() => {
                    const box = state.aiDetectionResult.boundingBox || {
                      ymin: 220,
                      xmin: 200,
                      ymax: 780,
                      xmax: 800,
                    };
                    const leftPct = `${Math.max(12, Math.min(68, (box.xmin / 1000) * 100))}%`;
                    const topPct = `${Math.max(22, Math.min(62, (box.ymin / 1000) * 100))}%`;
                    const widthPct = `${Math.max(24, Math.min(58, ((box.xmax - box.xmin) / 1000) * 100))}%`;
                    const heightPct = `${Math.max(24, Math.min(52, ((box.ymax - box.ymin) / 1000) * 100))}%`;

                    return (
                      <div
                        style={{
                          left: leftPct,
                          top: topPct,
                          width: widthPct,
                          height: heightPct,
                        }}
                        className="absolute border border-cyan-400/60 pointer-events-none z-10 transition-all duration-300"
                      >
                        {/* 4 Cyberpunk Reticle Corners */}
                        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-300" />
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-300" />
                        <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-300" />
                        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-300" />

                        {/* Top Identification Label Pill with Local INT8 Latency */}
                        <div className="absolute -top-4 left-0 bg-cyan-400 text-slate-950 px-1.5 py-0.5 rounded text-[7px] font-mono font-bold whitespace-nowrap shadow-sm flex items-center gap-1">
                          <span>{state.aiDetectionResult.primaryLabel.slice(0, 16)} {state.aiDetectionResult.confidencePct}%</span>
                          <span className="bg-slate-950 text-cyan-300 px-1 py-0.2 rounded text-[6px]">
                            {state.aiDetectionResult.inferenceTimeMs || 78}ms
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Center Crosshair & Sensor Status */}
                  <div className="relative w-20 h-20 border border-cyan-400/25 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 border border-cyan-300/80 rounded-full" />
                    <div className="absolute -bottom-3 text-[7px] font-mono text-cyan-200 bg-slate-950/85 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {state.cameraScene} · {state.cameraFilter}
                    </div>
                  </div>

                  {/* Bottom Rotary Control Pill Bar & Quick Speaker Action */}
                  <div className="flex flex-col items-center gap-1 pointer-events-auto mb-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={triggerCameraRotaryClick}
                        className="px-2.5 py-1 rounded-full bg-cyan-400 text-slate-950 font-mono font-bold text-[9px] shadow-md hover:bg-cyan-300 cursor-pointer whitespace-nowrap"
                      >
                        [{CAMERA_CONTROLS[state.cameraControlIndex].label}] · CLICK
                      </button>

                      {/* On-watch Quick Speaker Trigger */}
                      {state.aiDetectionResult && onSpeakDetection && (
                        <button
                          type="button"
                          onClick={() =>
                            onSpeakDetection(state.aiDetectionResult!.speechText)
                          }
                          aria-label="Speak identified object via I2S Speaker"
                          className="p-1 rounded-full bg-slate-950/90 border border-cyan-400/80 hover:bg-cyan-500/20 text-cyan-300 cursor-pointer shadow"
                          title="Speak what this is via I2S Speaker"
                        >
                          <Volume2 className="w-3 h-3 text-cyan-300" />
                        </button>
                      )}
                    </div>

                    <span className="text-[7px] font-mono text-slate-300 bg-slate-950/80 px-2 rounded">
                      SD: {state.sdImages.length} JPG · 2×CLICK BACK
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== SCREEN 4: SD CARD GALLERY (/sdcard/DCIM) ==================== */}
            {state.screen === 'GALLERY' && (
              <div className="relative w-full h-full flex flex-col items-center justify-between py-5 px-5 bg-[#070b14]">
                {state.galleryMode === 'GRID' ? (
                  <>
                    <div className="text-center mt-1">
                      <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider">
                        /sdcard/DCIM ({state.sdImages.length})
                      </div>
                      <div className="text-[10px] font-mono text-slate-300">
                        {state.sdImages[state.galleryIndex]?.filename ??
                          'EMPTY SD'}
                      </div>
                    </div>

                    {/* 2x2 Circular-Safe Thumbnail Grid */}
                    <div className="grid grid-cols-2 gap-2 my-auto">
                      {state.sdImages.slice(0, 4).map((img, idx) => {
                        const isFocused = state.galleryIndex === idx;
                        return (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => onRotaryEvent('SINGLE_CLICK')}
                            className={`relative w-16 h-14 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                              isFocused
                                ? 'border-emerald-400 ring-2 ring-emerald-400/60 scale-105'
                                : 'border-slate-700 opacity-75'
                            }`}
                          >
                            {sdImageMap[img.id] ? (
                              <img
                                src={sdImageMap[img.id]}
                                alt={img.filename}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[8px] font-mono">
                                JPG
                              </div>
                            )}
                            <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[7px] font-mono text-slate-200 truncate px-1">
                              {img.filename.replace('.JPG', '')}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-[8px] font-mono text-slate-400 mb-1">
                      1×CLICK: VIEW · 2×CLICK: BACK
                    </div>
                  </>
                ) : (
                  /* FULLSCREEN 240x240 SD PHOTO VIEWER */
                  <div className="absolute inset-0">
                    {state.sdImages[state.galleryIndex] &&
                      sdImageMap[state.sdImages[state.galleryIndex].id] && (
                        <img
                          src={sdImageMap[state.sdImages[state.galleryIndex].id]}
                          alt={state.sdImages[state.galleryIndex].filename}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}
                    {state.galleryShowExif &&
                      state.sdImages[state.galleryIndex] && (() => {
                        const curImg = state.sdImages[state.galleryIndex];
                        return (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-4 pb-3 px-6 text-center z-20">
                            <div className="text-[10px] font-mono font-bold text-emerald-300 truncate">
                              {curImg.filename} ({state.galleryIndex + 1}/{state.sdImages.length})
                            </div>
                            <div className="text-[8px] font-mono text-slate-300">
                              {curImg.resolution} · {curImg.sizeKB}KB · {curImg.filter}
                            </div>
                            {/* Speak What It Is action */}
                            {onSpeakDetection && (
                              <button
                                type="button"
                                onClick={() => {
                                  const text =
                                    curImg.aiDetection?.speechText ||
                                    `Target identified in photo ${curImg.filename}: ${curImg.sceneName} captured with ${curImg.filter} filter.`;
                                  onSpeakDetection(text);
                                }}
                                className="mt-1 px-2 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400 text-cyan-200 text-[8px] font-mono flex items-center justify-center gap-1 mx-auto cursor-pointer shadow"
                              >
                                <Volume2 className="w-2.5 h-2.5 text-cyan-300" />
                                <span>{isSpeaking ? 'SPEAKING...' : 'SPEAK WHAT IT IS'}</span>
                              </button>
                            )}
                            <div className="text-[7px] font-mono text-cyan-300/80 mt-0.5">
                              ROTATE: NEXT/PREV · 2×CLICK: GRID
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                )}
              </div>
            )}

            {/* ==================== SCREEN 4B: I2S MUSIC PLAYER (SD MP3 + WAV + 4-CH SYNTH) ==================== */}
            {state.screen === 'MUSIC' && (() => {
              const trackList =
                state.musicTracks && state.musicTracks.length > 0
                  ? state.musicTracks
                  : MUSIC_TRACKS;
              const curTrack =
                trackList[state.musicTrackIndex] ?? trackList[0];
              const curCtrl =
                MUSIC_CONTROLS[state.musicControlIndex] ?? MUSIC_CONTROLS[0];
              const progressRatio = Math.min(
                1,
                Math.max(0, state.musicElapsedSec / Math.max(1, curTrack.durationSec))
              );
              const progressCircumference = 2 * Math.PI * 112;
              const progressDash = progressRatio * progressCircumference;
              const vinylAngle = state.musicPlaying
                ? (animTickMs * 0.12) % 360
                : (state.musicElapsedSec * 25) % 360;

              const fmtTime = (sec: number) => {
                const m = Math.floor(sec / 60);
                const s = Math.floor(sec % 60);
                return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
              };

              const codecLabel =
                curTrack.source === 'SD_MMC_MP3'
                  ? `MP3 ${curTrack.kbps}k`
                  : curTrack.source === 'SD_MMC_WAV'
                  ? 'SD WAV'
                  : 'SYNTH';

              return (
                <div className="relative w-full h-full flex flex-col items-center justify-between py-4 px-5 bg-[#060912]">
                  {/* Circular Track Progress Ring SVG */}
                  <svg
                    viewBox="0 0 240 240"
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  >
                    <circle
                      cx="120"
                      cy="120"
                      r="112"
                      fill="none"
                      stroke="rgba(30, 41, 59, 0.85)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="120"
                      cy="120"
                      r="112"
                      fill="none"
                      stroke={curTrack.accentColor}
                      strokeWidth="2.5"
                      strokeDasharray={`${progressDash.toFixed(1)} ${progressCircumference.toFixed(1)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 120 120)"
                    />
                  </svg>

                  {/* Top Arc Status & Source Telemetry */}
                  <div className="text-center z-20 mt-1">
                    <div className="text-[8px] font-mono text-pink-400 uppercase tracking-wider font-bold">
                      I2S MUSIC · VOL {state.musicVolumePct}% · EQ:{state.musicEqPreset}
                    </div>
                    <div className="text-[8px] font-mono text-slate-300 mt-0.5">
                      TRK 0{state.musicTrackIndex + 1}/0{trackList.length}{' '}
                      <span className="text-cyan-300">
                        [{codecLabel}]
                      </span>
                    </div>
                  </div>

                  {/* Center Vinyl Record Disc + Track Metadata */}
                  <div className="w-full max-w-[196px] flex items-center gap-2.5 z-20 my-auto px-1">
                    {/* Spinning Vinyl Record */}
                    <div
                      style={{
                        transform: `rotate(${vinylAngle.toFixed(1)}deg)`,
                        borderColor: curTrack.accentColor,
                      }}
                      className="relative w-14 h-14 rounded-full bg-slate-950 border-2 flex items-center justify-center shrink-0 shadow-lg"
                    >
                      <div className="absolute inset-1.5 rounded-full border border-slate-800" />
                      <div className="absolute inset-3 rounded-full border border-slate-700/70" />
                      {/* Vinyl groove reflection bars */}
                      <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-white/25 to-transparent rotate-45" />
                      <div
                        style={{ backgroundColor: curTrack.accentColor }}
                        className="w-5 h-5 rounded-full flex items-center justify-center shadow-inner"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      </div>
                    </div>

                    {/* Track Title, Artist & Elapsed Time */}
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-[10px] font-bold text-white truncate leading-tight">
                        {curTrack.title}
                      </div>
                      <div className="text-[8px] font-mono text-slate-400 truncate mt-0.5">
                        {curTrack.artist}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[8px] font-mono">
                        <span
                          className={
                            state.musicPlaying
                              ? 'text-emerald-400 font-bold'
                              : 'text-amber-300'
                          }
                        >
                          {state.musicPlaying ? '▶ PLAY' : '❚❚ PAUSE'}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="text-cyan-300 tabular-nums">
                          {fmtTime(state.musicElapsedSec)}/{fmtTime(curTrack.durationSec)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 16-Band Real-Time I2S Spectrum Visualizer */}
                  <div className="w-36 h-7 flex items-end justify-between gap-0.5 px-1 z-20">
                    {Array.from({ length: 16 }).map((_, bandIdx) => {
                      const wave = state.musicPlaying
                        ? Math.abs(
                            Math.sin(
                              animTickMs * 0.011 +
                                bandIdx * 0.55 +
                                state.musicTrackIndex
                            ) *
                              0.65 +
                              Math.cos(animTickMs * 0.019 - bandIdx * 0.3) * 0.35
                          )
                        : 0.14;
                      const eqBoost =
                        state.musicEqPreset === 'BASS_BOOST' && bandIdx < 5
                          ? 1.25
                          : state.musicEqPreset === 'CHIPTUNE' && bandIdx > 10
                          ? 1.25
                          : 1.0;
                      const heightPct = Math.min(
                        100,
                        Math.max(14, Math.round(wave * eqBoost * 100))
                      );
                      return (
                        <div
                          key={bandIdx}
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor:
                              bandIdx % 3 === 0
                                ? curTrack.accentColor
                                : bandIdx % 2 === 0
                                ? '#22d3ee'
                                : '#a855f7',
                          }}
                          className="flex-1 rounded-t-xs transition-all duration-75"
                        />
                      );
                    })}
                  </div>

                  {/* Bottom EC11 Rotary Control Pill & Hint */}
                  <div className="flex flex-col items-center gap-0.5 z-20 mb-0.5">
                    <button
                      type="button"
                      onClick={() => onRotaryEvent('SINGLE_CLICK')}
                      style={{
                        backgroundColor: curTrack.accentColor,
                      }}
                      className="px-3 py-0.5 rounded-full text-slate-950 font-mono font-bold text-[8px] shadow-md hover:brightness-110 cursor-pointer whitespace-nowrap"
                    >
                      [{curCtrl.label}] · CLICK
                    </button>
                    <div className="text-[7px] font-mono text-slate-400">
                      ROT: CTRL · 1×: EXEC · 2×: BACK
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ==================== SCREEN 5: WIFI & MJPEG SERVER ==================== */}
            {state.screen === 'WIFI' && (
              <div className="relative w-full h-full flex flex-col items-center justify-between py-5 px-6 bg-[#070b14]">
                <div className="text-center mt-1">
                  <div className="text-[9px] font-mono text-blue-400 uppercase tracking-wider">
                    ESP32-S3 2.4GHz WiFi
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">
                    {state.wifiEnabled
                      ? 'IP: 192.168.4.108'
                      : 'RADIO DISABLED'}
                  </div>
                </div>

                {/* Circular-safe list of WiFi controls & APs */}
                <div className="w-full max-w-[176px] flex flex-col gap-1 my-auto">
                  {/* Row 0: WiFi Radio Toggle */}
                  <div
                    className={`flex items-center justify-between px-2.5 py-1 rounded text-[9px] font-mono border ${
                      state.wifiCursor === 0
                        ? 'bg-blue-500/25 border-blue-400 text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>WiFi STA+AP</span>
                    <span
                      className={
                        state.wifiEnabled ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {state.wifiEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  {/* Row 1: HandyCam MJPEG HTTP Stream Server */}
                  <div
                    className={`flex items-center justify-between px-2.5 py-1 rounded text-[9px] font-mono border ${
                      state.wifiCursor === 1
                        ? 'bg-blue-500/25 border-blue-400 text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>:81/stream</span>
                    <span
                      className={
                        state.mjpegServerEnabled
                          ? 'text-cyan-300'
                          : 'text-slate-500'
                      }
                    >
                      {state.mjpegServerEnabled ? 'LIVE' : 'STOP'}
                    </span>
                  </div>

                  {/* Discovered Networks */}
                  {state.wifiNetworks.slice(0, 3).map((net, idx) => {
                    const rowIdx = idx + 2;
                    const isFocused = state.wifiCursor === rowIdx;
                    return (
                      <div
                        key={net.ssid}
                        className={`flex items-center justify-between px-2.5 py-1 rounded text-[8px] font-mono border ${
                          isFocused
                            ? 'bg-blue-500/25 border-blue-400 text-white'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <span className="truncate max-w-[105px] flex items-center gap-1">
                          {net.connected ? (
                            <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-2 h-2 text-slate-500 shrink-0" />
                          )}
                          {net.ssid}
                        </span>
                        <span className="text-slate-300">{net.rssi}dB</span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[8px] font-mono text-slate-400 mb-1">
                  1×CLICK: TOGGLE · 2×CLICK: BACK
                </div>
              </div>
            )}

            {/* ==================== SCREEN 6: BLUETOOTH (BLE 5.0) ==================== */}
            {state.screen === 'BLUETOOTH' && (
              <div className="relative w-full h-full flex flex-col items-center justify-between py-5 px-6 bg-[#070b14]">
                <div className="text-center mt-1">
                  <div className="text-[9px] font-mono text-violet-400 uppercase tracking-wider">
                    BLE 5.0 GATT & HID
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">
                    SHUTTER PULSES: {state.bleShutterCount}
                  </div>
                </div>

                <div className="w-full max-w-[176px] flex flex-col gap-1 my-auto">
                  {/* Row 0: BLE Toggle */}
                  <div
                    className={`flex items-center justify-between px-2.5 py-1 rounded text-[9px] font-mono border ${
                      state.bleCursor === 0
                        ? 'bg-violet-500/25 border-violet-400 text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>BLE 5.0 Radio</span>
                    <span
                      className={
                        state.bleEnabled ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {state.bleEnabled ? 'ADV ON' : 'OFF'}
                    </span>
                  </div>

                  {/* Row 1: BLE HID Remote Shutter */}
                  <div
                    className={`flex items-center justify-between px-2.5 py-1 rounded text-[9px] font-mono border ${
                      state.bleCursor === 1
                        ? 'bg-violet-500/25 border-violet-400 text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>HID Cam Trigger</span>
                    <span className="text-amber-300">FIRE</span>
                  </div>

                  {/* Paired BLE Peripherals */}
                  {state.bleDevices.map((dev, idx) => {
                    const rowIdx = idx + 2;
                    const isFocused = state.bleCursor === rowIdx;
                    return (
                      <div
                        key={dev.id}
                        className={`flex items-center justify-between px-2.5 py-1 rounded text-[8px] font-mono border ${
                          isFocused
                            ? 'bg-violet-500/25 border-violet-400 text-white'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <span className="truncate max-w-[110px]">
                          {dev.name}
                        </span>
                        <span
                          className={
                            dev.connected
                              ? 'text-emerald-400'
                              : 'text-slate-500'
                          }
                        >
                          {dev.connected ? 'PAIR' : 'IDLE'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[8px] font-mono text-slate-400 mb-1">
                  1×CLICK: ACTION · 2×CLICK: BACK
                </div>
              </div>
            )}

            {/* ==================== SCREEN 7: 240x240 CIRCULAR GAMES ==================== */}
            {state.screen === 'GAMES' && (
              <div className="relative w-full h-full flex flex-col items-center justify-between bg-[#060912]">
                {state.gameMode === 'SELECT' ? (
                  <div className="w-full h-full flex flex-col items-center justify-between py-5 px-6 text-center">
                    <div className="mt-1">
                      <div className="text-[9px] font-mono text-amber-400 uppercase tracking-wider">
                        GC9A01 ROTARY ARCADE
                      </div>
                      <div className="text-[9px] font-mono text-slate-400">
                        HIGH SCORE: {state.gameBestScore}
                      </div>
                    </div>

                    <div className="w-full max-w-[172px] flex flex-col gap-1 my-auto">
                      <button
                        type="button"
                        onClick={() => onRotaryEvent('SINGLE_CLICK')}
                        className={`px-2 py-1 rounded-lg border text-left transition-all cursor-pointer ${
                          state.selectedGame === 'ORBITAL_BREAKER'
                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[8px] font-mono font-bold flex items-center justify-between">
                          <span>01. Orbit Breaker</span>
                          <Disc className="w-2.5 h-2.5 text-cyan-400" />
                        </div>
                        <div className="text-[7px] text-slate-300">
                          360° Rotary Paddle Brick Pong
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRotaryEvent('SINGLE_CLICK')}
                        className={`px-2 py-1 rounded-lg border text-left transition-all cursor-pointer ${
                          state.selectedGame === 'RADAR_DEFENSE'
                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[8px] font-mono font-bold flex items-center justify-between">
                          <span>02. Radar Defense</span>
                          <Radio className="w-2.5 h-2.5 text-amber-400" />
                        </div>
                        <div className="text-[7px] text-slate-300">
                          360° Rotary Turret Space Shooter
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRotaryEvent('SINGLE_CLICK')}
                        className={`px-2 py-1 rounded-lg border text-left transition-all cursor-pointer ${
                          state.selectedGame === 'CYBER_TUNNEL'
                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[8px] font-mono font-bold flex items-center justify-between">
                          <span>03. Cyber Tunnel</span>
                          <Sparkles className="w-2.5 h-2.5 text-violet-400" />
                        </div>
                        <div className="text-[7px] text-slate-300">
                          360° Polar Vortex Gate Runner
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRotaryEvent('SINGLE_CLICK')}
                        className={`px-2 py-1 rounded-lg border text-left transition-all cursor-pointer ${
                          state.selectedGame === 'FLAPPY_BIRD'
                            ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[8px] font-mono font-bold flex items-center justify-between">
                          <span>04. Flappy Bird</span>
                          <Gamepad2 className="w-2.5 h-2.5 text-emerald-400" />
                        </div>
                        <div className="text-[7px] text-slate-300">
                          1×Click / Rotate Pipe Flyer
                        </div>
                      </button>
                    </div>

                    <div className="text-[8px] font-mono text-amber-300 mb-1">
                      1×CLICK: START · 2×CLICK: BACK
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <canvas
                      ref={gameCanvasRef}
                      width={240}
                      height={240}
                      className="w-full h-full block"
                    />
                    <div className="absolute bottom-5 inset-x-0 text-center pointer-events-none">
                      <span className="px-2 py-0.5 rounded-full bg-slate-950/85 border border-slate-800 text-[8px] font-mono text-amber-300">
                        ROT: AIM · 1×: PULSE · 2×: EXIT
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Watch Strap Lug */}
      <div className="w-28 h-5 bg-gradient-to-t from-slate-800 to-slate-900 rounded-b-lg border-x border-b border-slate-700/80" />
    </div>
  );
};
