import React from 'react';
import { RotaryEvent, WatchState } from '../watch/watchStateMachine';
import {
  RotateCcw,
  RotateCw,
  MousePointerClick,
  CornerUpLeft,
} from 'lucide-react';

interface RotarySwitchDeckProps {
  state: WatchState;
  onRotaryEvent: (event: RotaryEvent) => void;
  lastEventLabel: string;
}

export const RotarySwitchDeck: React.FC<RotarySwitchDeckProps> = ({
  state,
  onRotaryEvent,
  lastEventLabel,
}) => {
  const knobRotationDeg = state.encoderPosition * 18;
  // Quadrature Gray code phase derived from encoderPosition % 4
  const phase = ((state.encoderPosition % 4) + 4) % 4;
  const clkHigh = phase === 0 || phase === 1;
  const dtHigh = phase === 1 || phase === 2;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            EC11 Rotary Switch Controller
          </h2>
          <p className="text-xs text-slate-400">
            GPIO 1 (CLK) · GPIO 2 (DT) · GPIO 42 (SW Push Button)
          </p>
        </div>
        <div className="text-right font-mono text-xs">
          <div className="text-cyan-400 tabular-nums">
            DETENT: {state.encoderPosition >= 0 ? `+${state.encoderPosition}` : state.encoderPosition}
          </div>
          <div className="text-[11px] text-slate-400 tabular-nums">
            CLK:{clkHigh ? '1' : '0'} DT:{dtHigh ? '1' : '0'}
          </div>
        </div>
      </div>

      {/* Physical Tactile Rotary Knob + Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Interactive Rotary Dial */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center py-2">
          <div
            onWheel={(e) => {
              e.preventDefault();
              onRotaryEvent(e.deltaY > 0 ? 'CW' : 'CCW');
            }}
            onClick={() => onRotaryEvent('SINGLE_CLICK')}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onRotaryEvent('DOUBLE_CLICK');
            }}
            role="button"
            tabIndex={0}
            aria-label="Interactive EC11 Rotary Encoder Dial"
            title="Scroll to Rotate CW/CCW · Click to Select · Double-Click for Back"
            className="relative w-28 h-28 rounded-full bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border-2 border-slate-600 shadow-xl flex items-center justify-center cursor-pointer hover:border-cyan-400/70 transition-colors select-none"
          >
            {/* Outer knurled ticks */}
            <div
              style={{ transform: `rotate(${knobRotationDeg}deg)` }}
              className="w-22 h-22 rounded-full bg-slate-900 border border-slate-500/80 flex items-center justify-center transition-transform duration-150"
            >
              {/* Position Marker Notch */}
              <div className="absolute top-2 w-1.5 h-4 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              <div className="text-center font-mono">
                <div className="text-[10px] text-slate-400">EC11</div>
                <div className="text-xs font-bold text-slate-200 tabular-nums">
                  { ((knobRotationDeg % 360) + 360) % 360 }°
                </div>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400 mt-2">
            Last ISR: <strong className="text-cyan-300">{lastEventLabel}</strong>
          </span>
        </div>

        {/* 4 Primary Hardware Switch Controls */}
        <div className="sm:col-span-7 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onRotaryEvent('CCW')}
            className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 border border-slate-700 text-slate-100 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Rotate CCW</span>
          </button>

          <button
            type="button"
            onClick={() => onRotaryEvent('CW')}
            className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 border border-slate-700 text-slate-100 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCw className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Rotate CW</span>
          </button>

          <button
            type="button"
            onClick={() => onRotaryEvent('SINGLE_CLICK')}
            className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <MousePointerClick className="w-4 h-4 shrink-0" />
            <span>Single Click (Select)</span>
          </button>

          <button
            type="button"
            onClick={() => onRotaryEvent('DOUBLE_CLICK')}
            className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 border border-amber-500/50 text-amber-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <CornerUpLeft className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Double Click (Back)</span>
          </button>
        </div>
      </div>

      {/* Keyboard & Hardware Mapping Reference */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono">
        <span>Keys: ←/→ Rotate · Enter Select · Backspace Back</span>
        <span>Debounce: 25ms · Double-Click Window: 280ms</span>
      </div>
    </div>
  );
};
