#!/usr/bin/env node
/**
 * qa-probe-gate.js
 *
 * Claude Code PreToolUse hook (matcher: Bash): blocks commit / PR /
 * merge commands when the most recent QA report under .flowcode/plans/
 * shows a failed Stack Gate or unresolved finding of severity medium
 * or higher.
 *
 * Triggers on any Bash command containing:
 *   - git commit
 *   - gh pr create
 *   - gh pr merge
 *
 * "Unresolved" = the finding section has no non-empty **Resolution:** line.
 *
 * Logs outcome (pass | block) to .flowcode/logs/hooks.log.
 *
 * Exit codes:
 *   0 = OK (no gating QA finding, or unrelated command)
 *   2 = Violation — advisory message to stderr; user/agent addresses findings
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'qa-probe-gate';
const BLOCKING_SEVERITIES = new Set(['critical', 'high', 'medium']);
// Match only when the trigger appears as an actual command invocation:
// start-of-string, after a command separator (; && || | newline), or inside
// a subshell opener — optionally preceded by env-var assignments like
// `GIT_AUTHOR_NAME=bob git commit`. This prevents false positives on
// commands whose args merely mention the strings, e.g. `grep "git commit" log`.
const CMD_PREFIX = '(?:^|[;&|\\n(])\\s*(?:[A-Za-z_][A-Za-z0-9_]*=\\S+\\s+)*';
const TRIGGER_PATTERNS = [
  new RegExp(CMD_PREFIX + 'git\\s+commit\\b'),
  new RegExp(CMD_PREFIX + 'gh\\s+pr\\s+create\\b'),
  new RegExp(CMD_PREFIX + 'gh\\s+pr\\s+merge\\b'),
];

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let toolName = '';
  let command = '';
  let outcome = 'pass';

  try {
    const event = JSON.parse(input || '{}');
    toolName = event?.tool_name || '';
    command = event?.tool_input?.command || '';

    if (toolName !== 'Bash' || !command) {
      logOutcome(toolName, command, 'pass');
      return process.exit(0);
    }

    if (!TRIGGER_PATTERNS.some(rx => rx.test(command))) {
      logOutcome(toolName, command, 'pass');
      return process.exit(0);
    }

    const report = findLatestQaReport();
    if (!report) {
      logOutcome(toolName, command, 'pass');
      return process.exit(0);
    }

    const text = fs.readFileSync(report, 'utf8');
    const latestCheck = extractLatestCheck(text);
    if (!latestCheck) {
      logOutcome(toolName, command, 'pass');
      return process.exit(0);
    }

    const problems = analyseCheck(latestCheck);
    if (problems.length > 0) {
      outcome = 'block';
      process.stderr.write(
        `[${HOOK_NAME}] VIOLATION: QA gate blocks commit/PR — ${report}\n` +
        problems.map(p => `  - ${p}`).join('\n') + '\n' +
        `Fix findings or mark them resolved with **Resolution:** ...\n`
      );
    }

    logOutcome(toolName, command, outcome);
    process.exit(outcome === 'block' ? 2 : 0);
  } catch (_) {
    logOutcome(toolName, command, 'pass');
    process.exit(0);
  }
});

function findLatestQaReport() {
  const cwd = process.cwd();
  const plansRoots = [
    path.join(cwd, '.flowcode', 'plans'),
    path.join(cwd, 'flowcode', 'plans'),
  ];
  let newest = null;
  let newestMtime = 0;
  for (const root of plansRoots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const prefix = d.name;
      const candidate = path.join(root, prefix, `${prefix}-qa-report.md`);
      try {
        const stat = fs.statSync(candidate);
        if (stat.mtimeMs > newestMtime) {
          newestMtime = stat.mtimeMs;
          newest = candidate;
        }
      } catch (_) {}
    }
  }
  return newest;
}

// QA reports are reverse-chronological: newest `## Check` block sits directly
// below the file header. The latest check is therefore the FIRST `## Check`
// occurrence in the file, not the last.
function extractLatestCheck(text) {
  const match = text.match(/^##\s+Check\s+.+$/m);
  if (!match) return text;
  const startIdx = match.index;
  const nextTopLevel = text.slice(startIdx + 3).search(/^##\s+/m);
  if (nextTopLevel === -1) return text.slice(startIdx);
  return text.slice(startIdx, startIdx + 3 + nextTopLevel);
}

function analyseCheck(section) {
  const problems = [];

  const gateLine = section.match(/Gate\s+outcome\s*:\s*([A-Z]+)/i);
  if (gateLine && /FAIL/i.test(gateLine[1])) {
    problems.push(`Stack Gate outcome is FAIL`);
  }

  const findingRe = /####\s+Finding\s+\d+\s+—\s+\[(critical|high|medium|low|info)\][^\n]*\n([\s\S]*?)(?=\n####\s+Finding|\n##\s+|$)/gi;
  let m;
  while ((m = findingRe.exec(section)) !== null) {
    const severity = m[1].toLowerCase();
    if (!BLOCKING_SEVERITIES.has(severity)) continue;
    const body = m[2];
    if (!hasRealResolution(body)) {
      problems.push(`unresolved [${severity}] finding — ${firstLine(body)}`);
    }
  }

  return problems;
}

// A resolution counts only if it either (a) carries a backlog deferral
// reference (`deferred — BL-NNN`) or (b) has substantive content (≥ 15 chars
// of non-placeholder text). Stubs like `TBD`, `-`, `N/A`, `pending`, `?`
// do not satisfy the gate.
const RESOLUTION_PLACEHOLDERS = /^(?:tbd|n\/?a|pending|\?|-+|todo|to do|fixed|done)$/i;
function hasRealResolution(body) {
  const match = body.match(/\*\*Resolution:\*\*\s*([^\n]*)/);
  if (!match) return false;
  const text = match[1].trim();
  if (!text) return false;
  if (/deferred\s*[—-]\s*BL-\d+/i.test(text)) return true;
  if (RESOLUTION_PLACEHOLDERS.test(text)) return false;
  return text.length >= 15;
}

function firstLine(text) {
  const t = text.trim().split('\n')[0] || '';
  return t.length > 80 ? t.slice(0, 77) + '...' : t;
}

function logOutcome(toolName, command, outcome) {
  try {
    const logDir = resolveLogDir();
    if (!logDir) return;
    fs.mkdirSync(logDir, { recursive: true });
    const short = (command || '-').slice(0, 120).replace(/\t/g, ' ');
    const line = [
      new Date().toISOString(),
      HOOK_NAME,
      toolName || '-',
      short,
      outcome,
    ].join('\t') + '\n';
    fs.appendFileSync(path.join(logDir, 'hooks.log'), line);
  } catch (_) {}
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
