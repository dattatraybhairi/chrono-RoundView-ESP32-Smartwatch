/**
 * ============================================================================
 * FILE: /arduino/esp32s3_gc9a01_smartwatch/rotary_input.h
 * PROJECT: ChronoS3 — Ultra-Smooth EC11 Rotary & Push-Button Driver
 * ============================================================================
 * Improvements for silky-smooth rotary & button presses:
 *  1. Locks out quadrature rotation steps while ENC_SW_PIN (GPIO 47) is pressed
 *     down (plus 35ms release guard) so pressing or double-tapping the knob
 *     never causes an accidental menu/tool jump.
 *  2. Fast 5ms switch debounce + second-tap hold guard so double-tapping to go
 *     back never misfires as a single-click while the 2nd tap is held down.
 *  3. Fires EVT_LONG_PRESS (>= 450ms hold) while the button is still held down
 *     to jump straight to the Home Watch Face from any screen.
 *  4. Supports instant Single-Click on Home/Menu (0ms wait) and a reliable
 *     280ms Double-Click window on all sub-screens.
 */

#ifndef ROTARY_INPUT_H
#define ROTARY_INPUT_H

#include <Arduino.h>
#include "pin_config.h"

enum WatchScreen {
  SCREEN_HOME = 0,
  SCREEN_MENU,
  SCREEN_CAMERA,
  SCREEN_GALLERY,
  SCREEN_MUSIC,
  SCREEN_WIFI,
  SCREEN_BLUETOOTH,
  SCREEN_GAMES
};

enum RotaryEvent {
  EVT_NONE = 0,
  EVT_CW,
  EVT_CCW,
  EVT_SINGLE_CLICK,
  EVT_DOUBLE_CLICK,
  EVT_LONG_PRESS
};

// Quadrature state machine states (valid Gray-code transitions only)
#define R_START     0x0
#define R_CW_FINAL  0x1
#define R_CW_BEGIN  0x2
#define R_CW_NEXT   0x3
#define R_CCW_BEGIN 0x4
#define R_CCW_FINAL 0x5
#define R_CCW_NEXT  0x6

#define DIR_NONE    0x0
#define DIR_CW      0x10
#define DIR_CCW     0x20

// Full-step 4-transition quadrature lookup table (eliminates contact bounce & skipping)
static const uint8_t DRAM_ATTR kRotaryStateTable[7][4] = {
  // R_START (00)
  {R_START,    R_CW_BEGIN,  R_CCW_BEGIN, R_START},
  // R_CW_FINAL
  {R_CW_NEXT,  R_START,     R_CW_FINAL,  R_START | DIR_CW},
  // R_CW_BEGIN
  {R_CW_NEXT,  R_CW_BEGIN,  R_START,     R_START},
  // R_CW_NEXT
  {R_CW_NEXT,  R_CW_BEGIN,  R_CW_FINAL,  R_START},
  // R_CCW_BEGIN
  {R_CCW_NEXT, R_START,     R_CCW_BEGIN, R_START},
  // R_CCW_FINAL
  {R_CCW_NEXT, R_CCW_FINAL, R_START,     R_START | DIR_CCW},
  // R_CCW_NEXT
  {R_CCW_NEXT, R_CCW_FINAL, R_CCW_BEGIN, R_START},
};

static volatile uint8_t  g_rotaryState        = R_START;
static volatile int32_t  g_encoderDelta       = 0;

static bool     g_btnStableState      = HIGH;
static uint32_t g_btnLastDebounceMs   = 0;
static uint32_t g_btnPressStartMs     = 0;
static uint32_t g_btnReleaseMs        = 0;
static bool     g_btnLongPressHandled = false;
static uint8_t  g_pendingClickCount   = 0;
static uint32_t g_firstClickReleaseMs = 0;

void IRAM_ATTR onRotaryQuadratureIsr() {
  // Ignore accidental shaft rotation while the push button is actively held LOW
  if (digitalRead(ENC_SW_PIN) == LOW) {
    return;
  }

  uint8_t pinState = (uint8_t)((digitalRead(ENC_DT_PIN) << 1) | digitalRead(ENC_CLK_PIN));
  g_rotaryState = kRotaryStateTable[g_rotaryState & 0x0F][pinState];
  uint8_t result = g_rotaryState & 0x30;
  if (result == DIR_CW) {
    g_encoderDelta++;
  } else if (result == DIR_CCW) {
    g_encoderDelta--;
  }
}

inline void initRotarySwitch() {
  pinMode(ENC_CLK_PIN, INPUT_PULLUP);
  pinMode(ENC_DT_PIN, INPUT_PULLUP);
  pinMode(ENC_SW_PIN, INPUT_PULLUP);

  // Attach interrupt to BOTH quadrature pins for rock-solid state tracking
  attachInterrupt(digitalPinToInterrupt(ENC_CLK_PIN), onRotaryQuadratureIsr, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_DT_PIN),  onRotaryQuadratureIsr, CHANGE);
}

/**
 * Polls the EC11 rotary encoder and push button.
 * @param instantSingleClick If true, fires EVT_SINGLE_CLICK immediately with zero
 *                           double-click wait window (used on HOME and MENU).
 */
inline RotaryEvent pollRotarySwitch(bool instantSingleClick = false) {
  uint32_t nowMs = millis();
  bool rawBtn = digitalRead(ENC_SW_PIN);

  // 1. Fast microsecond contact verification + 12ms transition cooldown so quick taps
  //    during a 22ms display flush are caught in a single pollRotarySwitch() call!
  if (rawBtn != g_btnStableState && (nowMs - g_btnLastDebounceMs) >= 12u) {
    delayMicroseconds(80);
    if (digitalRead(ENC_SW_PIN) == rawBtn) {
      g_btnLastDebounceMs = nowMs;
      g_btnStableState = rawBtn;

      if (g_btnStableState == LOW) {
        g_btnPressStartMs = nowMs;
        g_btnLongPressHandled = false;
        // Clear any accidental encoder jitter that happened as the finger pressed down
        noInterrupts();
        g_encoderDelta = 0;
        interrupts();
      } else {
        // Button released (LOW -> HIGH)
        g_btnReleaseMs = nowMs;
        if (!g_btnLongPressHandled) {
          if (instantSingleClick) {
            g_pendingClickCount = 0;
            return EVT_SINGLE_CLICK;
          }
          g_pendingClickCount++;
          g_firstClickReleaseMs = nowMs;
          if (g_pendingClickCount >= 2) {
            g_pendingClickCount = 0;
            return EVT_DOUBLE_CLICK;
          }
        }
      }
    }
  }

  // 2. While button is held LOW, fire EVT_LONG_PRESS immediately at 450ms
  if (g_btnStableState == LOW && !g_btnLongPressHandled) {
    if ((nowMs - g_btnPressStartMs) >= ENC_LONG_PRESS_MS) {
      g_btnLongPressHandled = true;
      g_pendingClickCount = 0;
      return EVT_LONG_PRESS;
    }
  }

  // 3. Complete pending Single-Click once the 280ms double-click window elapses,
  //    ONLY if the user is not currently holding the button down for the 2nd tap!
  if (g_pendingClickCount == 1 && g_btnStableState == HIGH && rawBtn == HIGH) {
    if ((nowMs - g_firstClickReleaseMs) >= ENC_DOUBLE_CLICK_MS) {
      g_pendingClickCount = 0;
      return EVT_SINGLE_CLICK;
    }
  }

  // 4. Drain accumulated quadrature steps when button is not held LOW (plus 30ms release guard)
  if (g_btnStableState == HIGH && rawBtn == HIGH && (nowMs - g_btnReleaseMs) >= 30u) {
    noInterrupts();
    int32_t delta = g_encoderDelta;
    if (delta > 0) g_encoderDelta--;
    else if (delta < 0) g_encoderDelta++;
    interrupts();

    if (delta > 0) return EVT_CW;
    if (delta < 0) return EVT_CCW;
  }

  return EVT_NONE;
}

inline void clearRotaryAfterScreenChange() {
  uint32_t waitStart = millis();
  while (digitalRead(ENC_SW_PIN) == LOW && (millis() - waitStart) < 60u) {
    delay(1);
  }
  noInterrupts();
  g_encoderDelta = 0;
  interrupts();
  g_btnStableState      = HIGH;
  g_btnLastDebounceMs   = millis();
  g_btnReleaseMs        = millis();
  g_btnLongPressHandled = true;
  g_pendingClickCount   = 0;
}

#endif // ROTARY_INPUT_H
