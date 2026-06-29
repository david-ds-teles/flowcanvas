'use client'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useCanvasStore } from '@/lib/canvas/store'
import type { AgentResponse, MergeReport } from '@/lib/canvas/brief'
import { buildKit, kitSections } from '@/lib/canvas/generation-kit'
import { parseFlowcanvasDoc } from '@/lib/canvas/validate'
import { readFileApi } from '@/lib/api'

// Right glass drawer for the agent round-trip:
//   Export tab  — build the self-contained DesignBrief, copy / download it for the agent.
//   Import tab  — paste the agent's AgentResponse, validate it, run the idempotent merge, show a report.
//   Kit tab     — the discoverable Agent Generation Kit (004): copy the full kit (system prompt +
//                 schema contracts + MCP loop + worked example + the attached core markdown) for any LLM.
type Tab = 'export' | 'import' | 'kit'
type KitNav = 'systemPrompt' | 'schemaContract' | 'mcpHowTo' | 'workedExample' | 'markdown'

interface ExportPanelProps {
  tab: Tab
  onTab: (tab: Tab) => void
  onClose: () => void
}

export function ExportPanel({ tab, onTab, onClose }: ExportPanelProps) {
  const buildBrief = useCanvasStore((s) => s.buildBrief)
  const applyResponse = useCanvasStore((s) => s.applyResponse)
  const importDoc = useCanvasStore((s) => s.importDoc)               // 004 Phase 5 — paste a full .canvas
  const importCanvasFile = useCanvasStore((s) => s.importCanvasFile) // 004 Phase 5 — upload a .canvas
  const dirty = useCanvasStore((s) => s.dirty)                       // 004 Phase 5 — dirty-guard the destructive import

  // Confirm before a destructive board-replace when there are unsaved changes (mirrors the dropzone guard).
  const confirmReplace = useCallback(() => !dirty || window.confirm('Replace the current board? Unsaved changes will be lost.'), [dirty])

  const [briefJson, setBriefJson] = useState<string>('')
  const [briefErr, setBriefErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [paste, setPaste] = useState('')
  const [report, setReport] = useState<MergeReport | null>(null)
  const [applyErr, setApplyErr] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ─── Kit tab (004) ───
  const coreDocPath = useCanvasStore((s) => s.doc?.flowcanvas.session.coreDocPath)
  const sections = useMemo(() => kitSections(), [])
  const [kitNav, setKitNav] = useState<KitNav>('systemPrompt')
  const [kitCopied, setKitCopied] = useState(false)
  const [coreMd, setCoreMd] = useState<string | null>(null)

  // Resolve the core-doc markdown to inline into the copied kit (raw, no size cap — design Q5).
  // Phase 3 ships the surface; coreDocPath is populated once the spine lands (Phase 4) — until then
  // the kit copies its base form (no attached doc).
  useEffect(() => {
    if (tab !== 'kit' || !coreDocPath) return
    let live = true
    readFileApi(coreDocPath)
      .then((c) => { if (live) setCoreMd(c) })
      .catch(() => { if (live) setCoreMd(null) })
    return () => { live = false }
  }, [tab, coreDocPath])

  const copyKit = useCallback(() => {
    void navigator.clipboard?.writeText(buildKit(coreMd ?? undefined))
    setKitCopied(true)
    setTimeout(() => setKitCopied(false), 1400)
  }, [coreMd])

  // Load .json… — read a saved AgentResponse file into the paste box; Apply/validate/stale flow unchanged.
  const onLoadFile = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setPaste(await f.text())
    e.target.value = '' // allow re-selecting the same file
  }, [])

  // 004 Phase 5 — Upload .canvas…: validate + migrate + adopt the chosen board (replaces the open board).
  const canvasRef = useRef<HTMLInputElement>(null)
  const onCanvasUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!f) return
    if (!confirmReplace()) return
    setApplyErr(null); setReport(null); setApplying(true)
    try {
      await importCanvasFile(f)
      onClose()
    } catch (err) {
      setApplyErr(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }, [importCanvasFile, onClose, confirmReplace])

  // Build the brief once per panel open (the first time the export tab is shown). Re-opening the panel
  // remounts this component and rebuilds; toggling Export↔Import within one session does NOT — each
  // build mints a new briefId into session.lastBriefId, so rebuilding on every tab focus would make a
  // freshly-pasted response look stale (qa Phase 7, Finding 3).
  const builtRef = useRef(false)
  useEffect(() => {
    if (tab !== 'export' || builtRef.current) return
    builtRef.current = true
    let live = true
    buildBrief()
      .then((b) => { if (live) { setBriefJson(JSON.stringify(b, null, 2)); setBriefErr(null) } })
      .catch((e: unknown) => { if (live) { builtRef.current = false; setBriefErr(e instanceof Error ? e.message : String(e)) } })
    return () => { live = false }
  }, [tab, buildBrief])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(briefJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }, [briefJson])

  const download = useCallback(() => {
    const blob = new Blob([briefJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'design-brief.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [briefJson])

  const apply = useCallback(async () => {
    setApplyErr(null); setReport(null)
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(paste) as Record<string, unknown>
    } catch {
      setApplyErr('Not valid JSON — paste an AgentResponse or a full .canvas (FlowcanvasDoc) object.')
      return
    }
    // 004 Phase 5 (Decision 5) — a pasted FULL board (has flowcanvas + nodes + edges, no responseVersion)
    // routes to the import path: zod-validate → migrate → adopt. An AgentResponse keeps the merge path.
    if (parsed.flowcanvas && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges) && !parsed.responseVersion) {
      if (!confirmReplace()) return
      setApplying(true)
      try {
        await importDoc(parseFlowcanvasDoc(parsed))
        onClose()
      } catch (e) {
        setApplyErr(e instanceof Error ? e.message : String(e))
      } finally {
        setApplying(false)
      }
      return
    }
    const resp = parsed as unknown as AgentResponse
    // Most common mistake: pasting the DesignBrief you just exported (it carries briefVersion, not
    // responseVersion) — explain the round-trip instead of a cryptic "missing field".
    if (parsed.briefVersion && !parsed.responseVersion) {
      setApplyErr('That looks like the DesignBrief you exported, not an agent reply. Hand the brief to your agent — Import expects the AgentResponse it returns (same briefId, "responseVersion": "0.1").')
      return
    }
    if (resp.responseVersion !== '0.1' || !resp.briefId) {
      setApplyErr('Missing responseVersion "0.1" or briefId — Import expects an AgentResponse or a full .canvas (FlowcanvasDoc) board.')
      return
    }
    setApplying(true)
    try {
      setReport(await applyResponse(resp))
    } catch (e) {
      setApplyErr(e instanceof Error ? e.message : String(e))
    } finally {
      setApplying(false)
    }
  }, [paste, applyResponse, importDoc, onClose, confirmReplace])

  return (
    <aside className="fc-agent" role="dialog" aria-label="Agent round-trip" data-testid="agent-panel">
      <header className="fc-agent__h">
        <div className="fc-agent__tabs">
          <button className="fc-agent__tab" data-testid="agent-tab-kit" aria-pressed={tab === 'kit'} onClick={() => onTab('kit')}>Kit</button>
          <button className="fc-agent__tab" data-testid="agent-tab-export" aria-pressed={tab === 'export'} onClick={() => onTab('export')}>Export</button>
          <button className="fc-agent__tab" data-testid="agent-tab-import" aria-pressed={tab === 'import'} onClick={() => onTab('import')}>Import</button>
        </div>
        <button className="fc-agent__x" data-testid="agent-close" aria-label="Close agent panel" onClick={onClose}>✕</button>
      </header>

      {tab === 'kit' ? (
        <div className="fc-agent__b" data-testid="generation-kit-modal">
          <p className="fc-agent__hint">
            The full Agent Generation Kit — hand it to any LLM, or a connected harness fetches it via{' '}
            <code>get_generation_kit()</code> · <code>flowcanvas://generation-kit</code>. The LLM returns one AgentResponse JSON — paste it under Import.
          </p>
          <div className="fc-kit__nav" role="tablist" aria-label="Kit sections">
            {([
              ['systemPrompt', 'System prompt'],
              ['schemaContract', 'Schema contracts'],
              ['mcpHowTo', 'MCP loop'],
              ['workedExample', 'Worked example'],
              ['markdown', '+ your markdown'],
            ] as [KitNav, string][]).map(([k, label]) => (
              <button key={k} type="button" role="tab" className="fc-kit__navbtn" aria-selected={kitNav === k} data-testid={`kit-nav-${k}`} onClick={() => setKitNav(k)}>
                {label}
              </button>
            ))}
          </div>
          <pre className="fc-kit__body" data-testid="kit-body">
            {kitNav === 'systemPrompt' ? sections.systemPrompt
              : kitNav === 'schemaContract' ? sections.schemaContract
              : kitNav === 'mcpHowTo' ? sections.mcpHowTo
              : kitNav === 'workedExample' ? sections.workedExample
              : coreDocPath ? (coreMd ?? 'Loading…')
              : 'No core doc attached yet. Once a core doc (the spine) is set, its markdown inlines here and into the copied kit. The base kit copies without a doc.'}
          </pre>
          <div className="fc-agent__row">
            <button className="fc-btn fc-btn--primary" data-testid="kit-copy" onClick={copyKit}>{kitCopied ? 'Copied ✓' : 'Copy full kit'}</button>
            {coreDocPath && <span className="fc-kit__attached">attaches <code>{coreDocPath}</code></span>}
          </div>
        </div>
      ) : tab === 'export' ? (
        <div className="fc-agent__b">
          <p className="fc-agent__hint">Copy this DesignBrief and hand it to your agent. It returns one AgentResponse JSON — paste it under Import.</p>
          {briefErr && <p className="fc-agent__msg fc-agent__msg--err">{briefErr}</p>}
          <textarea className="fc-agent__ta" data-testid="brief-json" readOnly value={briefJson} aria-label="DesignBrief JSON" />
          <div className="fc-agent__row">
            <button className="fc-btn fc-btn--primary" data-testid="brief-copy" disabled={!briefJson} onClick={copy}>{copied ? 'Copied ✓' : 'Copy brief'}</button>
            <button className="fc-btn" data-testid="brief-download" disabled={!briefJson} onClick={download}>Download</button>
          </div>
        </div>
      ) : (
        <div className="fc-agent__b" data-testid="import-modal">
          <p className="fc-agent__hint">Paste an agent <strong>AgentResponse</strong> (merges into the board) or a full <strong>.canvas</strong> board (validated → migrated → loaded). Or upload / drag-drop a <code>.canvas</code> onto the canvas.</p>
          <textarea
            className="fc-agent__ta"
            data-testid="import-paste"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder='AgentResponse { "responseVersion": "0.1", … }  ·  or a full .canvas { "flowcanvas": …, "nodes": [], "edges": [] }'
            aria-label="AgentResponse or FlowcanvasDoc JSON"
          />
          <div className="fc-agent__row">
            <button className="fc-btn" data-testid="response-load-file" aria-label="Load a .json response file" onClick={() => fileRef.current?.click()}>Load .json…</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden data-testid="response-file-input" onChange={(e) => void onLoadFile(e)} />
            <button className="fc-btn" data-testid="import-upload" aria-label="Upload a .canvas board file" disabled={applying} onClick={() => canvasRef.current?.click()}>Upload .canvas…</button>
            <input ref={canvasRef} type="file" accept=".canvas,application/json" hidden data-testid="import-upload-input" onChange={(e) => void onCanvasUpload(e)} />
            <button className="fc-btn fc-btn--primary fc-agent__apply" data-testid="response-apply" disabled={!paste.trim() || applying} onClick={() => void apply()}>{applying ? 'Applying…' : 'Apply'}</button>
          </div>
          {applyErr && <p className="fc-agent__msg fc-agent__msg--err" data-testid="apply-error">{applyErr}</p>}
          {report && (
            <div className="fc-agent__report" data-testid="apply-report">
              {report.stale && <p className="fc-agent__stale" data-testid="stale-warning">⚠ Stale — this response was built for an older export (briefId mismatch). Applied last-writer-wins.</p>}
              <ul className="fc-agent__counts">
                <li>created — {report.created.nodes} nodes · {report.created.edges} edges · {report.created.comments} comments</li>
                <li>updated — {report.updated.nodes} nodes · {report.updated.edges} edges</li>
                <li>removed — {report.removed.nodes} nodes · {report.removed.edges} edges</li>
                {report.generatedFiles.length > 0 && <li>wrote — {report.generatedFiles.join(', ')}</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
