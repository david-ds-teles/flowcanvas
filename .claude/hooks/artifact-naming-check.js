#!/usr/bin/env node
/**
 * artifact-naming-check.js
 *
 * Claude Code PreToolUse hook (matcher: Write|Edit|MultiEdit):
 * validates artifact naming conventions on every file write inside
 * .flowcode/plans/ and .flowcode/researches/ before the write happens,
 * so a banned path is rejected rather than landing on disk.
 *
 * Two checks, in order:
 *
 *   1. Banned names — explicit reject list with targeted error messages.
 *      Covers patterns like `summary.md`, `solution-overview.md`,
 *      `{PREFIX}-validation-report.md`, `{PREFIX}-P{N}-*.md`,
 *      `phase-N-plan.md`, etc. — artifacts that historically appeared
 *      in sibling workflows and cause taxonomy drift.
 *
 *   2. Structural rules:
 *      - .flowcode/plans/{PREFIX}/{PREFIX}-{type}.md
 *        type ∈ design | plan | ui-design | log | technical-overview
 *             | changelog | test-notes | qa-report
 *      - .flowcode/researches/{slug}-research.md
 *      - .flowcode/reviews/{slug}-review.md
 *
 * All outcomes are logged to .flowcode/logs/hooks.log as TSV:
 *   timestamp\thook\ttool\tpath\toutcome(pass|warn|block)
 *
 * Exit codes:
 *   0 = OK (pass-through) or not a regulated path
 *   2 = Naming violation — blocks the tool call; message on stderr
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'artifact-naming-check';
const ALLOWED_TYPES = [
  'design', 'plan', 'ui-design', 'log',
  'technical-overview', 'changelog', 'test-notes', 'qa-report',
];

const BANNED_NAMES = [
  {
    pattern: /(^|\/)summary\.md$/i,
    message: 'Banned filename "summary.md" — use `{PREFIX}-technical-overview.md` for post-execution summaries.',
  },
  {
    pattern: /(^|\/)solution-overview\.md$/i,
    message: 'Banned filename "solution-overview.md" — use `{PREFIX}-design.md` for the designed solution.',
  },
  {
    pattern: /-validation-report\.md$/i,
    message: 'Banned filename suffix "-validation-report.md" — use `{PREFIX}-qa-report.md`.',
  },
  {
    pattern: /-P\d+(?:-[^/]+)?\.md$/,
    message: 'Banned per-phase filename "{PREFIX}-P{N}-*.md" — phases live inside the single `{PREFIX}-plan.md` as `## Phase N` sections.',
  },
  {
    pattern: /(^|\/)phase-\d+-plan\.md$/i,
    message: 'Banned filename "phase-N-plan.md" — phases live inside the single `{PREFIX}-plan.md` as `## Phase N` sections.',
  },
  {
    pattern: /-LOG\.md$/,
    message: 'Banned uppercase "{PREFIX}-LOG.md" — flowcode convention is lowercase `{PREFIX}-log.md`.',
  },
  {
    pattern: /-qa_report\.md$/,
    message: 'Banned underscore "{PREFIX}-qa_report.md" — flowcode convention is hyphenated `{PREFIX}-qa-report.md`.',
  },
  {
    pattern: /-ui-design-proposal\.md$/,
    message: 'Banned filename "{PREFIX}-ui-design-proposal.md" — flowcode convention is `{PREFIX}-ui-design.md`.',
  },
];

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let toolName = '';
  let filePath = '';
  let normalized = '';
  let outcome = 'pass';
  let message = null;

  try {
    const event = JSON.parse(input || '{}');
    toolName = event?.tool_name || '';
    filePath =
      event?.tool_input?.file_path ||
      event?.tool_input?.path ||
      '';
    // Normalize Windows backslashes to `/` before the scope/structure regexes
    // (all anchored on `.flowcode/`); else they never match on Windows and the
    // hook silently stops enforcing. No-op on POSIX. Also feeds the audit log
    // so every hook records the same forward-slash form.
    normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');

    if (['Write', 'Edit', 'MultiEdit'].includes(toolName) && filePath) {
      message =
        checkBannedNames(normalized) ||
        checkPlanPath(normalized) ||
        checkResearchPath(normalized) ||
        checkReviewPath(normalized);

      if (message) {
        outcome = 'block';
        process.stderr.write(`[${HOOK_NAME}] VIOLATION: ${message}\n`);
      }
    }
  } catch (_) {
    // Never block on parse errors
  }

  logOutcome(toolName, normalized, outcome);
  process.exit(outcome === 'block' ? 2 : 0);
});

function checkBannedNames(p) {
  if (!/^(?:\.flowcode|flowcode)\//.test(p)) return null;
  for (const { pattern, message } of BANNED_NAMES) {
    if (pattern.test(p)) return `${message} Got path: ${p}`;
  }
  return null;
}

function checkPlanPath(p) {
  const match = p.match(/^(?:\.flowcode|flowcode)\/plans\/([^/]+)\/([^/]+)\.md$/);
  if (!match) return null;

  const [, dir, file] = match;

  // Check longest-first so "ui-design" wins over "design".
  const sortedTypes = [...ALLOWED_TYPES].sort((a, b) => b.length - a.length);
  let filePrefix = null;
  let fileType = null;
  for (const t of sortedTypes) {
    const suffix = `-${t}`;
    if (file.endsWith(suffix)) {
      filePrefix = file.slice(0, -suffix.length);
      fileType = t;
      break;
    }
  }

  if (!fileType) {
    return (
      `Plan file "${file}.md" must match {PREFIX}-{type}.md. ` +
      `Allowed types: ${ALLOWED_TYPES.join(', ')}. Got path: ${p}`
    );
  }
  if (filePrefix !== dir) {
    return (
      `Plan file prefix "${filePrefix}" must match its directory name "${dir}". ` +
      `Got path: ${p}`
    );
  }
  return null;
}

function checkResearchPath(p) {
  const match = p.match(/^(?:\.flowcode|flowcode)\/researches\/([^/]+)\.md$/);
  if (!match) return null;
  const [, file] = match;
  if (!file.endsWith('-research')) {
    return (
      `Research file "${file}.md" must end with "-research" ` +
      `(e.g. "react-query-v5-research.md"). Got path: ${p}`
    );
  }
  return null;
}

function checkReviewPath(p) {
  const match = p.match(/^(?:\.flowcode|flowcode)\/reviews\/([^/]+)\.md$/);
  if (!match) return null;
  const [, file] = match;
  // The index is the one non-{slug}-review.md file allowed in reviews/.
  if (file === 'reviews-index') return null;
  if (!file.endsWith('-review')) {
    return (
      `Review file "${file}.md" must end with "-review" ` +
      `(e.g. "feature-auth-review.md"). Got path: ${p}`
    );
  }
  return null;
}

function logOutcome(toolName, filePath, outcome) {
  try {
    const logDir = resolveLogDir();
    if (!logDir) return;
    fs.mkdirSync(logDir, { recursive: true });
    const line = [
      new Date().toISOString(),
      HOOK_NAME,
      toolName || '-',
      filePath || '-',
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
