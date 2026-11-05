/**
 * ============================================================================
 * FILE: /arduino/esp32s3_gc9a01_smartwatch/pin_config.h
 * PROJECT: ChronoS3 — ESP32-S3-CAM + GC9A01 (240x240 Round Display) Smart Watch
 * ============================================================================
 * Target MCU: ESP32-S3-WROOM-1 / Seeed Studio XIAO ESP32S3 Sense (8MB OPI PSRAM)
 * Display:    GC9A01 1.28" 240x240 Round IPS RGB565 SPI TFT
 * Camera:     OV2640 / M2145 DVP 8-Bit Parallel Camera (240x240 Viewfinder)
 * Storage:    MicroSD Card via SD_MMC 1-Bit High-Speed Bus (/sdcard/DCIM)
 * Input:      EC11 Rotary Encoder (CLK, DT, SW Push-Button)
 */

#ifndef PIN_CONFIG_H
#define PIN_CONFIG_H

// ----------------------------------------------------------------------------
// 1. GC9A01 240x240 ROUND SPI DISPLAY PINS (Verified Working Hardware Pins)
// ----------------------------------------------------------------------------
#define TFT_WIDTH     240
#define TFT_HEIGHT    240
#define TFT_RADIUS    120
#define TFT_CENTER_X  120
#define TFT_CENTER_Y  120

#define TFT_SCLK_PIN  14   // SPI Clock (SCL)
#define TFT_MOSI_PIN  21   // SPI Data Out (SDA / MOSI)
#define TFT_CS_PIN    -1   // Chip Select (CS)
#define TFT_DC_PIN    41   // Data/Command (DC)
#define TFT_RST_PIN   -1   // Hardware Reset (RST)
#define TFT_BL_PIN    -1   // Backlight PWM Control (BLK)

// ----------------------------------------------------------------------------
// 2. EC11 ROTARY ENCODER + PUSH SWITCH PINS
// ----------------------------------------------------------------------------
#define ENC_CLK_PIN    1   // Quadrature Phase A (Interrupt on CHANGE)
#define ENC_DT_PIN    42   // Quadrature Phase B
#define ENC_SW_PIN    47   // Push Button Switch (Active LOW with internal pull-up)

// Timing constants for smooth Single-Click, Double-Click (Back) & Long-Press (Home)
#define ENC_DEBOUNCE_MS        5
#define ENC_DOUBLE_CLICK_MS  280
#define ENC_LONG_PRESS_MS    450
#define ENC_ISR_GLITCH_US   1000

// ----------------------------------------------------------------------------
// 3. M2145 / OV2640 CAMERA MODULE PINS (ESP32-S3-CAM Dedicated FPC Pins)
// ----------------------------------------------------------------------------
// Uses dedicated camera control pins (SIOD=4, SIOC=5, VSYNC=6, HREF=7) so
// there is zero conflict with SD_MMC (38, 39, 40) or ENC_SW_PIN (47).
#define CAM_PIN_PWDN   -1
#define CAM_PIN_RESET  -1
#define CAM_PIN_XCLK   15
#define CAM_PIN_SIOD    4  // SCCB I2C SDA
#define CAM_PIN_SIOC    5  // SCCB I2C SCL

#define CAM_PIN_D7     16
#define CAM_PIN_D6     17
#define CAM_PIN_D5     18
#define CAM_PIN_D4     12
#define CAM_PIN_D3     10
#define CAM_PIN_D2      8
#define CAM_PIN_D1      9
#define CAM_PIN_D0     11
#define CAM_PIN_VSYNC   6
#define CAM_PIN_HREF    7
#define CAM_PIN_PCLK   13

// ----------------------------------------------------------------------------
// 4. MICRO SD CARD PINS (SD_MMC 1-BIT MODE)
// ----------------------------------------------------------------------------
#define SD_MMC_CLK_PIN 39
#define SD_MMC_CMD_PIN 38
#define SD_MMC_D0_PIN  40

// ----------------------------------------------------------------------------
// 5. I2S DAC SPEAKER AUDIO PINS (MAX98357A / PCM5102 / ES8388 Audio Amplifier)
// ----------------------------------------------------------------------------
// IMPORTANT: Match these 3 GPIO numbers to your connected I2S amplifier pins!
// Driven via ESP32-S3 Hardware I2S0 DMA (<ESP_I2S.h> @ 16kHz 16-bit Stereo).
#define I2S_SPEAKER_BCLK_PIN  48   // Bit Clock (BCLK / SCK)
#define I2S_SPEAKER_LRC_PIN   45   // Word Select Clock (LRC / WS / LRCK)
#define I2S_SPEAKER_DOUT_PIN   2   // Serial Data Out (DIN / SD on MAX98357A)

// ----------------------------------------------------------------------------
// 6. RGB565 COLOR PALETTE DEFINITIONS FOR 240x240 CIRCULAR UI
// ----------------------------------------------------------------------------
#define COLOR_BG_OBSIDIAN  0x0842  // #060911
#define COLOR_PANEL_SLATE  0x10E4  // #111827
#define COLOR_CYAN_ACCENT  0x06BF  // #06B6D4
#define COLOR_EMERALD      0x15D0  // #10B981
#define COLOR_AMBER        0xFCE0  // #F59E0B
#define COLOR_VIOLET       0x8ADF  // #8B5CF6
#define COLOR_ROSE         0xF20B  // #F43F5E
#define COLOR_TEXT_WHITE   0xFFFF
#define COLOR_TEXT_MUTED   0x94B2

#endif // PIN_CONFIG_H
