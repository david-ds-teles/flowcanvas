#!/usr/bin/env node
/**
 * plan-artifact-index.js
 *
 * Claude Code SessionStart hook: emits a compact summary of the
 * project state to stdout so the agent has it as session context
 * without scanning the filesystem. Covers:
 *
 *   - The acting developer identity (FLOWCODE_DEV env override, else
 *     `git config user.name <user.email>`, else `unknown`) so the agent
 *     stamps the `Dev:` field on every log entry it writes
 *   - Active plans (each with active `## Phase N` inside {PREFIX}-plan.md)
 *   - Last 5 entries from .flowcode/project/project-log.md
 *
 * Output format: plain text. Keep under ~40 lines.
 *
 * Logs outcome (pass) to .flowcode/logs/hooks.log.
 *
 * Exit codes:
 *   0 = always (informational)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HOOK_NAME = 'plan-artifact-index';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const summary = buildSummary();
    if (summary) process.stdout.write(summary + '\n');
  } catch (_) {}
  logOutcome('pass');
  process.exit(0);
});

function buildSummary() {
  const cwd = process.cwd();
  const root = resolveFlowcodeRoot(cwd);
  if (!root) return null;

  const lines = [];
  lines.push('=== flowcode session context ===');
  lines.push(`Acting as Dev: ${resolveDev()} — stamp this on the **Dev:** field of every log entry you write`);

  const plans = collectActivePlans(path.join(root, 'plans'));
  if (plans.length > 0) {
    lines.push('Active plans:');
    for (const p of plans) {
      lines.push(`  - ${p.prefix} :: ${p.activePhase}`);
    }
  } else {
    lines.push('Active plans: none');
  }

  const logEntries = readRecentLogEntries(path.join(root, 'project', 'project-log.md'), 5);
  if (logEntries.length > 0) {
    lines.push('Recent project-log entries:');
    for (const e of logEntries) {
      lines.push(`  - ${e}`);
    }
  }

  lines.push('=== end flowcode context ===');
  return lines.join('\n');
}

// Resolve the acting developer identity. Order: FLOWCODE_DEV env override →
// `git config user.name <user.email>` → `unknown`. Identity is stamped into
// flowcode log artifacts only — never into git commits (flowcode-rules.md § Git).
function resolveDev() {
  const override = (process.env.FLOWCODE_DEV || '').trim();
  if (override) return override;

  const name = gitConfig('user.name');
  const email = gitConfig('user.email');
  if (name && email) return `${name} <${email}>`;
  if (name) return name;
  return 'unknown';
}

function gitConfig(key) {
  try {
    return execFileSync('git', ['config', '--get', key], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_) {
    return '';
  }
}

function resolveFlowcodeRoot(cwd) {
  for (const candidate of [path.join(cwd, '.flowcode'), path.join(cwd, 'flowcode')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  return null;
}

function collectActivePlans(plansDir) {
  if (!fs.existsSync(plansDir)) return [];
  const out = [];
  const dirs = fs.readdirSync(plansDir, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const prefix = d.name;
    const planFile = path.join(plansDir, prefix, `${prefix}-plan.md`);
    if (!fs.existsSync(planFile)) continue;

    let planText = '';
    try { planText = fs.readFileSync(planFile, 'utf8'); } catch (_) { continue; }

    // Skip completed and paused plans — they're not "active".
    // Plan status lives on the `**Status:** {value}` / `> **Status:** {value}` line.
    const statusMatch = planText.match(/^>?\s*\*\*Status:\*\*\s*(\S+)/m);
    const planStatus = statusMatch ? statusMatch[1].toLowerCase() : '';
    if (planStatus === 'complete' || planStatus === 'paused') continue;

    // Find the phase currently `in-progress` or `quality-check`; fall back to
    // the first phase not marked `done`; fall back to the first phase heading.
    const phases = [...planText.matchAll(
      /^##\s+Phase\s+(\d+)[^\n]*\n([\s\S]*?)(?=\n##\s+|$)/gm
    )];
    let activePhase = '(no phase heading found)';
    if (phases.length > 0) {
      const findByStatus = (wanted) =>
        phases.find(p => new RegExp(
          `\\*\\*Phase Status:\\*\\*\\s*${wanted}`, 'i'
        ).test(p[2]));
      const chosen =
        findByStatus('in-progress') ||
        findByStatus('quality-check') ||
        phases.find(p => !/\*\*Phase Status:\*\*\s*done/i.test(p[2])) ||
        phases[0];
      activePhase = chosen[0].split('\n')[0].replace(/^##\s+/, '').trim();
    }

    out.push({ prefix, activePhase });
  }
  return out;
}

function readRecentLogEntries(logFile, limit) {
  if (!fs.existsSync(logFile)) return [];
  const text = fs.readFileSync(logFile, 'utf8');
  const matches = [...text.matchAll(/^##\s+\[([A-Z ]+)\][^\n]*/gm)];
  return matches.slice(0, limit).map(m => m[0].replace(/^##\s+/, '').trim());
}

function logOutcome(outcome) {
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
      'SessionStart',
      '-',
      outcome,
    ].join('\t') + '\n';
    const logPath = path.join(logDir, 'hooks.log');
    // Bound runaway growth: at ~2 MB drop the oldest half (keeps the recent telemetry the eval layer reads).
    try {
      if (fs.statSync(logPath).size > 2000000) {
        const kept = fs.readFileSync(logPath, 'utf8');
        fs.writeFileSync(logPath, kept.slice(Math.floor(kept.length / 2)).replace(/^[^\n]*\n/, ''));
      }
    } catch (_) { /* first write / stat miss — ignore */ }
    fs.appendFileSync(logPath, line);
  } catch (_) {}
}
