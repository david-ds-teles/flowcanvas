'use strict';
/**
 * eval-hooks-log.js — Layer 1 of the flowcode evaluation system (mechanical, free).
 *
 * Parses the TSV the hooks already emit at `<root>/logs/hooks.log`:
 *     <ISO-timestamp>\t<hook>\t<tool>\t<path>\t<outcome>
 * outcome ∈ { pass, warn, error, block, nudge, repeat }
 *
 * Aggregates per-hook fire/outcome counts, computes a block rate, and flags
 * hooks the agent is repeatedly fighting (high block+error rate). Emits
 * `<root>/logs/eval/hooks-{YYYY-MM-DD}.{md,json}`.
 *
 * Dependency-free Node (core modules only) so it runs on Windows/macOS/Linux,
 * matching the framework's "Node is the only hard requirement" contract — no
 * bash, no jq. Offline; never throws on a fresh project (missing log → empty
 * report, exit 0). Evaluation is advisory and never gates anything.
 *
 * Usage (from the project root that contains .flowcode/ or flowcode/):
 *     node .flowcode/eval/eval-hooks-log.js [--since N]
 *   --since N   only count log lines from the last N days
 */

const fs = require('fs');
const path = require('path');

const HIGH_BLOCK_RATE = 0.25; // ≥25% of fires blocked/errored ⇒ candidate flag
const MIN_BLOCKS = 3;         // …and at least this many, to avoid small-sample noise
const OUTCOMES = ['pass', 'warn', 'error', 'block', 'nudge', 'repeat'];

// Resolve the flowcode root: .flowcode/ in a host install, flowcode/ in the dev
// repo — the same probe the hooks use to find their log dir.
function resolveRoot(cwd) {
  cwd = cwd || process.cwd();
  for (const name of ['.flowcode', 'flowcode']) {
    const p = path.join(cwd, name);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
  }
  return null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * run({ root, sinceDays, write }) → report object.
 * Pure aggregation; writes the md+json reports only when write !== false.
 */
function run(opts) {
  opts = opts || {};
  const root = opts.root || resolveRoot();
  const sinceDays = Number(opts.sinceDays) || 0;
  const logFile = root ? path.join(root, 'logs', 'hooks.log') : null;

  const report = {
    generated: today(),
    source: logFile ? rel(root, logFile) : null,
    sinceDays: sinceDays || null,
    totalFires: 0,
    parsed: 0,
    skipped: 0,
    hooks: {},
    flags: [],
  };

  if (!logFile || !fs.existsSync(logFile)) {
    report.note = 'no hooks.log found — nothing to aggregate';
    if (opts.write !== false) writeReports(root, report);
    return report;
  }

  const cutoff = sinceDays ? Date.now() - sinceDays * 86400000 : 0;
  const lines = fs.readFileSync(logFile, 'utf8').split('\n');

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;
    const f = line.split('\t');
    if (f.length < 5) { report.skipped++; continue; }
    // outcome is the LAST field — robust to an embedded tab in tool/path.
    const ts = f[0], hook = f[1], outcomeRaw = f[f.length - 1];
    if (cutoff) {
      const t = Date.parse(ts);
      if (!Number.isNaN(t) && t < cutoff) continue;
    }
    const outcome = OUTCOMES.includes(outcomeRaw) ? outcomeRaw : 'other';
    const h = (report.hooks[hook] = report.hooks[hook] || blankHook());
    h.fires++;
    h[outcome] = (h[outcome] || 0) + 1;
    report.parsed++;
    report.totalFires++;
  }

  // Derive block rate + flags.
  for (const [name, h] of Object.entries(report.hooks)) {
    const bad = (h.block || 0) + (h.error || 0);
    h.blockRate = h.fires ? Number((bad / h.fires).toFixed(3)) : 0;
    if (h.blockRate >= HIGH_BLOCK_RATE && bad >= MIN_BLOCKS) {
      report.flags.push({
        hook: name,
        blockRate: h.blockRate,
        block: h.block || 0,
        error: h.error || 0,
        fires: h.fires,
        signal: 'high block/error rate — the agent is repeatedly fighting this rule (rule too strict, or guidance unclear)',
      });
    }
  }
  report.flags.sort((a, b) => b.blockRate - a.blockRate);

  if (opts.write !== false) writeReports(root, report);
  return report;
}

function blankHook() {
  const h = { fires: 0 };
  for (const o of OUTCOMES) h[o] = 0;
  return h;
}

function rel(root, p) {
  return path.relative(path.dirname(root), p).split(path.sep).join('/');
}

function writeReports(root, report) {
  if (!root) return;
  const dir = path.join(root, 'logs', 'eval');
  fs.mkdirSync(dir, { recursive: true });
  const base = path.join(dir, `hooks-${report.generated}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(`${base}.md`, renderMd(report));
}

function renderMd(r) {
  const L = [];
  L.push(`# Hooks-Log Evaluation — ${r.generated}`);
  L.push('');
  L.push(`- Layer 1 (mechanical) report over \`${r.source || 'hooks.log'}\`${r.sinceDays ? ` · last ${r.sinceDays} days` : ''}.`);
  L.push(`- ${r.totalFires} fires across ${Object.keys(r.hooks).length} hooks · ${r.flags.length} flagged · ${r.skipped} malformed line(s) skipped.`);
  L.push('- Advisory only — flowcode never gates on this report.');
  if (r.note) L.push(`- Note: ${r.note}.`);
  L.push('');
  if (!r.totalFires) {
    L.push('_No hook fires recorded._');
    L.push('');
    return L.join('\n');
  }
  L.push('## Per-Hook Outcomes');
  L.push('');
  L.push('| Hook | Fires | Pass | Warn | Error | Block | Block-rate |');
  L.push('|------|-------|------|------|-------|-------|------------|');
  const rows = Object.entries(r.hooks).sort((a, b) => b[1].blockRate - a[1].blockRate);
  for (const [name, h] of rows) {
    L.push(`| \`${name}\` | ${h.fires} | ${h.pass} | ${h.warn} | ${h.error} | ${h.block} | ${(h.blockRate * 100).toFixed(0)}% |`);
  }
  L.push('');
  if (r.flags.length) {
    L.push('## Flags');
    L.push('');
    for (const f of r.flags) {
      L.push(`- **\`${f.hook}\`** — ${(f.blockRate * 100).toFixed(0)}% block/error (${f.block} block, ${f.error} error of ${f.fires}). ${f.signal}`);
    }
    L.push('');
  }
  return L.join('\n');
}

// ── CLI ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const argv = process.argv.slice(2);
  let sinceDays = 0;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--since') sinceDays = Number(argv[++i]) || 0;
  }
  const root = resolveRoot();
  if (!root) {
    console.error('[eval-hooks-log] no .flowcode/ or flowcode/ found — run from the project root');
    process.exit(0);
  }
  const r = run({ root, sinceDays });
  console.log(`[eval-hooks-log] ${r.totalFires} fires · ${Object.keys(r.hooks).length} hooks · ${r.flags.length} flagged → logs/eval/hooks-${r.generated}.{md,json}`);
}

module.exports = { run, resolveRoot };
