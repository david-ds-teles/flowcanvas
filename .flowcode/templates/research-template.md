---
name: {slug}-research
description: Research artifact on {Topic} — findings, recommendations, and sources for the question that triggered it.
status: complete
tags: [research, findings]
links: []
---

# Research: {Topic}

- {Decision-ready digest: "Use X because Y" — the key finding to act on.}
- Status {complete|partial|stale}; dated {DATE}.
- Triggered by: {question or task that prompted this research}.
- Sources consulted: {URLs or docs — list all}.

---

## Summary

{2–4 sentences. The key finding an agent can act on without reading further. Decision-ready language: "Use X because Y" not "X and Y are both options."}

---

## Findings

### {Subtopic 1}

{Detailed finding. Include code examples when they clarify the finding.}

```{language}
{example}
```

### {Subtopic 2}

{Finding.}

### {Subtopic 3}

{Finding. Add or remove subtopics as needed.}

---

## Conclusions & Recommendations

{What the agent should do based on this research. If there are options, state clearly which to pick and why. Be concrete — no hedging.}

---

## Caveats & Expiry

{Things that may become outdated. Library version constraints. Date-sensitive information. Note if this research should be refreshed before a specific version upgrade or after a certain date.}

---

## Raw Sources

| Source | URL | Relevance |
|--------|-----|-----------|
| | | |

---

## Update Discipline (append-only)

Never overwrite or delete prior findings. When the research is re-visited, append a new `## Update YYYY-MM-DD` section below and flip the top-of-file `Status:` to `complete`, `partial`, or `stale` based on the update.

### Example

```markdown
## Update 2026-05-12

**Trigger:** React Query 5.30 released; prior findings were against 5.0.

**Changes:**
- `useInfiniteQuery` now returns a `pageParams` array alongside `pages` — previous advice about manual page-boundary tracking is superseded.
- Suspense mode API is stable as of 5.28; remove the "experimental" caveat in Subtopic 2.

**Verdict:** Prior findings remain correct for core queries; suspense-specific guidance is now stable.
```

Update entries stack newest-last at the bottom of the file, so the reading order is Summary → original Findings → chronological Updates.
