import { CameraFilter, CameraScene, SDCardImage } from './watchStateMachine';

export interface RenderCameraFrameOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scene: CameraScene;
  filter: CameraFilter;
  zoom: number;
  exposure: number;
  timeSec: number;
  seedHue?: number;
  liveVideo?: HTMLVideoElement | null;
}

/**
 * Renders a 240x240 frame simulating the ESP32-S3 OV2640 DVP Camera sensor
 * (or draws from a live connected browser webcam if selected and ready).
 */
export function renderOV2640Frame({
  ctx,
  width,
  height,
  scene,
  filter,
  zoom,
  exposure,
  timeSec,
  seedHue = 190,
  liveVideo,
}: RenderCameraFrameOptions): void {
  ctx.save();

  // Apply digital zoom around center (120, 120)
  const cx = width / 2;
  const cy = height / 2;
  ctx.translate(cx, cy);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);

  if (
    scene === 'WEBCAM_LIVE' &&
    liveVideo &&
    liveVideo.readyState >= 2 &&
    liveVideo.videoWidth > 0
  ) {
    // Center-crop square 240x240 from live webcam stream
    const vw = liveVideo.videoWidth;
    const vh = liveVideo.videoHeight;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;
    ctx.drawImage(liveVideo, sx, sy, side, side, 0, 0, width, height);
  } else if (scene === 'LAB_BENCH') {
    // Electronics Lab Bench Scene: Oscilloscope, ESP32-S3 DevKit PCB, Soldering Station
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, `hsl(${seedHue}, 38%, 14%)`);
    bgGrad.addColorStop(0.55, `hsl(${(seedHue + 20) % 360}, 32%, 22%)`);
    bgGrad.addColorStop(1, `hsl(${seedHue}, 25%, 12%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Workbench perspective grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 1;
    for (let y = 130; y < height; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = -40; x <= width + 40; x += 28) {
      ctx.beginPath();
      ctx.moveTo(cx + (x - cx) * 0.35, 130);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Background Oscilloscope / Logic Analyzer screen
    ctx.fillStyle = '#09131c';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(42, 38, 156, 74);
    ctx.strokeRect(42, 38, 156, 74);

    // Animated sine + square wave on bench scope
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let px = 46; px < 194; px += 2) {
      const waveY =
        75 +
        Math.sin((px - 46) * 0.09 + timeSec * 4.2) * 18 *
          Math.cos(timeSec * 0.8 + (px - 46) * 0.02);
      if (px === 46) ctx.moveTo(px, waveY);
      else ctx.lineTo(px, waveY);
    }
    ctx.stroke();

    // Foreground simulated hardware target (rotating robotic servo arm / PCB module)
    const targetX = cx + Math.sin(timeSec * 1.4) * 26;
    const targetY = 158 + Math.cos(timeSec * 2.1) * 6;
    ctx.fillStyle = '#0f766e';
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 1.5;
    ctx.fillRect(targetX - 34, targetY - 18, 68, 36);
    ctx.strokeRect(targetX - 34, targetY - 18, 68, 36);

    // Gold GPIO pins & camera lens on the target board
    ctx.fillStyle = '#fbbf24';
    for (let i = -26; i <= 26; i += 8) {
      ctx.fillRect(targetX + i - 2, targetY - 16, 4, 4);
      ctx.fillRect(targetX + i - 2, targetY + 12, 4, 4);
    }
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(targetX, targetY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();
  } else if (scene === 'OUTDOOR_DRONE') {
    // Aerial Horizon & Telemetry Field Scene
    const pitchOffset = Math.sin(timeSec * 1.1) * 14;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, cy + pitchOffset);
    skyGrad.addColorStop(0, '#0c4a6e');
    skyGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, cy + pitchOffset);

    const groundGrad = ctx.createLinearGradient(0, cy + pitchOffset, 0, height);
    groundGrad.addColorStop(0, '#065f46');
    groundGrad.addColorStop(1, '#022c22');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, cy + pitchOffset, width, height - (cy + pitchOffset));

    // Sun / Beacon orb
    const sunX = 165 + Math.cos(timeSec * 0.5) * 18;
    const sunY = 64 + pitchOffset * 0.4;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 16, 0, Math.PI * 2);
    ctx.fill();

    // Mountain / Ridge silhouette
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, cy + pitchOffset);
    ctx.lineTo(45, cy + pitchOffset - 28);
    ctx.lineTo(95, cy + pitchOffset - 8);
    ctx.lineTo(148, cy + pitchOffset - 36);
    ctx.lineTo(205, cy + pitchOffset - 12);
    ctx.lineTo(width, cy + pitchOffset);
    ctx.closePath();
    ctx.fill();

    // Moving rover / vehicle target on terrain
    const roverX = ((timeSec * 32) % 180) + 30;
    const roverY = cy + pitchOffset + 38;
    ctx.fillStyle = '#f97316';
    ctx.fillRect(roverX - 12, roverY - 7, 24, 14);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(roverX - 16, roverY - 11, 32, 22);
  } else {
    // NIGHT_PATROL / Security IR Corridor Scene
    ctx.fillStyle = '#050e0a';
    ctx.fillRect(0, 0, width, height);

    // Corridor depth rings
    for (let i = 1; i <= 5; i++) {
      const r = i * 24 + ((timeSec * 18) % 24);
      ctx.strokeStyle = `rgba(16, 185, 129, ${0.45 - i * 0.07})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Moving heat/IR beacon signatures
    for (let b = 0; b < 3; b++) {
      const ang = timeSec * (0.9 + b * 0.4) + b * 2.1;
      const dist = 32 + b * 24;
      const bx = cx + Math.cos(ang) * dist;
      const by = cy + Math.sin(ang) * dist;
      const radGrad = ctx.createRadialGradient(bx, by, 2, bx, by, 18);
      radGrad.addColorStop(0, '#ecfdf5');
      radGrad.addColorStop(0.4, '#34d399');
      radGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(bx, by, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  // Apply Exposure EV bias & ISP Filter overlay
  if (exposure !== 0) {
    ctx.fillStyle =
      exposure > 0
        ? `rgba(255, 255, 255, ${exposure * 0.11})`
        : `rgba(0, 0, 0, ${Math.abs(exposure) * 0.22})`;
    ctx.fillRect(0, 0, width, height);
  }

  if (filter === 'IR_NIGHT') {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.26)';
    ctx.fillRect(0, 0, width, height);
    // Scanlines
    ctx.fillStyle = 'rgba(0, 20, 10, 0.28)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
  } else if (filter === 'THERMAL') {
    const thermGrad = ctx.createRadialGradient(cx, cy, 12, cx, cy, 120);
    thermGrad.addColorStop(0, 'rgba(253, 224, 71, 0.28)');
    thermGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.30)');
    thermGrad.addColorStop(1, 'rgba(88, 28, 135, 0.42)');
    ctx.fillStyle = thermGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (filter === 'CYBER_EDGE') {
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 78, 0, Math.PI * 2);
    ctx.moveTo(cx - 90, cy);
    ctx.lineTo(cx + 90, cy);
    ctx.moveTo(cx, cy - 90);
    ctx.lineTo(cx, cy + 90);
    ctx.stroke();
  }
}

/**
 * Generates a deterministic 240x240 data URL for an SDCardImage entry if it doesn't have one yet.
 */
export function generateSDImageDataUrl(img: SDCardImage): string {
  if (img.dataUrl) return img.dataUrl;
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  renderOV2640Frame({
    ctx,
    width: 240,
    height: 240,
    scene: img.sceneName,
    filter: img.filter,
    zoom: 1,
    exposure: 0,
    timeSec: (img.seedHue % 60) * 0.35 + 1.2,
    seedHue: img.seedHue,
  });

  // Stamp subtle OV2640 SD watermark in bottom arc
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(54, 198, 132, 18);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`ESP32-S3 · ${img.filename}`, 120, 210);

  return canvas.toDataURL('image/jpeg', 0.9);
}
