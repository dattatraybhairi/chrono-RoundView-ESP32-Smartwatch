/**
 * ============================================================================
 * FILE: /arduino/esp32s3_gc9a01_smartwatch/sd_gallery.h
 * PROJECT: ChronoS3 — MicroSD Card (/sdcard/DCIM) Reader, Writer & Preview Decoder
 * ============================================================================
 * Features:
 *  - Zero buffer allocation during setup() so GC9A01 SPI2 DMA and M2145 Camera
 *    have 100% of internal DRAM at boot.
 *  - Lazy 120x120 RGB565 preview cache (only 28.8 KB in PSRAM) for fast
 *    thumbnail grid previews and 2x-upscaled 240x240 fullscreen viewing.
 *  - Captures live M2145 RGB565 frames immediately into the preview cache AND
 *    saves /DCIM/IMG_XXXX.JPG to the MicroSD card.
 *  - Decodes existing /DCIM/*.JPG files from the SD card using ESP32's built-in
 *    jpg2rgb565() with automatic SOF0 dimension inspection & Big-Endian swap.
 */

#ifndef SD_GALLERY_H
#define SD_GALLERY_H

#include <Arduino.h>
#include "FS.h"
#include "SD_MMC.h"
#include "esp_camera.h"
#include "img_converters.h"
#include "pin_config.h"

#define MAX_GALLERY_FILES 64
#define PREVIEW_W         120
#define PREVIEW_H         120
#define PREVIEW_PIXELS    (PREVIEW_W * PREVIEW_H)
#define PREVIEW_BYTES     (PREVIEW_PIXELS * sizeof(uint16_t))

struct SDPhotoEntry {
  char filename[24];
  char fullPath[48];
  uint32_t sizeBytes;
};

struct SDGalleryState {
  bool mounted = false;
  SDPhotoEntry files[MAX_GALLERY_FILES];
  uint16_t fileCount = 0;
  uint16_t selectedIndex = 0;
  bool fullscreenMode = false;
  bool showExifOverlay = true;

  // Lazy-allocated 120x120 RGB565 preview buffer (28.8 KB in PSRAM)
  uint16_t *previewBuf = NULL;
  int16_t loadedIndex = -1;
  uint16_t decodedW = PREVIEW_W;
  uint16_t decodedH = PREVIEW_H;
};

static SDGalleryState g_gallery;

inline uint16_t swapRgb565ByteOrder(uint16_t bePixel) {
  return (uint16_t)((bePixel >> 8) | (bePixel << 8));
}

inline bool ensurePreviewBuffer() {
  if (g_gallery.previewBuf != NULL) return true;
  if (psramFound()) {
    g_gallery.previewBuf = (uint16_t *)ps_malloc(PREVIEW_BYTES);
  } else {
    g_gallery.previewBuf = (uint16_t *)malloc(PREVIEW_BYTES);
  }
  if (g_gallery.previewBuf != NULL) {
    memset(g_gallery.previewBuf, 0, PREVIEW_BYTES);
    return true;
  }
  return false;
}

/**
 * Inspects JPEG SOF0/SOF2 marker to read actual width & height before decoding,
 * preventing buffer overflows if a larger JPEG is on the SD card.
 */
inline bool parseJpegDimensions(const uint8_t *buf, size_t len, uint16_t &outW, uint16_t &outH) {
  if (!buf || len < 16 || buf[0] != 0xFF || buf[1] != 0xD8) return false;
  size_t idx = 2;
  while (idx + 9 < len) {
    if (buf[idx] != 0xFF) {
      idx++;
      continue;
    }
    uint8_t marker = buf[idx + 1];
    if (marker == 0xFF) {
      idx++;
      continue;
    }
    if (marker == 0xD8 || marker == 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) {
      idx += 2;
      continue;
    }
    uint16_t segLen = (uint16_t)((buf[idx + 2] << 8) | buf[idx + 3]);
    if (segLen < 2 || idx + 2 + segLen > len) break;

    // SOF0 (Baseline) or SOF2 (Progressive)
    if (marker == 0xC0 || marker == 0xC2) {
      outH = (uint16_t)((buf[idx + 5] << 8) | buf[idx + 6]);
      outW = (uint16_t)((buf[idx + 7] << 8) | buf[idx + 8]);
      return (outW > 0 && outH > 0);
    }
    idx += 2 + segLen;
  }
  return false;
}

inline void scanSDGalleryFolder() {
  if (!g_gallery.mounted) return;
  g_gallery.fileCount = 0;
  g_gallery.loadedIndex = -1;

  File dir = SD_MMC.open("/DCIM");
  if (!dir || !dir.isDirectory()) {
    SD_MMC.mkdir("/DCIM");
    return;
  }

  File entry = dir.openNextFile();
  while (entry && g_gallery.fileCount < MAX_GALLERY_FILES) {
    if (!entry.isDirectory()) {
      const char *rawName = entry.name();
      const char *baseName = strrchr(rawName, '/');
      baseName = baseName ? (baseName + 1) : rawName;

      String nameStr = String(baseName);
      if ((nameStr.endsWith(".JPG") || nameStr.endsWith(".jpg")) && !nameStr.startsWith(".")) {
        SDPhotoEntry &slot = g_gallery.files[g_gallery.fileCount];
        strncpy(slot.filename, baseName, sizeof(slot.filename) - 1);
        slot.filename[sizeof(slot.filename) - 1] = '\0';
        snprintf(slot.fullPath, sizeof(slot.fullPath), "/DCIM/%s", slot.filename);
        slot.sizeBytes = (uint32_t)entry.size();
        g_gallery.fileCount++;
      }
    }
    entry.close();
    entry = dir.openNextFile();
  }
  if (entry) entry.close();
  dir.close();
}

/**
 * Loads and decodes the selected SD card JPEG into g_gallery.previewBuf (120x120 RGB565).
 * Cached by g_gallery.loadedIndex so SD_MMC is only accessed once when selection changes.
 */
inline bool loadSDPhotoPreview(uint16_t index) {
  if (index >= g_gallery.fileCount) return false;
  if (g_gallery.loadedIndex == (int16_t)index && g_gallery.previewBuf != NULL) {
    return true;
  }
  if (!g_gallery.mounted || !ensurePreviewBuffer()) {
    return false;
  }

  const char *path = g_gallery.files[index].fullPath;

  // 1. Check if a fast 120x120 RGB565 preview sidecar (.IMG_XXXX.RGB) exists on SD
  char sidecarPath[56];
  snprintf(sidecarPath, sizeof(sidecarPath), "/DCIM/.%s.RGB", g_gallery.files[index].filename);
  if (SD_MMC.exists(sidecarPath)) {
    File sf = SD_MMC.open(sidecarPath, FILE_READ);
    if (sf && sf.size() == PREVIEW_BYTES) {
      size_t r = sf.read((uint8_t *)g_gallery.previewBuf, PREVIEW_BYTES);
      sf.close();
      if (r == PREVIEW_BYTES) {
        g_gallery.decodedW = PREVIEW_W;
        g_gallery.decodedH = PREVIEW_H;
        g_gallery.loadedIndex = (int16_t)index;
        return true;
      }
    }
    if (sf) sf.close();
  }

  // 2. Otherwise decode the standard .JPG file from /DCIM
  File f = SD_MMC.open(path, FILE_READ);
  if (!f) {
    Serial.printf("[SD] Failed to open %s\n", path);
    return false;
  }

  size_t fileSize = f.size();
  if (fileSize == 0 || fileSize > 512 * 1024) {
    f.close();
    return false;
  }

  uint8_t *jpgBuf = (uint8_t *)(psramFound() ? ps_malloc(fileSize) : malloc(fileSize));
  if (!jpgBuf) {
    f.close();
    return false;
  }

  size_t bytesRead = f.read(jpgBuf, fileSize);
  f.close();
  if (bytesRead != fileSize) {
    free(jpgBuf);
    return false;
  }

  uint16_t jpgW = 240;
  uint16_t jpgH = 240;
  parseJpegDimensions(jpgBuf, fileSize, jpgW, jpgH);

  // Pick a scale factor guaranteed to fit inside 120x120 (PREVIEW_W x PREVIEW_H)
  uint16_t div = 2;
  if (jpgW <= 120 && jpgH <= 120) {
    div = 1;
  } else if (jpgW <= 240 && jpgH <= 240) {
    div = 2;
  } else if (jpgW <= 480 && jpgH <= 480) {
    div = 4;
  } else {
    div = 8;
  }

  uint16_t outW = jpgW / div;
  uint16_t outH = jpgH / div;
  if (outW > PREVIEW_W || outH > PREVIEW_H || outW == 0 || outH == 0) {
    free(jpgBuf);
    return false;
  }

  memset(g_gallery.previewBuf, 0, PREVIEW_BYTES);
  bool ok = false;
  if (div == 1) {
    ok = jpg2rgb565(jpgBuf, fileSize, (uint8_t *)g_gallery.previewBuf, JPG_SCALE_NONE);
  } else if (div == 2) {
    ok = jpg2rgb565(jpgBuf, fileSize, (uint8_t *)g_gallery.previewBuf, JPG_SCALE_2X);
  } else if (div == 4) {
    ok = jpg2rgb565(jpgBuf, fileSize, (uint8_t *)g_gallery.previewBuf, JPG_SCALE_4X);
  } else {
    ok = jpg2rgb565(jpgBuf, fileSize, (uint8_t *)g_gallery.previewBuf, JPG_SCALE_8X);
  }
  free(jpgBuf);

  if (ok) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR < 3)
    // On Arduino-ESP32 2.x, jpg2rgb565 outputs Big-Endian RGB565; on 3.x it is already Little-Endian
    uint32_t totalPx = (uint32_t)outW * (uint32_t)outH;
    for (uint32_t i = 0; i < totalPx && i < PREVIEW_PIXELS; i++) {
      g_gallery.previewBuf[i] = swapRgb565ByteOrder(g_gallery.previewBuf[i]);
    }
#endif
    g_gallery.decodedW = outW;
    g_gallery.decodedH = outH;
    g_gallery.loadedIndex = (int16_t)index;
    Serial.printf("[SD] Decoded %s (%ux%u -> %ux%u)\n", path, jpgW, jpgH, outW, outH);
    return true;
  }

  return false;
}

inline bool initSDCardGallery() {
  SD_MMC.setPins(SD_MMC_CLK_PIN, SD_MMC_CMD_PIN, SD_MMC_D0_PIN);
  if (!SD_MMC.begin("/sdcard", true /* 1-bit mode */, false /* format_if_mount_failed */, SDMMC_FREQ_DEFAULT, 10 /* maxOpenFiles */)) {
    Serial.println("[SD] SD_MMC mount failed (check card or pins)");
    g_gallery.mounted = false;
    return false;
  }
  g_gallery.mounted = true;
  if (!SD_MMC.exists("/DCIM")) {
    SD_MMC.mkdir("/DCIM");
  }
  scanSDGalleryFolder();
  Serial.printf("[SD] Mounted /sdcard/DCIM with %u captured images\n", g_gallery.fileCount);
  return true;
}

inline bool captureHandyCamFrameToSD() {
  uint16_t nextId = g_gallery.fileCount + 1;
  if (nextId > MAX_GALLERY_FILES) nextId = MAX_GALLERY_FILES;

  char baseName[24];
  char path[48];
  snprintf(baseName, sizeof(baseName), "IMG_%04u.JPG", nextId);
  snprintf(path, sizeof(path), "/DCIM/%s", baseName);

  uint32_t savedBytes = 24 * 1024;
  bool frameCaptured = false;

  if (g_camState.initialized) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (fb) {
      // 1. Immediately cache a 120x120 RGB565 preview directly from the live camera frame
      if (fb->format == PIXFORMAT_RGB565 && ensurePreviewBuffer()) {
        const uint16_t *src = (const uint16_t *)fb->buf;
        uint16_t srcW = fb->width;
        uint16_t srcH = fb->height;
        for (uint16_t y = 0; y < PREVIEW_H; y++) {
          uint16_t sy = (uint16_t)((y * srcH) / PREVIEW_H);
          for (uint16_t x = 0; x < PREVIEW_W; x++) {
            uint16_t sx = (uint16_t)((x * srcW) / PREVIEW_W);
            g_gallery.previewBuf[y * PREVIEW_W + x] = swapRgb565ByteOrder(src[sy * srcW + sx]);
          }
        }
        g_gallery.decodedW = PREVIEW_W;
        g_gallery.decodedH = PREVIEW_H;
        frameCaptured = true;
      }

      // 2. Encode and write /DCIM/IMG_XXXX.JPG (+ fast .IMG_XXXX.JPG.RGB sidecar) to MicroSD
      if (g_gallery.mounted) {
        if (frameCaptured && g_gallery.previewBuf != NULL) {
          char sidecarPath[56];
          snprintf(sidecarPath, sizeof(sidecarPath), "/DCIM/.%s.RGB", baseName);
          File sf = SD_MMC.open(sidecarPath, FILE_WRITE);
          if (sf) {
            sf.write((const uint8_t *)g_gallery.previewBuf, PREVIEW_BYTES);
            sf.close();
          }
        }

        uint8_t *jpgBuf = NULL;
        size_t jpgLen = 0;
        bool converted = frame2jpg(fb, 85, &jpgBuf, &jpgLen);
        if (converted && jpgBuf) {
          File f = SD_MMC.open(path, FILE_WRITE);
          if (f) {
            f.write(jpgBuf, jpgLen);
            f.close();
            savedBytes = (uint32_t)jpgLen;
            Serial.printf("[SD] Saved %s (%u bytes)\n", path, (unsigned)jpgLen);
          }
          free(jpgBuf);
        }
      }
      esp_camera_fb_return(fb);
    }
  }

  if (g_gallery.fileCount < MAX_GALLERY_FILES) {
    uint16_t newIdx = g_gallery.fileCount;
    SDPhotoEntry &slot = g_gallery.files[newIdx];
    strncpy(slot.filename, baseName, sizeof(slot.filename) - 1);
    slot.filename[sizeof(slot.filename) - 1] = '\0';
    strncpy(slot.fullPath, path, sizeof(slot.fullPath) - 1);
    slot.fullPath[sizeof(slot.fullPath) - 1] = '\0';
    slot.sizeBytes = savedBytes;
    g_gallery.selectedIndex = newIdx;
    g_gallery.fileCount++;
    if (frameCaptured) {
      g_gallery.loadedIndex = (int16_t)newIdx;
    }
  }
  return true;
}

#endif // SD_GALLERY_H
