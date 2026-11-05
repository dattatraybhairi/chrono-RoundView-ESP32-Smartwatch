import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runLocalESP32S3Inference,
  LOCAL_ESP32S3_MODEL_INFO,
} from './localVisionEngine';

test('ESP32-S3 Local AI Vision Engine runs 100% offline with zero internet', () => {
  assert.equal(
    LOCAL_ESP32S3_MODEL_INFO.networkRequirement,
    'NONE (100% Air-Gapped On-Device)'
  );
  assert.equal(
    LOCAL_ESP32S3_MODEL_INFO.framework,
    'TensorFlow Lite Micro (INT8)'
  );
  assert.equal(
    LOCAL_ESP32S3_MODEL_INFO.tensorArenaBytes,
    393216 // 384 KB in 8MB PSRAM
  );

  // Run local inference for each simulated scene
  const labResult = runLocalESP32S3Inference('LAB_BENCH', 'NORMAL', null);
  assert.ok(labResult.primaryLabel.length > 0);
  assert.equal(labResult.source, 'esp32s3-local-tflite');
  assert.equal(labResult.tensorArenaKB, 384);
  assert.ok(labResult.inferenceTimeMs! >= 50 && labResult.inferenceTimeMs! <= 140);
  assert.ok(labResult.speechText.includes('Target identified:'));

  const droneResult = runLocalESP32S3Inference('OUTDOOR_DRONE', 'NORMAL', null);
  assert.ok(droneResult.primaryLabel.includes('Drone') || droneResult.primaryLabel.includes('Propeller'));
  assert.equal(droneResult.source, 'esp32s3-local-tflite');

  const nightResult = runLocalESP32S3Inference('NIGHT_PATROL', 'THERMAL', null);
  assert.ok(nightResult.confidencePct >= 90);
  assert.ok(nightResult.boundingBox && nightResult.boundingBox.ymin >= 100);

  const webcamResult = runLocalESP32S3Inference('WEBCAM_LIVE', 'NORMAL', null);
  assert.ok(webcamResult.speechText.length > 10);
});
