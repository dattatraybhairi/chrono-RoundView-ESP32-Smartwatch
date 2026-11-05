import React, { useState } from 'react';
import {
  ESP32S3_PIN_MAP,
  ARDUINO_PROJECT_FILES,
  PinMappingRow,
} from '../watch/esp32FirmwareData';
import {
  Cpu,
  Copy,
  Check,
  Download,
  Code2,
  FolderGit2,
  FileCode,
} from 'lucide-react';

interface FirmwareAndPinoutSectionProps {
  activeTab: 'PINOUT' | 'FIRMWARE';
}

export const FirmwareAndPinoutSection: React.FC<
  FirmwareAndPinoutSectionProps
> = ({ activeTab }) => {
  const [peripheralFilter, setPeripheralFilter] = useState<
    'ALL' | PinMappingRow['peripheral']
  >('ALL');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile =
    ARDUINO_PROJECT_FILES[selectedFileIndex] ?? ARDUINO_PROJECT_FILES[0];

  const filteredPins =
    peripheralFilter === 'ALL'
      ? ESP32S3_PIN_MAP
      : ESP32S3_PIN_MAP.filter((row) => row.peripheral === peripheralFilter);

  const handleCopyActiveFile = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllFiles = () => {
    ARDUINO_PROJECT_FILES.forEach((file, idx) => {
      setTimeout(() => {
        handleDownloadFile(file.filename, file.content);
      }, idx * 180);
    });
  };

  if (activeTab === 'PINOUT') {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-white">
                ESP32-S3-CAM + GC9A01 (240×240) + EC11 Hardware Wiring Matrix
              </h2>
              <p className="text-xs text-slate-400">
                SPI2 80MHz DMA for GC9A01 Round IPS · Quadrature ISR on GPIO 1/2 · DVP Camera + SD_MMC
              </p>
            </div>
          </div>

          {/* Interactive Filter Segmented Control */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            {(
              [
                'ALL',
                'GC9A01 Display',
                'EC11 Rotary Switch',
                'OV2640 Camera',
                'SD Card (SD_MMC)',
                'I2S Audio Speaker',
              ] as const
            ).map((filterItem) => (
              <button
                key={filterItem}
                type="button"
                onClick={() => setPeripheralFilter(filterItem)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  peripheralFilter === filterItem
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filterItem}
              </button>
            ))}
          </div>
        </div>

        {/* High-Density Pin Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-mono text-slate-400">
                <th className="py-2.5 px-3">Peripheral</th>
                <th className="py-2.5 px-3">Signal Name</th>
                <th className="py-2.5 px-3">ESP32-S3 GPIO</th>
                <th className="py-2.5 px-3">Bus / Protocol</th>
                <th className="py-2.5 px-3">Hardware Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {filteredPins.map((row) => (
                <tr
                  key={`${row.peripheral}-${row.signal}`}
                  className="hover:bg-slate-900/60 transition-colors"
                >
                  <td className="py-2.5 px-3 font-medium text-slate-200 whitespace-nowrap">
                    {row.peripheral}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-cyan-300 whitespace-nowrap">
                    {row.signal}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-emerald-400 whitespace-nowrap tabular-nums">
                    {row.esp32Pin}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                    {row.protocol}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {row.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
      {/* Header with Repository Path & Download Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <Code2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-white">
              Arduino Project Files — /arduino/esp32s3_gc9a01_smartwatch/
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              All {ARDUINO_PROJECT_FILES.length} physical Arduino files (.ino, .h, platformio.ini) are stored in{' '}
              <span className="font-mono text-cyan-300">
                /arduino/esp32s3_gc9a01_smartwatch/
              </span>{' '}
              in the project workspace and can be inspected or downloaded below.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyActiveFile}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied {activeFile.filename}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copy {activeFile.filename}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              handleDownloadFile(activeFile.filename, activeFile.content)
            }
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download {activeFile.filename}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadAllFiles}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Download All {ARDUINO_PROJECT_FILES.length} Files</span>
          </button>
        </div>
      </div>

      {/* ESP32-S3 Camera Init Fix & Arduino IDE Settings Banner */}
      <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
            ✓ Fixed: "CAM NOT INITIALIZED" — 4-Stage Hardware Auto-Recovery Driver (camera_handycam.h)
          </span>
          <span className="text-[11px] font-mono text-cyan-300 bg-slate-900/90 px-2.5 py-0.5 rounded border border-slate-700">
            Arduino IDE: Tools → PSRAM → "OPI PSRAM" · CPU Freq → "240MHz"
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300 mt-1">
          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
            <span className="text-emerald-400 font-bold">1. Boot Priority & Deinit:</span>{' '}
            Calls <code className="text-cyan-300">initOV2640Camera()</code> first in <code className="text-cyan-300">setup()</code> before SD_MMC/SPI and calls <code className="text-cyan-300">esp_camera_deinit()</code> between retries (fixes <code className="text-amber-300">0x103</code>).
          </div>
          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
            <span className="text-emerald-400 font-bold">2. SCCB Pull-Up & LDO Delay:</span>{' '}
            Enables <code className="text-cyan-300">INPUT_PULLUP</code> on SIOD (GPIO 4) / SIOC (GPIO 5) + 25ms LDO settling before probing M2145/OV2640.
          </div>
          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
            <span className="text-emerald-400 font-bold">3. QVGA & DRAM Fallback:</span>{' '}
            Auto-falls back from <code className="text-cyan-300">240x240</code> → <code className="text-cyan-300">QVGA (320x240)</code> → <code className="text-cyan-300">QQVGA DRAM</code> (works even if PSRAM is Disabled, fixing <code className="text-amber-300">0x101</code>).
          </div>
          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
            <span className="text-emerald-400 font-bold">4. Synthetic Fallback:</span>{' '}
            If the FPC ribbon cable is unplugged, <code className="text-cyan-300">ui_gc9a01_round.h</code> activates a live 240×240 synthetic viewfinder + hex error readout.
          </div>
        </div>
      </div>

      {/* Two-Column Arduino File Tree + Source Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Project File Explorer */}
        <div className="lg:col-span-4 bg-[#07090E] border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
          <div className="px-2 py-1.5 text-xs font-mono text-slate-400 border-b border-slate-800/80 flex items-center justify-between">
            <span>/arduino/esp32s3_gc9a01_smartwatch/</span>
            <span className="text-cyan-400">
              {ARDUINO_PROJECT_FILES.length} files
            </span>
          </div>

          {ARDUINO_PROJECT_FILES.map((file, idx) => {
            const isSelected = idx === selectedFileIndex;
            return (
              <button
                key={file.filename}
                type="button"
                onClick={() => setSelectedFileIndex(idx)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-400 text-white'
                    : 'bg-slate-900/50 border-slate-800/70 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <FileCode
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isSelected ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono font-semibold truncate">
                    {file.filename}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {file.role}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Active File Source Viewer */}
        <div className="lg:col-span-8 flex flex-col gap-2">
          <div className="bg-[#07090E] border border-slate-800 rounded-t-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono">
            <span className="text-cyan-300 font-semibold">
              {activeFile.repoPath}
            </span>
            <span className="text-slate-400">{activeFile.role}</span>
          </div>
          <pre className="bg-[#07090E] border-x border-b border-slate-800 rounded-b-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
            <code>{activeFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
