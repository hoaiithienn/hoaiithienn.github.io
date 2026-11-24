import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBootGate } from '../src/lib/bootGate.mjs';

test('evaluates complete serial lines across arbitrary chunk boundaries', () => {
  const gate = createBootGate();
  assert.equal(gate.write('BOOT_START\r\nINIT_').status, 'running');
  assert.equal(gate.write('OK\r\nREADY\r\nBOOT_END\r').status, 'running');
  assert.equal(gate.write('\n').status, 'pass');
});

test('regression retains both events and fails for event order', () => {
  const gate = createBootGate();
  const result = gate.write('BOOT_START\nREADY\nINIT_OK\nBOOT_END\n');
  assert.equal(result.status, 'fail');
  assert.equal(result.message, 'READY arrived before INIT_OK.');
  assert.deepEqual(result.events, ['BOOT_START', 'READY', 'INIT_OK', 'BOOT_END']);
});

test('distinguishes a stuck guest from a missing runner', () => {
  const gate = createBootGate();
  gate.write('BOOT_START\n');
  assert.equal(gate.timeout().status, 'fail');
  assert.equal(createBootGate().timeout().status, 'error');
  assert.equal(createBootGate().error('Serial stream closed.').status, 'error');
});
