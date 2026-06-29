#!/usr/bin/env node
/**
 * markdown-quality-check.js
 *
 * Claude Code PostToolUse hook (matcher: Write|Edit|MultiEdit): the render
 * gate of the flowcode markdown lint. Runs on every flowcode-managed `.md`
 * after it lands on disk and validates the FINAL merged file (PostToolUse is
 * the only event where an Edit/MultiEdit merge is fully materialised).
 *
 * Companion gate: frontmatter-summary-check.js (PreToolUse) blocks writes
 * missing frontmatter/summary BEFORE they land. Together they are one lint:
 * frontmatter/summary (pre, blocking) + render quality (post, tiered).
 *
 * SCOPE — flowcode-managed markdown only, mirroring frontmatter-summary-check.js
 * inScope/isExempt (keep in lockstep; hooks share no module by design):
 *   - ^(\.flowcode|flowcode)\/.*\.md$
 *   - \.claude\/(agents|commands|skills|rules)\/flowcode\/.*\.md$
 * EXEMPT (always pass): non-`.md`; basename `agent-instructions.md`.
 *
 * SEVERITY TIERS:
 *   ERROR (exit 2 — must-fix; the write already landed, but exit 2 sends the
 *   message back so the agent is forced to repair render-breaking corruption):
 *     - unclosed code fence
 *     - mermaid Unicode arrow (→ ⟶ ⇒ ⇨ ➜)
 *     - mermaid block whose first real line is not a recognized diagram type
 *     - stateDiagram edge using "::" (double colon)
 *   WARN (exit 0 — advisory stderr; cosmetic / readability):
 *     - fenced code block missing a language tag
 *     - heading level skip (e.g. # then ###)
 *     - table > 3 columns when a cell holds code/path
 *     - unquoted mermaid label containing special chars
 *     - blank line inside a ```mermaid block (renderer-dependent)
 *     - unbalanced brackets across a ```mermaid block
 *
 * Logs outcome (pass | warn | error) to .flowcode/logs/hooks.log.
 *
 * Exit codes:
 *   0 = clean, only warnings, out of scope, or any internal error (fail-open)
 *   2 = at least one ERROR — message on stderr; agent must fix
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'markdown-quality-check';

// Known mermaid diagram-type bases. A block's first real line must START WITH
// one of these (case-insensitive), which absorbs suffixes like `-v2`/`-beta`
// and directions like `flowchart TD`. Kept as a const for one-line extension.
const MERMAID_TYPES = [
  'flowchart', 'graph', 'sequencediagram', 'classdiagram', 'statediagram',
  'erdiagram', 'journey', 'gantt', 'pie', 'quadrantchart', 'requirementdiagram',
  'gitgraph', 'mindmap', 'timeline', 'zenuml', 'sankey', 'xychart', 'block',
  'packet', 'architecture', 'kanban', 'radar', 'treemap', 'info',
  'c4context', 'c4container', 'c4component', 'c4dynamic', 'c4deployment',
];

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

    // Normalize Windows backslashes to `/` before inScope/isExempt (their
    // regexes are anchored on `.flowcode/`); else they never match on Windows
    // and the gate silently stops running. No-op on POSIX.
    const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
    if (!inScope(normalized) || isExempt(normalized)) {
      logOutcome(toolName, normalized, 'pass');
      return process.exit(0);
    }

    if (!fs.existsSync(normalized)) {
      logOutcome(toolName, normalized, 'pass');
      return process.exit(0);
    }

    const text = fs.readFileSync(normalized, 'utf8');
    const { errors, warnings } = scan(text);

    if (errors.length > 0) {
      outcome = 'error';
      const lines = [`[${HOOK_NAME}] render-breaking ERROR(s) in ${normalized} — fix before continuing:`];
      errors.forEach(e => lines.push(`  ERROR: ${e}`));
      warnings.forEach(w => lines.push(`  warn:  ${w}`));
      process.stderr.write(lines.join('\n') + '\n');
      logOutcome(toolName, normalized, outcome);
      return process.exit(2);
    }

    if (warnings.length > 0) {
      outcome = 'warn';
      process.stderr.write(
        `[${HOOK_NAME}] markdown-quality warnings in ${normalized}:\n` +
        warnings.map(w => `  - ${w}`).join('\n') + '\n'
      );
    }
    logOutcome(toolName, normalized, outcome);
    process.exit(0);
  } catch (_) {
    logOutcome(toolName, filePath, 'pass');
    process.exit(0);
  }
});

// Mirrors frontmatter-summary-check.js inScope() — keep in lockstep.
function inScope(p) {
  return (
    /^(?:\.flowcode|flowcode)\/.*\.md$/.test(p) ||
    /\.claude\/(?:agents|commands|skills|rules)\/flowcode\/.*\.md$/.test(p)
  );
}

// Mirrors frontmatter-summary-check.js isExempt() — keep in lockstep.
function isExempt(p) {
  if (!p.endsWith('.md')) return true;
  return path.basename(p) === 'agent-instructions.md';
}

function scan(text) {
  const errors = [];
  const warnings = [];
  const lines = text.split('\n');

  let inMermaid = false;
  let mermaidStartLine = 0;
  let mermaidBody = [];        // {ln, text} for lines inside the current block
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockStartLine = 0;
  let lastHeadingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ln = i + 1;

    const fenceMatch = line.match(/^```(\S*)/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = fenceMatch[1] || '';
        codeBlockStartLine = ln;
        if (!codeBlockLang) {
          warnings.push(`line ${ln}: fenced code block missing language tag`);
        }
        if (codeBlockLang === 'mermaid') {
          inMermaid = true;
          mermaidStartLine = ln;
          mermaidBody = [];
        }
      } else {
        // Closing fence — finalize a mermaid block.
        if (inMermaid) {
          finalizeMermaid(mermaidBody, mermaidStartLine, errors, warnings);
        }
        inCodeBlock = false;
        inMermaid = false;
        codeBlockLang = '';
      }
      continue;
    }

    if (inMermaid) {
      mermaidBody.push({ ln, text: line });
      if (/[→⟶⇒⇨➜]/.test(line)) {
        errors.push(`line ${ln}: mermaid uses a Unicode arrow — replace with --> or ==>`);
      }
      if (line.trim() === '') {
        warnings.push(`line ${ln}: blank line inside mermaid block (started line ${mermaidStartLine}) — terminates the diagram in some renderers`);
      }
      if (/^\s*[A-Za-z0-9_]+\s*:::\s*\S/.test(line) && /stateDiagram/i.test(lines[mermaidStartLine - 1] || '')) {
        errors.push(`line ${ln}: stateDiagram edge uses "::" — use a single colon with a label`);
      }
      const labelMatch = line.match(/\[([^\]]*)\]/);
      if (labelMatch) {
        const label = labelMatch[1];
        const needsQuotes = /[:()/{}\s-]/.test(label);
        const isQuoted = /^".*"$/.test(label);
        if (needsQuotes && !isQuoted) {
          warnings.push(`line ${ln}: mermaid label "${label}" contains special chars — quote it`);
        }
      }
      continue;
    }

    if (inCodeBlock) continue;

    const headingMatch = line.match(/^(#{1,6})\s/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
        warnings.push(`line ${ln}: heading jumps from h${lastHeadingLevel} to h${level} — use sequential levels`);
      }
      lastHeadingLevel = level;
    }

    if (line.trimStart().startsWith('|')) {
      const cells = line.split('|').slice(1, -1);
      if (cells.length > 3) {
        const hasCodeOrPath = cells.some(c =>
          /`[^`]+`/.test(c) || /\/[a-zA-Z0-9_./-]+\.[a-z]{1,5}/.test(c)
        );
        if (hasCodeOrPath && !/^\s*\|?[\s:-]+\|[\s:-]+\|/.test(line)) {
          warnings.push(`line ${ln}: table has ${cells.length} columns with code/path content — prefer ≤ 3 columns or finding-as-section format`);
        }
      }
    }
  }

  if (inCodeBlock) {
    errors.push(`code block starting at line ${codeBlockStartLine} is never closed`);
  }

  return { errors, warnings };
}

/**
 * Per-block mermaid checks that need the whole block: diagram-type header and
 * bracket balance.
 */
function finalizeMermaid(body, startLine, errors, warnings) {
  const typeToken = findDiagramType(body);
  if (typeToken === null) {
    // Empty block (only comments/blank) — leave it; the diagram is trivially
    // empty, not corrupt. A real first line that fails to match is the error.
  } else {
    const t = typeToken.toLowerCase();
    if (!MERMAID_TYPES.some(base => t.startsWith(base))) {
      errors.push(`mermaid block at line ${startLine} does not start with a recognized diagram type (found "${typeToken}")`);
    }
  }

  // Bracket balance across the block (after stripping quoted strings).
  let sq = 0, rd = 0, cu = 0;
  for (const { text } of body) {
    if (/^\s*%%/.test(text)) continue;
    const stripped = text.replace(/"[^"]*"/g, '');
    for (const ch of stripped) {
      if (ch === '[') sq++; else if (ch === ']') sq--;
      else if (ch === '(') rd++; else if (ch === ')') rd--;
      else if (ch === '{') cu++; else if (ch === '}') cu--;
    }
  }
  if (sq !== 0 || rd !== 0 || cu !== 0) {
    warnings.push(`mermaid block at line ${startLine} has unbalanced brackets ([]=${sq} ()=${rd} {}=${cu}) — check node definitions`);
  }
}

/**
 * Returns the first-real-line leading token of a mermaid block, or null when
 * the block has no real line. Skips blank lines, `%%` comments / directives,
 * and a leading `---…---` YAML config block (mermaid frontmatter).
 */
function findDiagramType(body) {
  let i = 0;
  // Skip leading blanks / comments.
  while (i < body.length && (body[i].text.trim() === '' || /^\s*%%/.test(body[i].text))) i++;
  // Skip a leading `---…---` config block.
  if (i < body.length && body[i].text.trim() === '---') {
    i++;
    while (i < body.length && body[i].text.trim() !== '---') i++;
    i++; // consume the closing ---
    while (i < body.length && (body[i].text.trim() === '' || /^\s*%%/.test(body[i].text))) i++;
  }
  if (i >= body.length) return null;
  const m = body[i].text.match(/^\s*([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
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
