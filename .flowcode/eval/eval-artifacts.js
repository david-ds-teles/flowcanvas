'use strict';
/**
 * eval-artifacts.js — Layer 2 of the flowcode evaluation system (static, free).
 *
 * Walks every `<root>/plans/{PREFIX}/` folder and scores each plan's artifacts
 * by structural (regex) checks — a blunt, deterministic proxy for "are the
 * expected artifacts present at the expected depth". The nuance (is this design
 * actually good?) is Layer 3's job; this layer is the free signal that runs
 * everywhere with no tokens.
 *
 * Rubric per plan (max 100 over APPLICABLE categories):
 *   design 30 · plan 25 · qa-report 15 · changelog 10 · technical-overview 10*
 *   · test-notes 5* · log 5      (* post-completion — N/A unless plan complete)
 * N/A categories are excluded from the denominator so a mid-flight plan is not
 * penalized for artifacts it should not have yet.
 *
 * Emits `<root>/logs/eval/static-{YYYY-MM-DD}.{md,json}`. Dependency-free Node
 * (core modules only); offline; never throws (no plans → empty report, exit 0).
 *
 * Usage (from the project root that contains .flowcode/ or flowcode/):
 *     node .flowcode/eval/eval-artifacts.js [--plan PREFIX] [--root DIR]
 */

const fs = require('fs');
const path = require('path');

const WIDE_TABLE_COLS = 7; // a table with this many columns or more is "wide"

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

// True median (averages the two central values for even-length inputs).
function median(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ── per-artifact scorers ─────────────────────────────────────────────────────
// Each returns { earned, max, detail, present }.

function scoreDesign(text) {
  const d = {};
  d.ddl = /```sql|^#{2,3}.*\b(data model|schema|ddl)\b/im.test(text) ? 6 : 0;
  d.alternatives = /^#{2,3}.*\b(considered|alternativ|rejected|trade-?off|deliberat)/im.test(text) ? 5 : 0;
  d.mermaid = /```mermaid/i.test(text) ? 4 : 0;
  d.scope = /\b(in scope|out of scope|out-of-scope|scope bound)/i.test(text) ? 5 : 0;
  d.risks = /^#{2,3}.*\brisk/im.test(text) ? 5 : 0;
  d.refs = /(researches\/|references\/|^#{2,3}.*\bresearch)/im.test(text) ? 5 : 0;
  return sum(d, 30);
}

function scorePlan(text) {
  const d = {};
  const phaseHeaders = (text.match(/^## Phase \d+/gm) || []).length;
  d.phases = phaseHeaders >= 1 ? 8 : 0;
  let depth = 0;
  if (/```/.test(text)) depth += 3;          // production-ready snippet
  if (/^\s*-\s\[[ x]\]/m.test(text)) depth += 3; // checkbox steps
  if (/\b(acceptance|quality check|gates?)\b/i.test(text)) depth += 2;
  d.activeDepth = depth;
  d.touchedModules = /touched modules/i.test(text) ? 4 : 0;
  d.stubConvention = /depends on|phase status/i.test(text) ? 5 : 0;
  return sum(d, 25);
}

function scoreQa(text) {
  const d = {};
  d.stackGate = /stack gate/i.test(text) ? 8 : 0;
  d.findingSection = /^#{3,4}\s*finding/im.test(text) ? 4 : 0;
  d.noWideTable = maxTableCols(text) >= WIDE_TABLE_COLS ? 0 : 3;
  return sum(d, 15);
}

function scoreChangelog(text) {
  const d = {};
  d.present = text.trim().length > 0 ? 5 : 0;
  d.perPhase = /^## Phase \d+/m.test(text) ? 5 : 0;
  return sum(d, 10);
}

function scoreTechOverview(text) {
  const d = {};
  d.substantive = stripped(text).length > 200 ? 10 : (text.trim() ? 5 : 0);
  return sum(d, 10);
}

function scoreTestNotes(text) {
  const d = {};
  d.substantive = stripped(text).length > 200 ? 5 : (text.trim() ? 2 : 0);
  return sum(d, 5);
}

function scoreLog(text) {
  const d = {};
  d.created = /\[PLAN CREATED\]/.test(text) ? 3 : 0;
  d.entries = /\[PHASE|\[PLAN COMPLETE\]/.test(text) ? 2 : 0;
  return sum(d, 5);
}

// ── plan scan ────────────────────────────────────────────────────────────────

function run(opts) {
  opts = opts || {};
  const root = opts.root || resolveRoot();
  const plansDir = root ? path.join(root, 'plans') : null;

  const report = { generated: today(), root: root ? path.basename(root) : null, plans: [], project: projectHealth(root) };

  let dirs = [];
  if (plansDir && fs.existsSync(plansDir)) {
    dirs = fs.readdirSync(plansDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => !opts.plan || name === opts.plan)
      .sort();
  }

  for (const prefix of dirs) {
    const folder = path.join(plansDir, prefix);
    const files = fs.readdirSync(folder).filter((f) => f.endsWith('.md'));
    const read = (suffix) => {
      const f = files.find((x) => x.endsWith(suffix));
      return f ? fs.readFileSync(path.join(folder, f), 'utf8') : null;
    };
    const planText = read('-plan.md');
    const logText = read('-log.md');
    const complete = isComplete(planText, logText);

    const cats = {};
    cats['design.md'] = withText(read('-design.md'), scoreDesign);
    cats['plan.md'] = withText(planText, scorePlan);
    cats['qa-report.md'] = withText(read('-qa-report.md'), scoreQa);
    cats['changelog.md'] = withText(read('-changelog.md'), scoreChangelog);
    cats['technical-overview.md'] = withText(read('-technical-overview.md'), scoreTechOverview, !complete);
    cats['test-notes.md'] = withText(read('-test-notes.md'), scoreTestNotes, !complete);
    cats['log.md'] = withText(logText, scoreLog);

    let earned = 0, applicableMax = 0;
    const breakdown = {};
    const absent = [];
    for (const [name, c] of Object.entries(cats)) {
      if (c.na) { breakdown[name] = 'N/A'; continue; }
      earned += c.earned;
      applicableMax += c.max;
      breakdown[name] = c.earned;
      if (!c.present) absent.push(name);
    }
    report.plans.push({
      prefix,
      complete,
      score: applicableMax ? Math.round((earned / applicableMax) * 100) : 0,
      earned,
      applicableMax,
      breakdown,
      absent,
      detail: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, v.detail || (v.na ? 'N/A' : v.present ? {} : 'absent')])),
    });
  }

  report.plans.sort((a, b) => b.score - a.score);
  if (opts.write !== false) writeReports(root, report);
  return report;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function withText(text, scorer, na) {
  if (na) return { na: true, present: text != null };
  if (text == null) return { earned: 0, max: scorerMax(scorer), present: false, detail: 'absent' };
  const r = scorer(text);
  r.present = true;
  return r;
}

// The max a scorer can award (derived by scoring an all-true synthetic is brittle;
// instead each scorer reports its own max via sum()).
function scorerMax(scorer) {
  return SCORER_MAX.get(scorer) || 0;
}
const SCORER_MAX = new Map([
  [scoreDesign, 30], [scorePlan, 25], [scoreQa, 15],
  [scoreChangelog, 10], [scoreTechOverview, 10], [scoreTestNotes, 5], [scoreLog, 5],
]);

function sum(detail, max) {
  const earned = Object.values(detail).reduce((a, b) => a + b, 0);
  return { earned, max, detail };
}

function isComplete(planText, logText) {
  if (logText && /\[PLAN COMPLETE\]/.test(logText)) return true;
  if (planText && /(^|\n)\s*\**status:?\**\s*:?\s*\**\s*complete/i.test(planText)) return true;
  return false;
}

function stripped(text) {
  return text.replace(/^---[\s\S]*?---/, '').replace(/[#*`>\-|]/g, '').trim();
}

function maxTableCols(text) {
  let max = 0;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith('|') && t.endsWith('|')) {
      const cols = t.split('|').length - 2; // leading+trailing empty
      if (cols > max) max = cols;
    }
  }
  return max;
}

function projectHealth(root) {
  if (!root) return null;
  const overview = path.join(root, 'project', 'project-overview.md');
  const log = path.join(root, 'project', 'project-log.md');
  const has = (p) => fs.existsSync(p);
  let skeleton = null;
  if (has(overview)) {
    const t = fs.readFileSync(overview, 'utf8');
    skeleton = /\{[A-Za-z ]+\}|TODO|placeholder/i.test(t) && stripped(t).length < 400;
  }
  return {
    overviewPresent: has(overview),
    overviewSkeleton: skeleton,
    projectLogPresent: has(log),
  };
}

function writeReports(root, report) {
  if (!root) return;
  const dir = path.join(root, 'logs', 'eval');
  fs.mkdirSync(dir, { recursive: true });
  const base = path.join(dir, `static-${report.generated}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(`${base}.md`, renderMd(report));
}

function renderMd(r) {
  const L = [];
  const med = median(r.plans.map((p) => p.score));
  L.push(`# Static Artifact Evaluation — ${r.generated}`);
  L.push('');
  L.push(`- Layer 2 (structural) rubric over ${r.plans.length} plan folder(s)${r.root ? ` under \`${r.root}/plans/\`` : ''}.`);
  L.push(`- Median score ${med}/100. Scores measure artifact presence + structural depth, not qualitative quality (that is Layer 3).`);
  L.push('- Advisory only — flowcode never gates on this report.');
  if (r.project) {
    L.push(`- Project docs: overview ${r.project.overviewPresent ? (r.project.overviewSkeleton ? 'present (skeleton)' : 'present') : 'missing'}, project-log ${r.project.projectLogPresent ? 'present' : 'missing'}.`);
  }
  L.push('');
  if (!r.plans.length) {
    L.push('_No plan folders found._');
    L.push('');
    return L.join('\n');
  }
  L.push('## Scores');
  L.push('');
  L.push('| Plan | Score | Earned/Max | Complete | Absent artifacts |');
  L.push('|------|-------|------------|----------|------------------|');
  for (const p of r.plans) {
    L.push(`| \`${p.prefix}\` | ${p.score} | ${p.earned}/${p.applicableMax} | ${p.complete ? 'yes' : 'no'} | ${p.absent.length ? p.absent.join(', ') : '—'} |`);
  }
  L.push('');
  L.push('## Per-Plan Breakdown');
  L.push('');
  for (const p of r.plans) {
    const parts = Object.entries(p.breakdown).map(([k, v]) => `${k} ${v}`).join(' · ');
    L.push(`- **\`${p.prefix}\`** (${p.score}/100): ${parts}`);
  }
  L.push('');
  return L.join('\n');
}

// ── CLI ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const argv = process.argv.slice(2);
  let plan = null, rootOverride = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--plan') plan = argv[++i];
    else if (argv[i] === '--root') rootOverride = argv[++i];
  }
  const root = rootOverride || resolveRoot();
  if (!root) {
    console.error('[eval-artifacts] no .flowcode/ or flowcode/ found — run from the project root');
    process.exit(0);
  }
  const r = run({ root, plan });
  console.log(`[eval-artifacts] ${r.plans.length} plans scored · median ${median(r.plans.map((p) => p.score))}/100 → logs/eval/static-${r.generated}.{md,json}`);
}

module.exports = { run, resolveRoot, median };
