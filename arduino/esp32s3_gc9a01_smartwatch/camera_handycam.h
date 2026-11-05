/**
 * ============================================================================
 * FILE: /arduino/esp32s3_gc9a01_smartwatch/camera_handycam.h
 * PROJECT: ChronoS3 — OV2640 / M2145 HandyCam Multi-Stage Auto-Recovery Driver
 * ============================================================================
 * Fixes "CAM NOT INITIALIZED" on ESP32-S3-CAM boards via 4-Stage Auto-Fallback:
 *   1. Enables internal pull-ups on SCCB (SIOD=GPIO4, SIOC=GPIO5) & stabilizes
 *      sensor LDO rails before probing I2C address 0x3C (M2145/GC2145) / 0x30 (OV2640).
 *   2. Calls esp_camera_deinit() between every retry stage so ESP-IDF never
 *      locks up with ESP_ERR_INVALID_STATE (0x103) after a partial init.
 *   3. Stage 1: 240x240 RGB565 in OPI PSRAM (Double-Buffered, 20MHz XCLK).
 *   4. Stage 2: 240x240 RGB565 in OPI PSRAM (Single-Buffered Cool Mode).
 *   5. Stage 3: QVGA (320x240) RGB565 in PSRAM (for M2145/GC2145 drivers that
 *      reject square 240x240 mode during sensor table init).
 *   6. Stage 4: QQVGA (160x120) RGB565 in Internal DRAM (works even if
 *      Tools -> PSRAM is left on "Disabled" in Arduino IDE!).
 */

#ifndef CAMERA_HANDYCAM_H
#define CAMERA_HANDYCAM_H

#include <Arduino.h>
#include "esp_camera.h"
#include "pin_config.h"

enum CameraControlTool {
  CAM_TOOL_SNAP = 0,
  CAM_TOOL_DETECT,
  CAM_TOOL_STREAM,
  CAM_TOOL_ZOOM,
  CAM_TOOL_FILTER,
  CAM_TOOL_EXPOSURE,
  CAM_TOOL_COUNT
};

struct HandyCamState {
  bool initialized = false;
  bool syntheticFallback = false;
  bool streaming = true;
  bool aiHudVisible = false;
  uint8_t activeTool = 0;
  uint8_t zoomLevel = 1;     // 1x, 2x, 4x
  uint8_t filterMode = 0;    // 0=Normal, 1=IR_Night, 2=Thermal, 3=Cyber
  int8_t exposureEv = 0;     // -2 .. +2
  uint16_t fps = 24;
  esp_err_t lastError = ESP_OK;
  uint8_t activeProfile = 0;
  uint16_t sensorPid = 0;
};

static HandyCamState g_camState;

inline void populateBaseCameraConfig(camera_config_t &config) {
  memset(&config, 0, sizeof(camera_config_t));
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = CAM_PIN_D0;
  config.pin_d1       = CAM_PIN_D1;
  config.pin_d2       = CAM_PIN_D2;
  config.pin_d3       = CAM_PIN_D3;
  config.pin_d4       = CAM_PIN_D4;
  config.pin_d5       = CAM_PIN_D5;
  config.pin_d6       = CAM_PIN_D6;
  config.pin_d7       = CAM_PIN_D7;
  config.pin_xclk     = CAM_PIN_XCLK;
  config.pin_pclk     = CAM_PIN_PCLK;
  config.pin_vsync    = CAM_PIN_VSYNC;
  config.pin_href     = CAM_PIN_HREF;
  config.pin_sccb_sda = CAM_PIN_SIOD;
  config.pin_sccb_scl = CAM_PIN_SIOC;
  config.pin_pwdn     = CAM_PIN_PWDN;
  config.pin_reset    = CAM_PIN_RESET;
  config.pixel_format = PIXFORMAT_RGB565;
  config.jpeg_quality = 12;
}

inline bool initOV2640Camera() {
  // If already initialized, return true immediately
  if (g_camState.initialized) {
    return true;
  }

  // Ensure clean state before probing (prevents ESP_ERR_INVALID_STATE 0x103 on retry)
  esp_camera_deinit();

  // Enable internal pull-ups on SCCB I2C lines so M2145/OV2640 never NACKs on weak pull-ups
  pinMode(CAM_PIN_SIOD, INPUT_PULLUP);
  pinMode(CAM_PIN_SIOC, INPUT_PULLUP);

#if (CAM_PIN_PWDN >= 0)
  pinMode(CAM_PIN_PWDN, OUTPUT);
  digitalWrite(CAM_PIN_PWDN, LOW);
#endif
#if (CAM_PIN_RESET >= 0)
  pinMode(CAM_PIN_RESET, OUTPUT);
  digitalWrite(CAM_PIN_RESET, LOW);
  delay(10);
  digitalWrite(CAM_PIN_RESET, HIGH);
#endif

  // Allow 25ms for 1.8V DVDD / 2.8V AVDD camera LDO rails to stabilize at boot
  delay(25);

  bool hasPsram = psramFound();
  Serial.printf("[CAM] Probing Camera (PSRAM=%s, FreeHeap=%u)...\n",
                hasPsram ? "OPI_OK" : "DISABLED", (unsigned)ESP.getFreeHeap());

  struct CamInitProfile {
    const char *name;
    framesize_t frameSize;
    camera_fb_location_t fbLoc;
    size_t fbCount;
    camera_grab_mode_t grabMode;
    int xclkHz;
    bool requiresPsram;
  };

  const CamInitProfile kProfiles[4] = {
    // Stage 1: 240x240 RGB565 Double-Buffer in PSRAM @ 20MHz XCLK
    {"240x240_PSRAM_2FB", FRAMESIZE_240X240, CAMERA_FB_IN_PSRAM, 2, CAMERA_GRAB_LATEST,     20000000, true},
    // Stage 2: 240x240 RGB565 Single-Buffer in PSRAM @ 20MHz XCLK
    {"240x240_PSRAM_1FB", FRAMESIZE_240X240, CAMERA_FB_IN_PSRAM, 1, CAMERA_GRAB_WHEN_EMPTY, 20000000, true},
    // Stage 3: 320x240 QVGA RGB565 in PSRAM @ 16MHz XCLK (for M2145/GC2145 drivers needing QVGA)
    {"QVGA_PSRAM_1FB",    FRAMESIZE_QVGA,    CAMERA_FB_IN_PSRAM, 1, CAMERA_GRAB_WHEN_EMPTY, 16000000, true},
    // Stage 4: 160x120 QQVGA RGB565 in Internal DRAM @ 16MHz (works even if PSRAM is Disabled!)
    {"QQVGA_DRAM_1FB",    FRAMESIZE_QQVGA,   CAMERA_FB_IN_DRAM,  1, CAMERA_GRAB_WHEN_EMPTY, 16000000, false}
  };

  esp_err_t lastErr = ESP_FAIL;

  for (uint8_t i = 0; i < 4; i++) {
    if (kProfiles[i].requiresPsram && !hasPsram) {
      continue;
    }

    camera_config_t config;
    populateBaseCameraConfig(config);
    config.xclk_freq_hz = kProfiles[i].xclkHz;
    config.frame_size   = kProfiles[i].frameSize;
    config.fb_location  = kProfiles[i].fbLoc;
    config.fb_count     = kProfiles[i].fbCount;
    config.grab_mode    = kProfiles[i].grabMode;

    esp_err_t err = esp_camera_init(&config);
    if (err == ESP_OK) {
      sensor_t *s = esp_camera_sensor_get();
      if (s) {
        g_camState.sensorPid = s->id.PID;
        // Apply balanced initial ISP settings for M2145 (0x2145) / OV2640 (0x26)
        if (s->set_hmirror) s->set_hmirror(s, 1);
      }
      g_camState.initialized = true;
      g_camState.syntheticFallback = false;
      g_camState.lastError = ESP_OK;
      g_camState.activeProfile = i + 1;
      Serial.printf("[CAM] Initialized OK on Stage %u (%s) | Sensor PID=0x%04x\n",
                    (unsigned)(i + 1), kProfiles[i].name, (unsigned)g_camState.sensorPid);
      return true;
    }

    lastErr = err;
    Serial.printf("[CAM] Stage %u (%s) failed: 0x%x — deinit & trying next...\n",
                  (unsigned)(i + 1), kProfiles[i].name, (unsigned)err);
    esp_camera_deinit();
    delay(20);
  }

  g_camState.initialized = false;
  g_camState.syntheticFallback = true;
  g_camState.lastError = lastErr;
  Serial.printf("[CAM] All hardware stages failed (last err=0x%x). Activated On-Chip Synthetic Viewfinder.\n",
                (unsigned)lastErr);
  if (lastErr == 0x101) {
    Serial.println("[CAM] TIP: Error 0x101 = Out of Memory. Enable Tools -> PSRAM -> 'OPI PSRAM' in Arduino IDE.");
  } else if (lastErr == 0x105 || lastErr == 0x20001) {
    Serial.println("[CAM] TIP: Error 0x105/0x20001 = Sensor not detected on SCCB. Check camera FPC ribbon cable.");
  }
  return false;
}

inline void cycleCameraFilter() {
  g_camState.filterMode = (g_camState.filterMode + 1) % 4;
}

inline void cycleCameraExposure() {
  g_camState.exposureEv++;
  if (g_camState.exposureEv > 2) g_camState.exposureEv = -2;
  if (g_camState.initialized) {
    sensor_t *s = esp_camera_sensor_get();
    if (s && s->set_ae_level) {
      s->set_ae_level(s, g_camState.exposureEv);
    }
  }
}

inline void cycleCameraZoom() {
  if (g_camState.zoomLevel == 1) g_camState.zoomLevel = 2;
  else if (g_camState.zoomLevel == 2) g_camState.zoomLevel = 4;
  else g_camState.zoomLevel = 1;
}

#endif // CAMERA_HANDYCAM_H
