#!/usr/bin/env node
/**
 * harness-leak-check.js
 *
 * Claude Code PreToolUse hook (matcher: Write|Edit|MultiEdit).
 *
 * Flowcode is harness-agnostic: its framework documents describe behavior;
 * the install scripts are what wire flowcode into a concrete harness. So a
 * framework doc must never hard-code a filesystem path that won't resolve in
 * a host install — neither a harness directory (`.claude/`, `.cursor/`,
 * `.windsurf/`, `.agents/`, `.github/copilot`, …) NOR an `agent-tools/<kind>/`
 * source path (the installer strips `agent-tools/` and routes it into the
 * harness, so it does not exist in a host).
 *
 * Agent-tools artifacts are referenced by their wired NAME, not a path:
 * a sub-agent as `flowcode:<name>`, a skill as `flowcode:<name>`, a command
 * as `/flowcode:<name>`; hooks fire automatically.
 *
 * This hook blocks a write that would introduce such a path into a
 * `.flowcode/` framework `.md` doc, so the leak is rejected rather than
 * landing on disk.
 *
 * Scope (only these are checked):
 *   - tool ∈ Write | Edit | MultiEdit
 *   - target is a `.md` file under `.flowcode/` (host) or `flowcode/` (dev)
 *
 * Excluded (the legitimate harness/wiring layer — never checked):
 *   - non-`.md` files (flowcode.yml, *.js install/migrate engine, manifests,
 *     settings.json) — they carry the wiring by design
 *   - the `agent-tools/` tree — those files ARE the harness layer
 *   - `changelog.md` — its migrator `**Migration**` blocks legitimately
 *     reference the harness settings file
 *
 * Only NEW content is scanned (Write.content / Edit.new_string /
 * MultiEdit.edits[].new_string), so edits elsewhere in a file are unaffected.
 *
 * All outcomes are logged to .flowcode/logs/hooks.log as TSV:
 *   timestamp\thook\ttool\tpath\toutcome(pass|block)
 *
 * Exit codes:
 *   0 = OK (pass-through) or not a regulated write
 *   2 = Harness leak — blocks the tool call; message on stderr
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'harness-leak-check';

// Filesystem-path tokens that must never appear in a framework doc because
// they don't resolve in a host install: harness directories, and the
// `agent-tools/<kind>/` source tree (stripped by the installer). Bare
// `agent-tools/` (e.g. "the agent-tools tree" in prose) is intentionally NOT
// banned — only the subdir-qualified path forms.
const BANNED_PATHS = [
  '.claude/',
  '.cursor/',
  '.windsurf/',
  '.aider/',
  '.continue/',
  '.codeium/',
  '.agents/',
  '.github/copilot',
  'agent-tools/agents/',
  'agent-tools/hooks/',
  'agent-tools/skills/',
  'agent-tools/commands/',
  'agent-tools/rules/',
  'agent-tools/settings',
];

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let toolName = '';
  let normalized = '';
  let outcome = 'pass';
  let message = null;

  try {
    const event = JSON.parse(input || '{}');
    toolName = event?.tool_name || '';
    const filePath =
      event?.tool_input?.file_path ||
      event?.tool_input?.path ||
      '';
    // Normalize Windows backslashes so the scope regex matches cross-platform.
    normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');

    if (['Write', 'Edit', 'MultiEdit'].includes(toolName) && filePath && isGuardedDoc(normalized)) {
      const leak = findLeak(extractNewContent(toolName, event?.tool_input));
      if (leak) {
        outcome = 'block';
        message =
          `framework docs are harness-agnostic — found a harness/agent-tools path "${leak}" in ${normalized}, ` +
          `which does not resolve in a host install. Reference agent-tools capabilities by their wired name ` +
          `(sub-agent flowcode:<name>, skill flowcode:<name>, command /flowcode:<name>; hooks fire automatically), ` +
          `not a filesystem path. See workflow/file-conventions.md § links.`;
        process.stderr.write(`[${HOOK_NAME}] VIOLATION: ${message}\n`);
      }
    }
  } catch (_) {
    // Never block on parse errors.
  }

  logOutcome(toolName, normalized, outcome);
  process.exit(outcome === 'block' ? 2 : 0);
});

// A guarded doc is a framework `.md` under `.flowcode/` (host) or `flowcode/`
// (dev), excluding the agent-tools tree and the changelog migration carrier.
function isGuardedDoc(p) {
  if (!/\.md$/i.test(p)) return false;
  if (!/^(?:\.flowcode|flowcode)\//.test(p)) return false;
  if (p.includes('/agent-tools/')) return false;
  if (/(^|\/)changelog\.md$/i.test(p)) return false;
  return true;
}

// Collect only the new text a tool would write.
function extractNewContent(toolName, toolInput) {
  if (!toolInput) return '';
  if (toolName === 'Write') return String(toolInput.content || '');
  if (toolName === 'Edit') return String(toolInput.new_string || '');
  if (toolName === 'MultiEdit' && Array.isArray(toolInput.edits)) {
    return toolInput.edits.map(e => String(e?.new_string || '')).join('\n');
  }
  return '';
}

function findLeak(content) {
  if (!content) return null;
  for (const token of BANNED_PATHS) {
    if (content.includes(token)) return token;
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
