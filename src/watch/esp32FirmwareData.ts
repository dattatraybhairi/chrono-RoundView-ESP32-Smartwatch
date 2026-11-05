import inoSource from '../../arduino/esp32s3_gc9a01_smartwatch/esp32s3_gc9a01_smartwatch.ino?raw';
import pinConfigHeader from '../../arduino/esp32s3_gc9a01_smartwatch/pin_config.h?raw';
import rotaryInputHeader from '../../arduino/esp32s3_gc9a01_smartwatch/rotary_input.h?raw';
import cameraHandycamHeader from '../../arduino/esp32s3_gc9a01_smartwatch/camera_handycam.h?raw';
import sdGalleryHeader from '../../arduino/esp32s3_gc9a01_smartwatch/sd_gallery.h?raw';
import uiRoundHeader from '../../arduino/esp32s3_gc9a01_smartwatch/ui_gc9a01_round.h?raw';
import aiVisionSpeakerHeader from '../../arduino/esp32s3_gc9a01_smartwatch/ai_vision_speaker.h?raw';
import musicPlayerHeader from '../../arduino/esp32s3_gc9a01_smartwatch/music_player.h?raw';
import platformioIni from '../../arduino/esp32s3_gc9a01_smartwatch/platformio.ini?raw';

export interface PinMappingRow {
  peripheral:
    | 'GC9A01 Display'
    | 'EC11 Rotary Switch'
    | 'OV2640 Camera'
    | 'SD Card (SD_MMC)'
    | 'I2S Audio Speaker';
  signal: string;
  esp32Pin: string;
  protocol: string;
  description: string;
}

export interface ArduinoProjectFile {
  filename: string;
  repoPath: string;
  role: string;
  content: string;
}

export const ARDUINO_PROJECT_FILES: ArduinoProjectFile[] = [
  {
    filename: 'esp32s3_gc9a01_smartwatch.ino',
    repoPath: '/arduino/esp32s3_gc9a01_smartwatch/esp32s3_gc9a01_smartwatch.ino',
    role: 'Main Arduino Sketch (setup, loop, state dispatcher, WiFi/BLE init)',
    content: inoSource,
  },
  {
    filename: 'pin_config.h',
    repoPath: '/arduino/esp32s3_gc9a01_smartwatch/pin_config.h',
    role: 'Verified Hardware GPIO Pinout (GC9A01 14/21/41, EC11 1/42/47, M2145 CAM, SD_MMC)',
    content: pinConfigHeader,
  },
  {
    filename: 'rotary_input.h',
    repoPath: '/arduino/esp32s3_gc9a01_smartwatch/rotary_input.h',
    role: 'EC11 Quadrature ISR + Single-Click (Select) & Double-Click (Back) Driver',
    content: rotaryInputHeader,
  },
  {
    filename: 'camera_handycam.h',
    repoPath: '/arduino/esp32s3_gc9a01_smartwatch/camera_handycam.h',
    role: '4-Stage Auto-Recovery M2145/OV2640 Driver (240x240, QVGA, QQVGA DRAM + Deinit Fix)',
    content: cameraHandycamHeader,
  },
  {
    filename: 'sd_gallery.h',
    repoPath: '/arduino/esp32s3_gc9a01_smartwatch/sd_gallery.h',
    role: 'SD_MMC 1-Bit /sdcard/DCIM Directory Scanner & frame2jpg Snapshot Writer',
    content: sdGalleryHeader,
  },
  {
    filename: 'ui_gc9a01_round.h',
    repoPath: '/arduino/esp32s3_gc9a01_smartwatch/ui_gc9a01_round.h',
    role: '240x240 Circular PSRAM Canvas Renderer + M2145 Software ISP Filters & Synthetic Fallback',
    content: uiRoundHeader,
  },
  {
    filename: 'ai_vision_speaker.h',
    repoPath: '/arduino/esp32s3_gc9a01_smartwatch/ai_vision_speaker.h',
    role: '100% Offline Vision + Real Human Voice G.711 u-Law PROGMEM Audio Engine (No Robot Voice)',
    content: aiVisionSpeakerHeader,
  },
  {
    filename: 'music_player.h',
    repoPath: '/arduino/esp32s3_gc9a01_smartwatch/music_player.h',
    role: 'Non-Blocking 16kHz Stereo I2S Music Player (SD_MMC .WAV + 5 Polyphonic Synth Tracks)',
    content: musicPlayerHeader,
  },
  {
    filename: 'platformio.ini',
    repoPath: '/arduino/esp32s3_gc9a01_smartwatch/platformio.ini',
    role: 'PlatformIO & Arduino IDE Board Config (Huge APP + 8MB OPI PSRAM)',
    content: platformioIni,
  },
];

export const ESP32S3_ARDUINO_FIRMWARE = inoSource;

export const ESP32S3_PIN_MAP: PinMappingRow[] = [
  // GC9A01 240x240 Round IPS Display (Verified Working User Connection)
  {
    peripheral: 'GC9A01 Display',
    signal: 'SCL / SCLK',
    esp32Pin: 'GPIO 14',
    protocol: 'SPI SCK (80MHz)',
    description: 'High-speed SPI clock for 240x240 RGB565 DMA frame transfers',
  },
  {
    peripheral: 'GC9A01 Display',
    signal: 'SDA / MOSI',
    esp32Pin: 'GPIO 21',
    protocol: 'SPI MOSI',
    description: 'Master Out Slave In pixel data line',
  },
  {
    peripheral: 'GC9A01 Display',
    signal: 'DC',
    esp32Pin: 'GPIO 41',
    protocol: 'Data / Command',
    description: 'High for RGB565 pixel stream, Low for GC9A01 register command',
  },
  {
    peripheral: 'GC9A01 Display',
    signal: 'CS / RST / BL',
    esp32Pin: '-1 (GND / 3V3)',
    protocol: 'Hardwired',
    description: 'CS tied to GND, RST & Backlight tied to 3.3V (-1 in Arduino_GFX)',
  },

  // EC11 Rotary Encoder + Push Button Switch (Verified Working User Connection)
  {
    peripheral: 'EC11 Rotary Switch',
    signal: 'ENC_CLK (A)',
    esp32Pin: 'GPIO 1',
    protocol: 'GPIO ISR (CHANGE)',
    description: 'Quadrature Phase A with internal pull-up & 1.5ms glitch filter',
  },
  {
    peripheral: 'EC11 Rotary Switch',
    signal: 'ENC_DT (B)',
    esp32Pin: 'GPIO 42',
    protocol: 'GPIO Input',
    description: 'Quadrature Phase B direction sense (CW vs CCW)',
  },
  {
    peripheral: 'EC11 Rotary Switch',
    signal: 'ENC_SW (BTN)',
    esp32Pin: 'GPIO 47',
    protocol: 'Input Pull-Up',
    description: 'Single-Click (<280ms gap) = Select, Double-Click = Menu Back',
  },

  // M2145 (GC2145) Camera Module (DVP Bus + SCCB)
  {
    peripheral: 'OV2640 Camera',
    signal: 'SIOD / SIOC (M2145)',
    esp32Pin: 'GPIO 4 / 5',
    protocol: 'SCCB (I2C)',
    description: 'M2145 (GC2145) sensor register bus (conflict-free with SD_MMC)',
  },
  {
    peripheral: 'OV2640 Camera',
    signal: 'XCLK / PCLK',
    esp32Pin: 'GPIO 15 / 13',
    protocol: '20MHz Cam Clock',
    description: 'Master clock output & pixel clock input via LCD_CAM DMA',
  },
  {
    peripheral: 'OV2640 Camera',
    signal: 'VSYNC / HREF',
    esp32Pin: 'GPIO 6 / 7',
    protocol: 'Frame Sync',
    description: 'Onboard FPC camera sync lines (frees GPIO 47 for ENC_SW)',
  },
  {
    peripheral: 'OV2640 Camera',
    signal: 'D7..D0 (Y9..Y2)',
    esp32Pin: 'GPIO 16,17,18,12,10,8,9,11',
    protocol: '8-Bit Parallel DVP',
    description: 'M2145 native PIXFORMAT_RGB565 parallel pixel bus',
  },

  // MicroSD Card (SD_MMC 1-Bit Mode)
  {
    peripheral: 'SD Card (SD_MMC)',
    signal: 'SD_CLK / CMD / D0',
    esp32Pin: 'GPIO 39 / 38 / 40',
    protocol: 'SD_MMC 1-Bit',
    description: 'Reads & writes /sdcard/DCIM/IMG_XXXX.JPG captures at 40MHz',
  },

  // MAX98357A / I2S DAC Audio Speaker (Object Detection Speech Output)
  {
    peripheral: 'I2S Audio Speaker',
    signal: 'I2S_BCLK',
    esp32Pin: 'GPIO 48',
    protocol: 'I2S Clock',
    description: 'Continuous Bit Clock line for 16kHz speech synthesis PCM',
  },
  {
    peripheral: 'I2S Audio Speaker',
    signal: 'I2S_LRC / WS',
    esp32Pin: 'GPIO 45',
    protocol: 'Word Select',
    description: 'Left / Right Channel Word Select Frame Sync',
  },
  {
    peripheral: 'I2S Audio Speaker',
    signal: 'I2S_DOUT / DIN',
    esp32Pin: 'GPIO 2',
    protocol: 'I2S Serial Data',
    description: 'Audio PCM stream driving MAX98357A 3W class-D speaker amplifier',
  },
];
