import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialWatchState,
  reduceWatchState,
  isPointInsideGC9A01,
  polarToCartesian,
  angularDistanceDeg,
  MENU_ITEMS,
} from './watchStateMachine';

test('Home screen rotary CW/CCW cycles watch faces and SINGLE_CLICK enters MENU', () => {
  let state = createInitialWatchState();
  assert.equal(state.screen, 'HOME');
  assert.equal(state.watchFace, 'CHRONO');

  state = reduceWatchState(state, 'CW');
  assert.equal(state.watchFace, 'ORBITAL');

  state = reduceWatchState(state, 'CW');
  assert.equal(state.watchFace, 'TELEMETRY');

  state = reduceWatchState(state, 'CCW');
  assert.equal(state.watchFace, 'ORBITAL');

  state = reduceWatchState(state, 'SINGLE_CLICK');
  assert.equal(state.screen, 'MENU');
});

test('Menu screen rotary CW/CCW navigates items, SINGLE_CLICK selects, DOUBLE_CLICK goes back to HOME', () => {
  let state = createInitialWatchState();
  state = reduceWatchState(state, 'SINGLE_CLICK'); // Enter MENU
  assert.equal(state.screen, 'MENU');
  assert.equal(state.menuIndex, 0);
  assert.equal(MENU_ITEMS[state.menuIndex].id, 'CAMERA');

  // Rotate CW to GALLERY (index 1)
  state = reduceWatchState(state, 'CW');
  assert.equal(state.menuIndex, 1);
  assert.equal(MENU_ITEMS[state.menuIndex].id, 'GALLERY');

  // Rotate CCW back to CAMERA (index 0)
  state = reduceWatchState(state, 'CCW');
  assert.equal(state.menuIndex, 0);

  // Double click goes back to HOME
  const homeState = reduceWatchState(state, 'DOUBLE_CLICK');
  assert.equal(homeState.screen, 'HOME');
});

test('HandyCam CAMERA screen captures frame to SD card on SINGLE_CLICK and exits on DOUBLE_CLICK', () => {
  let state = createInitialWatchState();
  state = reduceWatchState(state, 'SINGLE_CLICK'); // HOME -> MENU
  state = reduceWatchState(state, 'SINGLE_CLICK'); // MENU[0] -> CAMERA
  assert.equal(state.screen, 'CAMERA');
  assert.equal(state.sdImages.length, 4);

  // Control 0 is SNAP: Single click writes new image to /sdcard/DCIM/IMG_0005.JPG
  state = reduceWatchState(state, 'SINGLE_CLICK', {
    capturedDataUrl: 'data:image/png;base64,fake',
    timestamp: '2026-11-02 22:30:00',
  });
  assert.equal(state.sdImages.length, 5);
  assert.equal(state.sdImages[0].filename, 'IMG_0005.JPG');
  assert.equal(state.sdImages[0].path, '/sdcard/DCIM/IMG_0005.JPG');

  // Rotate CW to DETECT (index 1) and toggle AI vision detection
  state = reduceWatchState(state, 'CW');
  assert.equal(state.cameraControlIndex, 1);
  assert.equal(state.aiDetecting, false);
  state = reduceWatchState(state, 'SINGLE_CLICK');
  assert.equal(state.aiDetecting, true);

  // Rotate CW to STREAM (index 2) and toggle streaming
  state = reduceWatchState(state, 'CW');
  assert.equal(state.cameraControlIndex, 2);
  assert.equal(state.cameraStreaming, true);
  state = reduceWatchState(state, 'SINGLE_CLICK');
  assert.equal(state.cameraStreaming, false);

  // Double click returns to MENU
  state = reduceWatchState(state, 'DOUBLE_CLICK');
  assert.equal(state.screen, 'MENU');
});

test('SD Card GALLERY screen reads captured images, opens fullscreen viewer on SINGLE_CLICK, and backs out with DOUBLE_CLICK', () => {
  let state = createInitialWatchState();
  state = reduceWatchState(state, 'SINGLE_CLICK'); // HOME -> MENU
  state = reduceWatchState(state, 'CW'); // index 1 = GALLERY
  state = reduceWatchState(state, 'SINGLE_CLICK'); // Enter GALLERY
  assert.equal(state.screen, 'GALLERY');
  assert.equal(state.galleryMode, 'GRID');
  assert.equal(state.galleryIndex, 0);

  // Rotate CW in GRID mode
  state = reduceWatchState(state, 'CW');
  assert.equal(state.galleryIndex, 1);

  // Single click opens fullscreen VIEWER
  state = reduceWatchState(state, 'SINGLE_CLICK');
  assert.equal(state.galleryMode, 'VIEWER');

  // Double click in VIEWER returns to GRID
  state = reduceWatchState(state, 'DOUBLE_CLICK');
  assert.equal(state.galleryMode, 'GRID');

  // Double click in GRID returns to MENU
  state = reduceWatchState(state, 'DOUBLE_CLICK');
  assert.equal(state.screen, 'MENU');
});

test('Music, WiFi, Bluetooth, and Games screens respond to rotary navigation, single click, and double click back', () => {
  let state = createInitialWatchState();
  state = reduceWatchState(state, 'SINGLE_CLICK'); // MENU
  state = reduceWatchState(state, 'CW'); // 1: GALLERY
  state = reduceWatchState(state, 'CW'); // 2: MUSIC
  state = reduceWatchState(state, 'SINGLE_CLICK');
  assert.equal(state.screen, 'MUSIC');
  assert.equal(state.musicPlaying, false);

  // Single click on control 0 (PLAY_PAUSE) starts playback
  state = reduceWatchState(state, 'SINGLE_CLICK');
  assert.equal(state.musicPlaying, true);

  // Rotate CW to control 1 (NEXT) and single click advances track
  state = reduceWatchState(state, 'CW');
  assert.equal(state.musicControlIndex, 1);
  state = reduceWatchState(state, 'SINGLE_CLICK');
  assert.equal(state.musicTrackIndex, 1);

  // Double click returns to MENU
  state = reduceWatchState(state, 'DOUBLE_CLICK');
  assert.equal(state.screen, 'MENU');

  // Rotate CW to WIFI (index 3)
  state = reduceWatchState(state, 'CW'); // 3: WIFI
  state = reduceWatchState(state, 'SINGLE_CLICK');
  assert.equal(state.screen, 'WIFI');
  assert.equal(state.wifiEnabled, true);

  // Single click on cursor 0 toggles WiFi radio
  state = reduceWatchState(state, 'SINGLE_CLICK');
  assert.equal(state.wifiEnabled, false);
  state = reduceWatchState(state, 'DOUBLE_CLICK');
  assert.equal(state.screen, 'MENU');

  // Navigate to GAMES (index 5)
  state = reduceWatchState(state, 'CW'); // 4: BLUETOOTH
  state = reduceWatchState(state, 'CW'); // 5: GAMES
  state = reduceWatchState(state, 'SINGLE_CLICK');
  assert.equal(state.screen, 'GAMES');
  assert.equal(state.gameMode, 'SELECT');
  assert.equal(state.selectedGame, 'ORBITAL_BREAKER');

  // Rotate CW switches selected game to RADAR_DEFENSE, CYBER_TUNNEL, then FLAPPY_BIRD
  state = reduceWatchState(state, 'CW');
  assert.equal(state.selectedGame, 'RADAR_DEFENSE');
  state = reduceWatchState(state, 'CW');
  assert.equal(state.selectedGame, 'CYBER_TUNNEL');
  state = reduceWatchState(state, 'CW');
  assert.equal(state.selectedGame, 'FLAPPY_BIRD');

  // Single click starts playing
  state = reduceWatchState(state, 'SINGLE_CLICK');
  assert.equal(state.gameMode, 'PLAYING');

  // Rotate CW rotates paddle/turret by +15 deg
  const prevAngle = state.paddleAngleDeg;
  state = reduceWatchState(state, 'CW');
  assert.equal(state.paddleAngleDeg, (prevAngle + 15) % 360);

  // Double click exits PLAYING to SELECT, and second Double click exits SELECT to MENU
  state = reduceWatchState(state, 'DOUBLE_CLICK');
  assert.equal(state.gameMode, 'SELECT');
  state = reduceWatchState(state, 'DOUBLE_CLICK');
  assert.equal(state.screen, 'MENU');
});

test('240x240 GC9A01 circular geometry helpers validate boundaries and polar coordinates', () => {
  // Center (120, 120) is inside
  assert.equal(isPointInsideGC9A01(120, 120), true);
  // Corner (5, 5) of 240x240 bounding square is OUTSIDE the circular GC9A01 display!
  assert.equal(isPointInsideGC9A01(5, 5), false);
  // Top dead center (0 deg) at radius 90 from (120, 120) -> (120, 30)
  const topPt = polarToCartesian(120, 120, 90, 0);
  assert.equal(topPt.x, 120);
  assert.equal(topPt.y, 30);
  assert.equal(angularDistanceDeg(350, 10), 20);
});
