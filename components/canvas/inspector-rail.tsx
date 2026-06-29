'use client'
import { useState } from 'react'
import { useCanvasStore } from '@/lib/canvas/store'
import { extractRefs } from '@/lib/canvas/refs'
import type { DocRef } from '@/lib/canvas/refs'
import { isFileNode, nodeKind, COMPONENT_KIND_META } from '@/lib/canvas/jsoncanvas'
import { normPath } from '@/lib/canvas/spine'
import { nodeDisplayName } from '@/lib/canvas/node-name'
// studio-inspector.css is loaded via app/globals.css (matches the project's CSS-centralization convention).

export function InspectorRail({
  mode,
  setMode,
}: {
  mode: 'inspector' | 'submit' | 'review'
  setMode: (m: 'inspector' | 'submit' | 'review') => void
}) {
  // ── store subscriptions (must all precede any early return per Rules of Hooks) ──
  const doc          = useCanvasStore((s) => s.doc)
  const selectedIds  = useCanvasStore((s) => s.selectedIds)
  const bodies       = useCanvasStore((s) => s.bodies)
  const navigateRef  = useCanvasStore((s) => s.navigateRef)
  const highlightSpineSection = useCanvasStore((s) => s.highlightSpineSection)   // 004 Phase 4 — § → spine
  const removeNode   = useCanvasStore((s) => s.removeNode)
  const submitToAgent = useCanvasStore((s) => s.submitToAgent)
  const reviewDiff   = useCanvasStore((s) => s.reviewDiff)
  const reviewState  = useCanvasStore((s) => s.reviewState)   // subscribe so the review button re-renders reactively
  const focusNode    = useCanvasStore((s) => s.focusNode)

  // ── local state (submit panel) ──
  const [intent, setIntent]   = useState('')
  const [scope, setScope]     = useState<'board' | 'selection'>('board')
  const [sending, setSending] = useState(false)

  // ── derived: single-selected node ──
  const selectedNode = doc?.nodes.find(
    (n) => selectedIds.length === 1 && n.id === selectedIds[0],
  ) ?? null

  // ── diff (drives review button state + badge count); gated on the subscribed reviewState ──
  const diff = reviewState ? reviewDiff() : null
  const diffCount = diff
    ? diff.nodes.added.length + diff.nodes.updated.length + diff.nodes.removed.length +
      diff.edges.added.length + diff.edges.updated.length + diff.edges.removed.length +
      diff.comments.added.length
    : 0

  // ── OUT / IN edges for the selected node ──
  const outEdges = doc && selectedNode
    ? doc.edges.filter((e) => e.fromNode === selectedNode.id)
    : []
  const inEdges = doc && selectedNode
    ? doc.edges.filter((e) => e.toNode === selectedNode.id)
    : []

  // ── comments anchored to the selected node (root threads only) ──
  const nodeComments = doc && selectedNode
    ? doc.flowcanvas.comments.filter((c) => c.parentId === null && c.anchor.kind === 'node' && c.anchor.nodeId === selectedNode.id)
    : []

  // ── extracted refs (file nodes only) ──
  const refs: DocRef[] = selectedNode && isFileNode(selectedNode)
    ? extractRefs(
        selectedNode.file,
        selectedNode.meta?.frontmatter,
        bodies[selectedNode.id],
      )
    : []

  // ── is a given ref target already on the board? (mirrors store.ts navigateRef logic) ──
  const isOnBoard = (ref: DocRef): boolean => {
    if (!doc) return false
    return doc.nodes.some((n) =>
      ref.isExternal
        ? n.type === 'link' && n.url === ref.target
        : isFileNode(n) && normPath(n.file) === normPath(ref.target),
    )
  }

  // ── submit handler ──
  // Scope-aware submit: 'selection' narrows the brief to the selected nodes' structural closure
  // (store stamps session.briefScope; buildBrief honours it). An empty selection falls back to the
  // whole board (store treats an empty scope as unscoped).
  const handleSend = async () => {
    if (!intent.trim() || sending) return
    const scopeIds = scope === 'selection' && selectedIds.length > 0 ? selectedIds : undefined
    setSending(true)
    try {
      await submitToAgent(intent.trim(), scopeIds)
      setIntent('')
      setMode('inspector')
    } finally {
      setSending(false)
    }
  }

  // ── review mode: the shell owns this panel; render nothing ──
  if (mode === 'review') return null

  // ─────────────────────────── SUBMIT PANEL ───────────────────────────
  if (mode === 'submit') {
    return (
      <div className="fc-insp" data-testid="submit-panel" aria-label="Submit to agent">
        {/* header */}
        <div className="fc-insp__pane-hd">
          <div>
            <b>Submit round</b>
            <div className="fc-insp__pane-sub">MCP · harness-relay</div>
          </div>
          <button
            type="button"
            className="fc-insp__x"
            aria-label="Back to inspector"
            onClick={() => setMode('inspector')}
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div className="fc-insp__pane-body">
          {/* MCP status pill */}
          <div
            className="fc-insp__mcp fc-insp__mcp--ok"
            data-testid="submit-mcp-status"
          >
            <span className="fc-insp__mcp-dot" aria-hidden="true" />
            MCP ready
          </div>

          {/* intent field */}
          <div className="fc-insp__field">
            <label htmlFor="fc-insp-intent">Intent for this round</label>
            <textarea
              id="fc-insp-intent"
              className="fc-insp__intent"
              data-testid="submit-intent"
              value={intent}
              placeholder="e.g. Decompose checkout into services + typed call/produces edges…"
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  void handleSend()
                }
              }}
            />
          </div>

          {/* scope field */}
          <div className="fc-insp__field">
            <label id="fc-insp-scope-lbl">Scope</label>
            <div
              className="fc-insp__scope"
              role="group"
              aria-labelledby="fc-insp-scope-lbl"
              data-testid="submit-scope"
            >
              <button
                type="button"
                aria-pressed={scope === 'board'}
                onClick={() => setScope('board')}
              >
                Whole board
              </button>
              <button
                type="button"
                aria-pressed={scope === 'selection'}
                onClick={() => setScope('selection')}
              >
                Selection{selectedIds.length > 0 ? ` · ${selectedIds.length}` : ''}
              </button>
            </div>
            <div className="fc-insp__snote" data-testid="submit-scope-note">
              {scope === 'selection'
                ? selectedIds.length > 0
                  ? <>The agent brief is <strong>narrowed</strong> to your {selectedIds.length} selected node{selectedIds.length === 1 ? '' : 's'} (plus their groups and members). The full board is still saved and reviewed.</>
                  : <>Nothing is selected — the <strong>whole board</strong> will be sent.</>
                : <>The <strong>whole board</strong> goes in the agent brief.</>}
            </div>
            <div className="fc-insp__snote">
              On send: the board saves, a submit-time <strong>snapshot</strong> is captured to{' '}
              <code>&lt;board&gt;.review.json</code>, and the active-board pointer is handed to your
              harness. Change-review opens on return.
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="fc-insp__pane-foot">
          <button
            type="button"
            className="fc-insp__btn-send"
            data-testid="submit-send"
            disabled={sending || !intent.trim()}
            onClick={() => void handleSend()}
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            {sending ? 'Sending…' : 'Send round'}
            <span className="fc-insp__kbd">⌘↵</span>
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────── INSPECTOR PANEL (default) ───────────────────────────
  return (
    <div className="fc-insp" data-testid="inspector" aria-label="Node inspector">
      {/* header */}
      <div className="fc-insp__hd">
        <div className="fc-insp__nm">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 5h16v14H4z" />
            <path d="M7 15V9l3 3 3-3v6" />
          </svg>
          {selectedNode ? nodeDisplayName(selectedNode) : 'No selection'}
        </div>
        <div className="fc-insp__meta">
          {selectedNode && (
            <>
              {selectedNode.meta?.kind && (
                <span className="fc-insp__ckind" data-testid="inspector-kind" data-kind={selectedNode.meta.kind}>
                  {COMPONENT_KIND_META[selectedNode.meta.kind]?.label ?? selectedNode.meta.kind}
                </span>
              )}
              <span className="fc-insp__kind">{nodeKind(selectedNode)}</span>
              <span className="fc-insp__selpill">selected</span>
            </>
          )}
        </div>
      </div>

      {/* scrollable body */}
      <div className="fc-insp__body">
        {!selectedNode && (
          <p className="fc-insp__empty">Select a node to inspect its details.</p>
        )}

        {selectedNode && (
          <>
            {/* node actions — delete the selected widget (the .md/asset on disk is untouched) */}
            <div className="fc-insp__nodeact">
              <button
                type="button"
                className="fc-insp__del"
                data-testid="inspector-delete"
                title="Delete this node from the board (the file on disk is kept)"
                onClick={() => removeNode(selectedNode.id)}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                Delete node
              </button>
            </div>

            {/* provenance — meta.source (Decision 2) */}
            {selectedNode.meta?.source && (
              <div className="fc-insp__src" data-testid="inspector-source">
                <div className="fc-insp__src-content">
                  <div className="fc-insp__src-lbl">source</div>
                  <div className="fc-insp__src-path">
                    {selectedNode.meta.source.path}
                    {selectedNode.meta.source.anchor ? `#${selectedNode.meta.source.anchor}` : ''}
                  </div>
                </div>
                {selectedNode.meta.source.anchor && (
                  <button
                    type="button"
                    className="fc-insp__src-foc"
                    data-testid="inspector-spine-section"
                    aria-label="Highlight this section in the core-doc spine"
                    title="Highlight in the core-doc spine"
                    onClick={() => highlightSpineSection(selectedNode.meta!.source!.anchor!)}
                  >
                    §
                  </button>
                )}
                <button
                  type="button"
                  className="fc-insp__src-foc"
                  aria-label="Focus source doc on board"
                  onClick={() => {
                    const src = selectedNode.meta!.source!
                    void navigateRef(selectedNode.id, {
                      kind: 'link',
                      target: src.path,
                      anchor: src.anchor,
                      isExternal: false,
                    })
                  }}
                >
                  ↗
                </button>
              </div>
            )}

            {/* OUT relations */}
            {outEdges.length > 0 && (
              <div className="fc-insp__relsec" data-testid="inspector-relations-out">
                <div className="fc-insp__rl-h">
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  Out relations
                  <span className="fc-insp__rl-ct">{outEdges.length}</span>
                </div>
                {outEdges.map((e) => {
                  const target = doc!.nodes.find((n) => n.id === e.toNode)
                  const tName = target ? nodeDisplayName(target) : e.toNode
                  return (
                    <div key={e.id} className="fc-insp__relrow">
                      {e.meta?.rel && (
                        <span className="fc-insp__reye">{e.meta.rel}</span>
                      )}
                      <span className="fc-insp__rtgt">
                        → {tName}{e.label ? ` · ${e.label}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* IN relations */}
            {inEdges.length > 0 && (
              <div className="fc-insp__relsec" data-testid="inspector-relations-in">
                <div className="fc-insp__rl-h">
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M19 12H5M11 6L5 12l6 6" />
                  </svg>
                  In relations
                  <span className="fc-insp__rl-ct">{inEdges.length}</span>
                </div>
                {inEdges.map((e) => {
                  const src = doc!.nodes.find((n) => n.id === e.fromNode)
                  const sName = src ? nodeDisplayName(src) : e.fromNode
                  return (
                    <div key={e.id} className="fc-insp__relrow">
                      {e.meta?.rel && (
                        <span className="fc-insp__reye">{e.meta.rel}</span>
                      )}
                      <span className="fc-insp__rtgt">
                        {sName} →{e.label ? ` · ${e.label}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* comments anchored to the selected node */}
            {nodeComments.length > 0 && (
              <div className="fc-insp__relsec" data-testid="inspector-comments">
                <div className="fc-insp__rl-h">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  Comments on this node
                  <span className="fc-insp__rl-ct">{nodeComments.length}</span>
                </div>
                {nodeComments.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="fc-insp__cmt"
                    data-testid="inspector-comment-row"
                    onClick={() => focusNode(selectedNode.id)}
                  >
                    <span className="fc-insp__cmt-badge">{c.badge ?? '•'}</span>
                    <span className="fc-insp__cmt-main">
                      <span className="fc-insp__cmt-who">{c.author}{c.resolvedAt ? ' · resolved' : ''}</span>
                      <span className="fc-insp__cmt-tx">{c.text.slice(0, 80)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* refs (file nodes only — Decision 9) */}
            {refs.length > 0 && (
              <div className="fc-insp__relsec">
                <div className="fc-insp__rl-h">
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 15l6-6M8 12l-2 2a3 3 0 104 4l2-2M16 12l2-2a3 3 0 10-4-4l-2 2" />
                  </svg>
                  References
                  <span className="fc-insp__rl-ct">{refs.length}</span>
                </div>
                <div className="fc-insp__refbox">
                  {refs.map((ref, i) => {
                    const onBoard = isOnBoard(ref)
                    const label = ref.target.split('/').pop() ?? ref.target
                    return (
                      <button
                        // biome-ignore lint/suspicious/noArrayIndexKey: refs are positionally stable within a node render
                        key={i}
                        type="button"
                        className={`fc-insp__lchip${onBoard ? ' fc-insp__lchip--on' : ''}`}
                        data-testid="link-chip"
                        data-on={onBoard ? 'true' : 'false'}
                        title={ref.target}
                        onClick={() => void navigateRef(selectedNode.id, ref)}
                      >
                        <span className="fc-insp__lchip-arr" aria-hidden="true">↗</span>
                        <span>{label}</span>
                        <span
                          className="fc-insp__lchip-st"
                          data-testid={onBoard ? 'refnav-focus' : 'refnav-add'}
                        >
                          {onBoard ? 'focus' : 'add'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* footer — inspector actions */}
      <div className="fc-insp__actions">
        <button
          type="button"
          className="fc-insp__ibtn fc-insp__ibtn--primary"
          data-testid="inspector-submit"
          onClick={() => setMode('submit')}
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          Submit round
        </button>
        <button
          type="button"
          className="fc-insp__ibtn"
          data-testid="inspector-review"
          disabled={!diff}
          aria-disabled={!diff}
          onClick={() => setMode('review')}
        >
          Review
          {diff && diffCount > 0 && (
            <span className="fc-insp__ndot">{diffCount}</span>
          )}
        </button>
      </div>
    </div>
  )
}
