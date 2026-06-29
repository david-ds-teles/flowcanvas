'use strict';
/**
 * flowcode-eval.js — orchestrator for the flowcode evaluation system.
 *
 * Runs Layer 1 (hooks-log aggregator) and Layer 2 (static artifact scorer)
 * inline — both are dependency-free Node, so the orchestrator just require()s
 * them and calls run(). Layer 3 (the LLM judge) cannot be spawned from a script,
 * so for layer 3|all the orchestrator PRINTS the exact dispatch instruction the
 * `flowcode:evaluate` skill (or the operator) then executes.
 *
 * Writes a combined `<root>/logs/eval/summary-{YYYY-MM-DD}.md`. Evaluation is
 * advisory and never gates anything — exit code is always 0.
 *
 * Usage (from the project root that contains .flowcode/ or flowcode/):
 *     node .flowcode/eval/flowcode-eval.js [--layer 1|2|3|all] [--plan PREFIX] [--since N] [--root DIR] [--retain N]
 *   --layer   which layer(s) to run (default: all)
 *   --plan    scope Layer 2 + the Layer 3 dispatch to one plan PREFIX
 *   --since   Layer 1 only — count log lines from the last N days
 *   --root    treat DIR as the flowcode root (default: auto-probe .flowcode/ then flowcode/)
 *   --retain  keep only the newest N days of dated snapshots (hooks-/static-/summary-{date});
 *             older sets are pruned at the end of a run (default: 10). {PREFIX}.json and
 *             trend.jsonl are append-by-design and never pruned. Use --retain 0 to disable.
 */

const fs = require('fs');
const path = require('path');

const hooksLog = require('./eval-hooks-log.js');
const artifacts = require('./eval-artifacts.js');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const argv = process.argv.slice(2);
  let layer = 'all', plan = null, sinceDays = 0, rootOverride = null, retain = 10;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--layer') layer = String(argv[++i]);
    else if (a === '--plan') plan = argv[++i];
    else if (a === '--since') sinceDays = Number(argv[++i]) || 0;
    else if (a === '--root') rootOverride = argv[++i];
    else if (a === '--retain') retain = Math.max(0, Number(argv[++i]) || 0);
  }

  const root = rootOverride || hooksLog.resolveRoot();
  if (!root) {
    console.error('[eval] no .flowcode/ or flowcode/ found — run from the project root');
    process.exit(0);
  }

  if (!['all', '1', '2', '3'].includes(layer)) {
    console.error(`[eval] unrecognized --layer "${layer}" — use 1, 2, 3, or all (default). Nothing to run.`);
    process.exit(0);
  }

  const want = (n) => layer === 'all' || layer === String(n);
  const summary = { generated: today(), root: path.basename(root) };
  const lines = [];

  if (want(1)) {
    const r = hooksLog.run({ root, sinceDays });
    const flagNote = r.flags.length ? ` · ${r.flags.length} flagged (${r.flags.map((f) => `${f.hook} ${(f.blockRate * 100).toFixed(0)}%`).join(', ')})` : '';
    lines.push(`[eval] layer 1 — hooks.log: ${r.totalFires} fires across ${Object.keys(r.hooks).length} hooks${flagNote}`);
  }

  if (want(2)) {
    const r = artifacts.run({ root, plan });
    const med = artifacts.median(r.plans.map((p) => p.score));
    const lowest = r.plans.length ? r.plans[r.plans.length - 1] : null;
    const lowNote = lowest ? ` · lowest: ${lowest.prefix} ${lowest.score}${lowest.absent.length ? ` (${lowest.absent.join(', ')} absent)` : ''}` : '';
    lines.push(`[eval] layer 2 — ${r.plans.length} plans scored · median ${med}/100${lowNote}`);
  }

  if (want(3)) {
    const scope = plan ? `--plan ${plan}` : '--plan <PREFIX> (one dispatch per plan)';
    lines.push(`[eval] layer 3 — dispatch (session-isolated, read-only): flowcode:evaluator-agent ${scope}`);
    lines.push('[eval]           the orchestrator cannot spawn an agent — run via the flowcode:evaluate skill or dispatch the agent manually.');
  }

  writeSummary(root, summary, lines);
  lines.push(`[eval] wrote logs/eval/summary-${summary.generated}.md`);
  const prunedCount = pruneSnapshots(path.join(root, 'logs', 'eval'), retain);
  if (prunedCount) lines.push(`[eval] retention: pruned ${prunedCount} dated snapshot file(s) beyond the newest ${retain} day(s)`);
  console.log(lines.join('\n'));
  process.exit(0);
}

// Keep only the newest `keep` days of dated snapshots in logs/eval/, deleting
// older `hooks-/static-/summary-{date}` sets. These are regenerable headlines;
// the durable history (`{PREFIX}.json`, `trend.jsonl`) is append-by-design and
// never matched here. keep <= 0 disables pruning.
function pruneSnapshots(dir, keep) {
  if (!Number.isFinite(keep) || keep <= 0) return 0;
  let names;
  try { names = fs.readdirSync(dir); } catch (_) { return 0; }
  const dated = /^(?:hooks|static|summary)-(\d{4}-\d{2}-\d{2})\.(?:md|json)$/;
  const dates = new Set();
  for (const n of names) { const m = n.match(dated); if (m) dates.add(m[1]); }
  const sorted = [...dates].sort(); // ascending YYYY-MM-DD (lexicographic == chronological)
  const drop = new Set(sorted.slice(0, Math.max(0, sorted.length - keep)));
  if (!drop.size) return 0;
  let removed = 0;
  for (const n of names) {
    const m = n.match(dated);
    if (m && drop.has(m[1])) { try { fs.unlinkSync(path.join(dir, n)); removed++; } catch (_) {} }
  }
  return removed;
}

function writeSummary(root, summary, lines) {
  const dir = path.join(root, 'logs', 'eval');
  fs.mkdirSync(dir, { recursive: true });
  const L = [];
  L.push(`# Evaluation Summary — ${summary.generated}`);
  L.push('');
  L.push(`- Combined Layer 1 + Layer 2 headlines for \`${summary.root}\`; Layer 3 is dispatched separately (LLM judge).`);
  L.push('- Advisory only — flowcode never gates on evaluation output.');
  L.push('- Per-layer detail: `hooks-{date}.md`, `static-{date}.md` in this directory; per-plan judge scores in `{PREFIX}.json` + `trend.jsonl`.');
  L.push('');
  L.push('## Headlines');
  L.push('');
  L.push('```text');
  for (const l of lines) L.push(l);
  L.push('```');
  L.push('');
  fs.writeFileSync(path.join(dir, `summary-${summary.generated}.md`), L.join('\n'));
}

if (require.main === module) main();

module.exports = { main };
