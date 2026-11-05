import React from 'react';
import {
  WatchState,
  WatchScreenId,
  CameraScene,
  CameraFilter,
  CAMERA_SCENES,
  CAMERA_FILTERS,
  MUSIC_TRACKS,
  MusicEqPreset,
  MUSIC_EQ_PRESETS,
  HardwareLogEntry,
} from '../watch/watchStateMachine';
import {
  Camera,
  HardDrive,
  Trash2,
  Eye,
  Video,
  Download,
  Terminal,
  Sparkles,
  Volume2,
  VolumeX,
  Scan,
  RefreshCw,
  AudioLines,
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Upload,
} from 'lucide-react';

interface HardwarePeripheralPanelProps {
  state: WatchState;
  onJumpToScreen: (screen: WatchScreenId) => void;
  onSelectCameraScene: (scene: CameraScene) => void;
  onSelectCameraFilter: (filter: CameraFilter) => void;
  onToggleWebcamLive: () => void;
  webcamActive: boolean;
  webcamError: string | null;
  onViewSdImageOnWatch: (index: number) => void;
  onDeleteSdImage: (id: string) => void;
  onTriggerAIDetect: () => void;
  onSpeakDetection: (text?: string) => void;
  onToggleMute: () => void;
  onChangeVoiceSpeed: (speed: number) => void;
  onToggleMusicPlay: () => void;
  onSelectMusicTrack: (index: number) => void;
  onStepMusicTrack: (delta: number) => void;
  onChangeMusicVolume: (volPct: number) => void;
  onChangeMusicEq: (eq: MusicEqPreset) => void;
  onUploadAudioFile: (file: File) => void;
  isSpeaking: boolean;
  logs: HardwareLogEntry[];
}

const ALL_SCREENS: { id: WatchScreenId; label: string }[] = [
  { id: 'HOME', label: 'Home Watch' },
  { id: 'MENU', label: 'Radial Menu' },
  { id: 'CAMERA', label: 'HandyCam' },
  { id: 'GALLERY', label: 'SD Gallery' },
  { id: 'MUSIC', label: 'I2S Music' },
  { id: 'WIFI', label: 'WiFi & RTSP' },
  { id: 'BLUETOOTH', label: 'BLE 5.0' },
  { id: 'GAMES', label: '240×240 Games' },
];

export const HardwarePeripheralPanel: React.FC<HardwarePeripheralPanelProps> = ({
  state,
  onJumpToScreen,
  onSelectCameraScene,
  onSelectCameraFilter,
  onToggleWebcamLive,
  webcamActive,
  webcamError,
  onViewSdImageOnWatch,
  onDeleteSdImage,
  onTriggerAIDetect,
  onSpeakDetection,
  onToggleMute,
  onChangeVoiceSpeed,
  onToggleMusicPlay,
  onSelectMusicTrack,
  onStepMusicTrack,
  onChangeMusicVolume,
  onChangeMusicEq,
  onUploadAudioFile,
  isSpeaking,
  logs,
}) => {
  const audioInputRef = React.useRef<HTMLInputElement | null>(null);
  const trackList =
    state.musicTracks && state.musicTracks.length > 0
      ? state.musicTracks
      : MUSIC_TRACKS;
  const usedKB = state.sdImages.reduce((acc, item) => acc + item.sizeKB, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Quick Watch Screen Matrix & Active Screen Telemetry */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              GC9A01 Screen State & Quick Jump
            </h2>
            <p className="text-xs text-slate-400">
              Navigate via EC11 Rotary Switch or jump directly to inspect any screen
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400">
            STATE: {state.screen}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_SCREENS.map((scr) => {
            const active = state.screen === scr.id;
            return (
              <button
                key={scr.id}
                type="button"
                onClick={() => onJumpToScreen(scr.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                {scr.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Connected Camera (ESP32-S3 OV2640 / HandyCam Feed Bench) */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                ESP32-S3 OV2640 HandyCam Stream Source
              </h2>
              <p className="text-xs text-slate-400">
                DVP 8-Bit Camera Bus · 240×240 RGB565 DMA Viewfinder + JPEG Encoder
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleWebcamLive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              webcamActive
                ? 'bg-rose-500/20 border border-rose-500/50 text-rose-200'
                : 'bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-400/60'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            <span>{webcamActive ? 'Stop Browser Webcam' : 'Connect Real Webcam'}</span>
          </button>
        </div>

        {webcamError && (
          <div className="text-xs font-mono text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-lg px-3 py-2">
            Webcam note: {webcamError} (Using simulated OV2640 hardware feed)
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              SENSOR SCENE FEED
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {CAMERA_SCENES.map((scene) => (
                <button
                  key={scene}
                  type="button"
                  onClick={() => onSelectCameraScene(scene)}
                  className={`px-2.5 py-1.5 rounded text-xs font-mono text-left transition-colors cursor-pointer whitespace-nowrap truncate ${
                    state.cameraScene === scene
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200 font-semibold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {scene}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              OV2640 ISP PIPELINE FILTER
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {CAMERA_FILTERS.map((flt) => (
                <button
                  key={flt}
                  type="button"
                  onClick={() => onSelectCameraFilter(flt)}
                  className={`px-2.5 py-1.5 rounded text-xs font-mono text-left transition-colors cursor-pointer whitespace-nowrap truncate ${
                    state.cameraFilter === flt
                      ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-200 font-semibold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {flt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ESP32-S3 AI VISION DETECTION & I2S SPEECH SYNTHESIS DECK */}
      {/* ===================================================================== */}
      <div className="bg-[#111827] border border-cyan-500/30 rounded-xl p-5 flex flex-col gap-4 shadow-lg shadow-cyan-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-white">
                  ESP32-S3 Local AI Vision & I2S Speech Deck
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/40">
                  100% LOCAL · ZERO INTERNET
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40">
                  TFLITE MICRO / ESP-DL INT8
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Xtensa LX7 Vector SIMD (PIE) on-chip inference (~78ms, 384KB PSRAM) & MAX98357A I2S speaker (Air-Gapped, WiFi OFF)
              </p>
            </div>
          </div>

          {/* Voice Controls: Mute/Unmute & Voice Speed */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleMute}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                state.ttsMuted
                  ? 'bg-rose-950/50 border-rose-700/80 text-rose-300'
                  : 'bg-emerald-950/50 border-emerald-600/60 text-emerald-300'
              }`}
              title={state.ttsMuted ? 'Unmute I2S Audio Speaker' : 'Mute I2S Audio Speaker'}
            >
              {state.ttsMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>SPEAKER MUTED</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>I2S AUDIO ON</span>
                </>
              )}
            </button>

            {/* Voice Speed Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
              {[0.8, 1.0, 1.2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onChangeVoiceSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                    state.ttsVoiceSpeed === spd
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Identification Result Card */}
        {state.aiDetectionResult ? (
          <div className="bg-[#090D16] border border-cyan-500/20 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                    {state.aiDetectionResult.category}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-700/50 px-1.5 py-0.5 rounded">
                    {state.aiDetectionResult.confidencePct}% CONFIDENCE
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{state.aiDetectionResult.primaryLabel}</span>
                  {state.aiDetecting && (
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  )}
                </h3>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded font-bold whitespace-nowrap">
                  ON-CHIP: {state.aiDetectionResult.inferenceTimeMs || 78}ms
                </span>
                <span className="text-[9px] font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 whitespace-nowrap">
                  {state.aiDetectionResult.tensorArenaKB || 384}KB PSRAM · 0 KB NET
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {state.aiDetectionResult.summary}
            </p>

            {/* Spoken Text Transcript & Waveform Animation */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <AudioLines className={`w-3.5 h-3.5 ${isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                  <span>I2S SPEAKER VOICE TRANSCRIPT</span>
                </span>
                {isSpeaking && (
                  <span className="text-emerald-400 font-bold animate-pulse text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    PLAYING AUDIO...
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-cyan-200 italic bg-black/30 p-2 rounded border border-slate-800/80">
                "{state.aiDetectionResult.speechText}"
              </p>
            </div>

            {/* Key Visual Features Observed */}
            {state.aiDetectionResult.details && state.aiDetectionResult.details.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {state.aiDetectionResult.details.map((feat, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#090D16] border border-slate-800 rounded-xl p-6 text-center text-xs font-mono text-slate-400">
            No object analyzed yet. Click "Scan & Identify Camera Frame" below or use the EC11 Rotary knob on the watch.
          </div>
        )}

        {/* Action Trigger Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onTriggerAIDetect}
            disabled={state.aiDetecting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer shadow-md ${
              state.aiDetecting
                ? 'bg-cyan-600/50 text-cyan-200 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 active:scale-95'
            }`}
          >
            {state.aiDetecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>ANALYZING OV2640 FRAME...</span>
              </>
            ) : (
              <>
                <Scan className="w-3.5 h-3.5" />
                <span>SCAN & IDENTIFY CAMERA VIEW</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSpeakDetection()}
            disabled={!state.aiDetectionResult || isSpeaking}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer ${
              isSpeaking
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 hover:border-emerald-400 active:scale-95'
            }`}
          >
            <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-slate-950' : 'text-emerald-400'}`} />
            <span>{isSpeaking ? 'SPEAKING VIA I2S...' : 'SPEAK WHAT IT IS (I2S SPEAKER)'}</span>
          </button>
        </div>

        {/* Hardware Wiring Reference */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <div className="text-slate-500">I2S_BCLK</div>
            <div className="text-cyan-300 font-bold">GPIO 48</div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <div className="text-slate-500">I2S_LRC / WS</div>
            <div className="text-cyan-300 font-bold">GPIO 45</div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <div className="text-slate-500">I2S_DOUT / DIN</div>
            <div className="text-cyan-300 font-bold">GPIO 2</div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <div className="text-slate-500">AUDIO DAC</div>
            <div className="text-emerald-300 font-bold">MAX98357A (16kHz)</div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ESP32-S3 I2S MUSIC PLAYER DECK (/sdcard/MUSIC .MP3 + .WAV + SYNTH) */}
      {/* ===================================================================== */}
      <div className="bg-[#111827] border border-pink-500/30 rounded-xl p-5 flex flex-col gap-4 shadow-lg shadow-pink-950/10">
        <input
          ref={audioInputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUploadAudioFile(file);
              e.target.value = '';
            }
          }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400">
              <Music className="w-4 h-4 text-pink-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-white">
                  ESP32-S3 I2S Music Player (.MP3 + .WAV + 4-Ch Synth)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 font-bold border border-rose-400/40">
                  HELIX MP3 + ID3v2
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-pink-500/20 text-pink-300 font-bold border border-pink-400/40">
                  16 kHz STEREO DMA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Scans <code className="text-cyan-300">/sdcard/MUSIC/*.mp3</code> & <code className="text-cyan-300">*.wav</code> (ID3v2 title/artist + Helix MP3 decoder in <code className="text-cyan-300">music_player.h</code>)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-pink-500/50 text-pink-200 text-xs font-mono cursor-pointer"
              title="Mount a local .MP3 or .WAV file into virtual /sdcard/MUSIC"
            >
              <Upload className="w-3.5 h-3.5 text-pink-400" />
              <span>Load .MP3 / .WAV</span>
            </button>
            <button
              type="button"
              onClick={() => onStepMusicTrack(-1)}
              aria-label="Previous Track"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleMusicPlay}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                state.musicPlaying
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-pink-500 hover:bg-pink-400 text-slate-950'
              }`}
            >
              {state.musicPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>PAUSE I2S</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>PLAY TRACK</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onStepMusicTrack(1)}
              aria-label="Next Track"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tracklist Selector + Volume & EQ Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-7 flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
            {trackList.map((trk, idx) => {
              const isSelected = state.musicTrackIndex === idx;
              const badge =
                trk.source === 'SD_MMC_MP3'
                  ? `MP3 ${trk.kbps}k`
                  : trk.source === 'SD_MMC_WAV'
                  ? 'SD WAV'
                  : 'SYNTH';
              return (
                <button
                  key={trk.id}
                  type="button"
                  onClick={() => onSelectMusicTrack(idx)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-pink-500/15 border-pink-400 text-white'
                      : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate flex items-center gap-2">
                    <span
                      style={{ backgroundColor: trk.accentColor }}
                      className="w-2 h-2 rounded-full shrink-0"
                    />
                    <span className="font-semibold truncate">{trk.title}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {trk.bpm} BPM · {badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="sm:col-span-5 bg-[#090D16] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-400">I2S DIGITAL GAIN</span>
                <span className="text-pink-400 font-bold">{state.musicVolumePct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[30, 50, 75, 100].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onChangeMusicVolume(v)}
                    className={`flex-1 py-1 rounded text-xs font-mono border cursor-pointer ${
                      state.musicVolumePct === v
                        ? 'bg-pink-500 text-slate-950 border-pink-400 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-400">DSP BIQUAD EQ PRESET</span>
                <span className="text-cyan-300 font-bold">{state.musicEqPreset}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MUSIC_EQ_PRESETS.map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => onChangeMusicEq(eq)}
                    className={`py-1 px-1.5 rounded text-[10px] font-mono border cursor-pointer truncate ${
                      state.musicEqPreset === eq
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MicroSD Card (/sdcard/DCIM) Live File System Browser */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                SD_MMC Card Filesystem (/sdcard/DCIM)
              </h2>
              <p className="text-xs text-slate-400">
                Captured HandyCam 240×240 JPEGs stored on virtual FAT32 volume
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs tabular-nums">
            <span className="text-emerald-400 font-semibold">
              {state.sdImages.length} FILES
            </span>
            <span className="text-slate-500 mx-1.5">·</span>
            <span className="text-slate-300">{usedKB} KB USED</span>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80 max-h-52 overflow-y-auto pr-1">
          {state.sdImages.map((img, idx) => (
            <div
              key={img.id}
              className="py-2 flex items-center justify-between gap-3 text-xs font-mono"
            >
              <div className="min-w-0">
                <div className="text-slate-200 font-medium truncate">
                  {img.path}
                </div>
                <div className="text-[11px] text-slate-400">
                  {img.timestamp} · {img.resolution} · {img.sizeKB} KB · {img.filter}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  aria-label={`Open ${img.filename} on Watch`}
                  onClick={() => onViewSdImageOnWatch(idx)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open on Watch</span>
                </button>
                {img.dataUrl && (
                  <a
                    href={img.dataUrl}
                    download={img.filename}
                    aria-label={`Download ${img.filename}`}
                    className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300"
                    title="Download captured JPEG"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  aria-label={`Delete ${img.filename}`}
                  onClick={() => onDeleteSdImage(img.id)}
                  className="p-1.5 rounded bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700 text-slate-400 hover:text-rose-300 cursor-pointer"
                  title="Delete from SD card"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hardware Interrupt & State Transition Bus Log */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>ESP32-S3 UART0 SERIAL MONITOR (115200 BAUD)</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            ISR + FSM TRACE
          </span>
        </div>
        <div className="bg-[#07090E] border border-slate-800/90 rounded-lg p-2.5 font-mono text-[11px] space-y-1 max-h-28 overflow-y-auto">
          {logs.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-2 text-slate-300"
            >
              <span className="truncate">
                <span className="text-slate-500">[{entry.time}]</span>{' '}
                <span className="text-cyan-400 font-semibold">
                  {entry.event}
                </span>{' '}
                <span>{entry.detail}</span>
              </span>
              <span className="text-slate-400 shrink-0">{entry.screen}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
