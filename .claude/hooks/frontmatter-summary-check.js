#!/usr/bin/env node
/**
 * frontmatter-summary-check.js
 *
 * Claude Code PreToolUse hook (matcher: Write|Edit|MultiEdit):
 * enforces the file-conventions standard (see workflow/file-conventions.md)
 * on every flowcode-managed markdown write before it lands on disk, so a
 * non-conforming file is rejected rather than committed.
 *
 * SCOPE — only flowcode-managed markdown. After stripping a leading `./`,
 * a path is in scope when it matches:
 *   - ^(\.flowcode|flowcode)\/.*\.md$
 *   - \.claude\/(agents|commands|skills|rules)\/flowcode\/.*\.md$
 * Anything else passes through untouched.
 *
 * EXEMPT (always pass): basename `agent-instructions.md` (injected verbatim
 * into the host CLAUDE.md, so it must carry no frontmatter); any `.md` under a
 * flowcode skill's `references/` directory (vendored third-party reference
 * material — e.g. the ui-mockups taste lenses — which carry their own upstream
 * frontmatter, not the flowcode standard); any non-`.md`.
 *
 * CONTENT SOURCE:
 *   - Write           → validates tool_input.content (the about-to-write body)
 *   - Edit|MultiEdit  → re-reads the on-disk file and validates its CURRENT
 *                       content. This guards regressions and pulls legacy
 *                       files up to standard the moment they're touched.
 *                       If the file doesn't exist yet, pass.
 *
 * VALIDATION — blocks with a specific message naming the FIRST failure:
 *   1. Starts (first non-empty line) with `---`, then frontmatter lines,
 *      then a closing `---`.
 *   2. Frontmatter contains all of: name, description, status, tags, links.
 *   3. An H1 (`# `) appears after the frontmatter.
 *   4. Between the H1 and the first `## ` (or EOF) there are 1–10 summary
 *      bullet lines (`- `). 0 → "missing summary"; >10 → "summary exceeds
 *      10 lines".
 *
 * All outcomes are logged to .flowcode/logs/hooks.log as TSV:
 *   timestamp\thook\ttool\tpath\toutcome(pass|block)
 *
 * Exit codes:
 *   0 = OK (pass-through), out of scope, or any internal error (fail-open)
 *   2 = Convention violation — blocks the tool call; message on stderr
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'frontmatter-summary-check';
const REQUIRED_KEYS = ['name', 'description', 'status', 'tags', 'links'];

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let toolName = '';
  let filePath = '';
  let normalized = '';
  let outcome = 'pass';

  try {
    const event = JSON.parse(input || '{}');
    toolName = event?.tool_name || '';
    filePath =
      event?.tool_input?.file_path ||
      event?.tool_input?.path ||
      '';
    // Normalize Windows backslashes to `/` before inScope/isExempt (their
    // regexes are anchored on `.flowcode/`); else they never match on Windows
    // and the hook silently stops enforcing. No-op on POSIX. Also feeds the
    // audit log so every hook records the same forward-slash form. (fs reads
    // still use the raw native filePath, which keeps real backslashes intact.)
    normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');

    if (['Write', 'Edit', 'MultiEdit'].includes(toolName) && filePath) {
      if (inScope(normalized) && !isExempt(normalized)) {
        const content = resolveContent(toolName, event, filePath);
        // `null` means "no content to validate" (e.g. Edit on a missing
        // file) — nothing to police, so pass.
        if (content !== null) {
          const reason = validate(content);
          if (reason) {
            outcome = 'block';
            process.stderr.write(
              `[${HOOK_NAME}] VIOLATION: ${reason}. Path: ${normalized}\n`
            );
          }
        }
      }
    }
  } catch (_) {
    // Never block on internal errors — fail open.
  }

  logOutcome(toolName, normalized, outcome);
  process.exit(outcome === 'block' ? 2 : 0);
});

function inScope(p) {
  return (
    /^(?:\.flowcode|flowcode)\/.*\.md$/.test(p) ||
    /\.claude\/(?:agents|commands|skills|rules)\/flowcode\/.*\.md$/.test(p)
  );
}

function isExempt(p) {
  if (!p.endsWith('.md')) return true;
  if (path.basename(p) === 'agent-instructions.md') return true;
  // Vendored reference material under any flowcode skill's references/ dir
  // (e.g. .claude/skills/flowcode/ui-mockups/references/taste/...): third-party
  // docs that keep their own upstream frontmatter, not the flowcode 5-key standard.
  if (/\/skills\/flowcode\/.*\/references\//.test(p)) return true;
  return false;
}

/**
 * Returns the content string to validate, or null when there is nothing to
 * validate (Edit/MultiEdit on a file that doesn't exist on disk).
 */
function resolveContent(toolName, event, filePath) {
  if (toolName === 'Write') {
    return typeof event?.tool_input?.content === 'string'
      ? event.tool_input.content
      : '';
  }
  // Edit | MultiEdit — validate the current on-disk content.
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return null;
  }
}

/**
 * Validates a content string against the file-conventions standard.
 * Returns a reason string for the FIRST failure, or null if it conforms.
 */
function validate(content) {
  const lines = content.split('\n');

  // 1. First non-empty line must open the frontmatter with `---`.
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length || lines[i].trim() !== '---') {
    return 'missing frontmatter (file must start with a `---` block)';
  }

  // Collect frontmatter lines up to the closing `---`.
  const fmStart = i + 1;
  let fmEnd = -1;
  for (let j = fmStart; j < lines.length; j++) {
    if (lines[j].trim() === '---') { fmEnd = j; break; }
  }
  if (fmEnd === -1) {
    return 'frontmatter block is not closed with a `---`';
  }

  // 2. Frontmatter must contain all required keys (`^key:` lines).
  const fmKeys = new Set();
  for (let j = fmStart; j < fmEnd; j++) {
    const m = lines[j].match(/^([A-Za-z0-9_-]+):/);
    if (m) fmKeys.add(m[1]);
  }
  const missing = REQUIRED_KEYS.filter(k => !fmKeys.has(k));
  if (missing.length > 0) {
    return `frontmatter missing required key(s): ${missing.join(', ')}`;
  }

  // 3. An H1 (`# `) must appear after the frontmatter.
  let h1Index = -1;
  for (let j = fmEnd + 1; j < lines.length; j++) {
    if (/^#\s+/.test(lines[j])) { h1Index = j; break; }
  }
  if (h1Index === -1) {
    return 'missing H1 heading (`# Title`) after the frontmatter';
  }

  // 4. Between the H1 and the first `## ` (or EOF): 1–10 summary bullets.
  let bullets = 0;
  for (let j = h1Index + 1; j < lines.length; j++) {
    if (/^##\s+/.test(lines[j])) break;
    if (/^-\s+/.test(lines[j])) bullets++;
  }
  if (bullets === 0) {
    return 'missing summary (need 1–10 `- ` bullet lines between the H1 and the first `## ` heading)';
  }
  if (bullets > 10) {
    return `summary exceeds 10 lines (found ${bullets} bullets between the H1 and the first `
      + '`## ` heading)';
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
