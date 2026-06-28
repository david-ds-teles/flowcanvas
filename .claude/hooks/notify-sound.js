#!/usr/bin/env node
/**
 * notify-sound.js
 *
 * Claude Code hook: plays a short sound so the user knows the agent
 * needs attention. Registered on two events:
 *   Stop         — agent finished its turn                 (arg: done)
 *   Notification — agent is asking for user input/approval (arg: input)
 *
 * Cross-platform best-effort:
 *   macOS   — afplay with system sounds
 *   Linux   — paplay / aplay / play (first one found)
 *   Windows — powershell System.Media.SystemSounds
 *
 * Reads (and discards) the hook event JSON from stdin. Never blocks
 * or fails the event — exits 0 on any error so the session continues.
 *
 * Exit codes:
 *   0 = always (hook must never block turn completion)
 */

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'notify-sound';
const KIND = process.argv[2] === 'input' ? 'input' : 'done';

// Drain and ignore stdin so the hook's exit doesn't race the event pipe
process.stdin.on('data', () => {});
process.stdin.on('end', () => { logOutcome(); play(); });
process.stdin.on('error', () => { logOutcome(); process.exit(0); });

function logOutcome() {
  try {
    const cwd = process.cwd();
    const logDir = ['.flowcode', 'flowcode']
      .map(d => path.join(cwd, d, 'logs'))
      .find(c => fs.existsSync(path.dirname(c))) ||
      path.join(cwd, '.flowcode', 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const line = [
      new Date().toISOString(),
      HOOK_NAME,
      KIND === 'input' ? 'Notification' : 'Stop',
      '-',
      'pass',
    ].join('\t') + '\n';
    fs.appendFileSync(path.join(logDir, 'hooks.log'), line);
  } catch (_) {}
}

function play() {
  try {
    switch (process.platform) {
      case 'darwin':
        return playMac();
      case 'linux':
        return playLinux();
      case 'win32':
        return playWindows();
      default:
        return bell();
    }
  } catch (_) {
    // Never block
  }
  process.exit(0);
}

function detach(cmd, args) {
  const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
  child.on('error', () => {});
  child.unref();
  process.exit(0);
}

function playMac() {
  const sound =
    KIND === 'input'
      ? '/System/Library/Sounds/Funk.aiff'
      : '/System/Library/Sounds/Glass.aiff';
  detach('afplay', [sound]);
}

function playLinux() {
  const candidates = [
    ['paplay', ['/usr/share/sounds/freedesktop/stereo/complete.oga']],
    ['aplay', ['-q', '/usr/share/sounds/alsa/Front_Center.wav']],
    ['play', ['-nq', '-t', 'alsa', 'synth', '0.15', 'sine', KIND === 'input' ? '1320' : '880']],
  ];
  for (const [cmd, args] of candidates) {
    try {
      return detach(cmd, args);
    } catch (_) {}
  }
  bell();
}

function playWindows() {
  const sound = KIND === 'input' ? 'SystemExclamation' : 'SystemAsterisk';
  detach('powershell.exe', [
    '-NoProfile',
    '-Command',
    `[System.Media.SystemSounds]::${sound}.Play()`,
  ]);
}

function bell() {
  try {
    process.stderr.write('\x07');
  } catch (_) {}
  process.exit(0);
}
