#!/usr/bin/env node
/**
 * feedback-nudge.js
 *
 * Claude Code Stop hook: once per session, when the session did real work,
 * surfaces a one-line reminder to run /flowcode:feedback so the operator can
 * capture the session's rules, conventions, quality gates, decisions, and
 * knowledge — choosing per item what to APPLY vs only LOG. It NEVER runs the
 * feedback loop itself, and never blocks turn completion (always exits 0).
 *
 * Output channel: the reminder is emitted as a JSON object on stdout carrying
 * a `systemMessage` field — the one documented way a Stop hook can surface a
 * non-blocking message to the USER. Do NOT revert this to stderr or plain
 * stdout: for a Stop hook, exit-0 stderr is dropped and plain stdout only
 * appears in Ctrl-R transcript mode, so either would make the reminder vanish
 * silently. stdout must stay JSON-only (Claude Code parses the whole stream).
 *
 * "Did real work" = `git status --porcelain` (in process.cwd()) reports ANY
 * change anywhere in the repo — code, config, or .flowcode/. (Not limited to
 * .flowcode/: decisions and conventions are made while changing real code.)
 * The loop also captures decisions made only in conversation, with no file
 * change; the hook can't see those, so a purely conversational session is
 * reached via the manual /flowcode:feedback command.
 *
 * Once per session: keyed by the Stop event's session_id. Stop fires on every
 * turn, so an un-deduped nudge would repeat constantly. The first substantive
 * Stop writes a marker under .flowcode/logs/ and nudges; later Stops in the
 * same session stay silent.
 *
 * Re-entrancy: stop_hook_active === true -> exit 0 immediately.
 *
 * Logs outcome (nudge|pass|repeat) to .flowcode/logs/hooks.log.
 *
 * Exit codes:
 *   0 = always (a Stop hook must never block turn completion)
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'feedback-nudge';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(input || '{}');

    // Re-entrancy guard: don't nudge on a stop that the hook itself caused.
    if (event?.stop_hook_active === true) {
      process.exit(0);
    }

    if (!isSubstantive()) {
      logOutcome('pass');
      process.exit(0);
    }

    const sid = sanitize(event?.session_id || 'session');
    if (alreadyNudged(sid)) {
      logOutcome('repeat');
      process.exit(0);
    }

    const message =
      '[flowcode] This session changed the project — run /flowcode:feedback to '
      + 'capture rules, conventions, quality gates, decisions, and knowledge '
      + '(you choose per item: apply vs log-only).';
    // JSON-only on stdout: a Stop hook reaches the user solely via the
    // `systemMessage` field. stderr/plain-stdout would silently vanish here.
    process.stdout.write(JSON.stringify({ systemMessage: message }));
    markNudged(sid);
    logOutcome('nudge');
  } catch (_) {
    // Never block turn completion.
  }
  process.exit(0);
});
process.stdin.on('error', () => { process.exit(0); });

/**
 * Best-effort: any working-tree change anywhere in the repo counts as
 * substantive — not just paths under .flowcode/. `--untracked-files=all`
 * lists each new file rather than collapsing a wholly-untracked tree.
 */
function isSubstantive() {
  try {
    const out = execSync('git status --porcelain --untracked-files=all', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split('\n').some(line => line.trim() !== '');
  } catch (_) {
    // git unavailable / not a repo — treat as non-substantive.
    return false;
  }
}

function sanitize(s) {
  return String(s).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 80) || 'session';
}

function markerPath(sid) {
  const dir = resolveLogDir();
  return dir ? path.join(dir, `.feedback-nudged-${sid}`) : null;
}

function alreadyNudged(sid) {
  try {
    const p = markerPath(sid);
    return p ? fs.existsSync(p) : false;
  } catch (_) {
    return false;
  }
}

function markNudged(sid) {
  try {
    const dir = resolveLogDir();
    if (!dir) return;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(markerPath(sid), new Date().toISOString() + '\n');
  } catch (_) {
    // Best-effort; a missing marker only risks a second nudge, never a crash.
  }
}

function logOutcome(outcome) {
  try {
    const logDir = resolveLogDir();
    if (!logDir) return;
    fs.mkdirSync(logDir, { recursive: true });
    const line = [
      new Date().toISOString(),
      HOOK_NAME,
      'Stop',
      '-',
      outcome,
    ].join('\t') + '\n';
    fs.appendFileSync(path.join(logDir, 'hooks.log'), line);
  } catch (_) {
    // Logging is best-effort; never block a hook on it.
  }
}

function resolveLogDir() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, '.flowcode', 'logs'),
    path.join(cwd, 'flowcode', 'logs'),
  ];
  for (const c of candidates) {
    const parent = path.dirname(c);
    if (fs.existsSync(parent)) return c;
  }
  return candidates[0];
}
