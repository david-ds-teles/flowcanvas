#!/usr/bin/env node
/**
 * project-log-format-check.js
 *
 * Claude Code PreToolUse hook: blocks writes to
 * .flowcode/project/project-log.md that either (a) introduce disallowed
 * event tags or (b) omit the **Dev:** attribution line on an entry.
 * Flowcode allows only these project-level tags:
 *
 *   [PLAN COMPLETE] [BOOTSTRAP] [BUGFIX] [QUICKFIX] [MIGRATION] [FEEDBACK]
 *
 * Phase-end entries ([PHASE]) belong in the per-plan log
 * .flowcode/plans/{PREFIX}/{PREFIX}-log.md — never here. This hook
 * catches the common mistake of appending [PHASE] to the project log.
 *
 * Every newly-written entry must carry a non-empty **Dev:** line (who
 * did the work, from the SessionStart banner's `Acting as Dev:` line).
 * Only newly-written content is inspected, so legacy entries on disk
 * without Dev: are never retroactively flagged.
 *
 * Logs outcome (pass | block) to .flowcode/logs/hooks.log.
 *
 * Exit codes:
 *   0 = OK (tag allowed, Dev: present, or not a project-log write)
 *   2 = Violation — advisory message to stderr; Claude Code surfaces it
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'project-log-format-check';
const ALLOWED_TAGS = ['PLAN COMPLETE', 'BOOTSTRAP', 'BUGFIX', 'QUICKFIX', 'MIGRATION', 'FEEDBACK'];
const TAG_PATTERN = /^##\s*\[([A-Z ]+)\]/gm;

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let toolName = '';
  let filePath = '';
  let outcome = 'pass';

  try {
    const event = JSON.parse(input || '{}');
    toolName = event?.tool_name || '';
    filePath =
      event?.tool_input?.file_path ||
      event?.tool_input?.path ||
      '';

    if (!['Write', 'Edit', 'MultiEdit'].includes(toolName) || !filePath) {
      logOutcome(toolName, filePath, 'pass');
      return process.exit(0);
    }

    // Normalize Windows backslashes to `/` before isProjectLog (its regex is
    // anchored on `.flowcode/`); else it never matches on Windows and the hook
    // silently stops enforcing. No-op on POSIX.
    const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
    if (!isProjectLog(normalized)) {
      logOutcome(toolName, normalized, 'pass');
      return process.exit(0);
    }

    const content = extractContent(event, toolName);
    if (!content) {
      logOutcome(toolName, normalized, 'pass');
      return process.exit(0);
    }

    // Parse each newly-written entry block (heading → next heading) once:
    // validate the tag AND require a non-empty **Dev:** attribution line.
    // Only newly-written content is inspected, so legacy on-disk entries
    // without a Dev: line are never retroactively flagged.
    const headings = [...content.matchAll(TAG_PATTERN)];
    const badTags = [];
    const missingDev = [];
    for (let i = 0; i < headings.length; i++) {
      const tag = headings[i][1].trim();
      if (!ALLOWED_TAGS.includes(tag)) {
        badTags.push(tag);
        continue; // a bad tag dominates; don't also nag about Dev on a doomed entry
      }
      const start = headings[i].index;
      const end = i + 1 < headings.length ? headings[i + 1].index : content.length;
      const block = content.slice(start, end);
      if (!hasDev(block)) missingDev.push(tag);
    }

    const messages = [];
    if (badTags.length > 0) {
      const unique = [...new Set(badTags)];
      const extra = unique.includes('PHASE')
        ? ' [PHASE] entries belong in the per-plan log `{PREFIX}-log.md`, not the project log.'
        : '';
      messages.push(
        `disallowed tag(s) in project-log.md — [${unique.join('], [')}]. ` +
        `Allowed: [${ALLOWED_TAGS.join('], [')}].${extra}`
      );
    }
    if (missingDev.length > 0) {
      const unique = [...new Set(missingDev)];
      messages.push(
        `missing **Dev:** line on entr${unique.length > 1 ? 'ies' : 'y'} [${unique.join('], [')}]. ` +
        `Every project-log entry must record the developer who did the work — copy the identity ` +
        `verbatim from the session banner's \`Acting as Dev:\` line (git / FLOWCODE_DEV) as the entry's first field.`
      );
    }

    if (messages.length > 0) {
      outcome = 'block';
      process.stderr.write(`[${HOOK_NAME}] VIOLATION: ${messages.join(' ALSO: ')}\n`);
    }

    logOutcome(toolName, normalized, outcome);
    process.exit(outcome === 'block' ? 2 : 0);
  } catch (_) {
    logOutcome(toolName, filePath, 'pass');
    process.exit(0);
  }
});

function isProjectLog(p) {
  return /^(?:\.flowcode|flowcode)\/project\/project-log\.md$/.test(p);
}

function extractContent(event, toolName) {
  const ti = event?.tool_input || {};
  if (toolName === 'Write') return ti.content || '';
  if (toolName === 'Edit') return ti.new_string || '';
  if (toolName === 'MultiEdit') {
    const edits = ti.edits || [];
    return edits.map(e => e.new_string || '').join('\n');
  }
  return '';
}

function hasDev(block) {
  const m = block.match(/^\*\*Dev:\*\*\s*(.+?)\s*$/m);
  if (!m) return false;
  const val = m[1].trim();
  if (!val) return false;            // **Dev:** with no value
  if (/^\{.*\}$/.test(val)) return false; // unfilled `{placeholder}`
  return true;
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
