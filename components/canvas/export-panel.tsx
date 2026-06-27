'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCanvasStore } from '@/lib/canvas/store'
import type { AgentResponse, MergeReport } from '@/lib/canvas/brief'

// Right glass drawer for the agent round-trip:
//   Export tab  — build the self-contained DesignBrief, copy / download it for the agent.
//   Import tab  — paste the agent's AgentResponse, validate it, run the idempotent merge, show a report.
type Tab = 'export' | 'import'

interface ExportPanelProps {
  tab: Tab
  onTab: (tab: Tab) => void
  onClose: () => void
}

export function ExportPanel({ tab, onTab, onClose }: ExportPanelProps) {
  const buildBrief = useCanvasStore((s) => s.buildBrief)
  const applyResponse = useCanvasStore((s) => s.applyResponse)

  const [briefJson, setBriefJson] = useState<string>('')
  const [briefErr, setBriefErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [paste, setPaste] = useState('')
  const [report, setReport] = useState<MergeReport | null>(null)
  const [applyErr, setApplyErr] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

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
    let resp: AgentResponse
    try {
      resp = JSON.parse(paste) as AgentResponse
    } catch {
      setApplyErr('Not valid JSON — paste exactly one AgentResponse object.')
      return
    }
    if (resp.responseVersion !== '0.1' || !resp.briefId) {
      setApplyErr('Missing responseVersion "0.1" or briefId — is this an AgentResponse?')
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
  }, [paste, applyResponse])

  return (
    <aside className="fc-agent" role="dialog" aria-label="Agent round-trip" data-testid="agent-panel">
      <header className="fc-agent__h">
        <div className="fc-agent__tabs">
          <button className="fc-agent__tab" data-testid="agent-tab-export" aria-pressed={tab === 'export'} onClick={() => onTab('export')}>Export</button>
          <button className="fc-agent__tab" data-testid="agent-tab-import" aria-pressed={tab === 'import'} onClick={() => onTab('import')}>Import</button>
        </div>
        <button className="fc-agent__x" data-testid="agent-close" aria-label="Close agent panel" onClick={onClose}>✕</button>
      </header>

      {tab === 'export' ? (
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
        <div className="fc-agent__b">
          <p className="fc-agent__hint">Paste the agent&apos;s AgentResponse JSON. Import writes any generated files, merges nodes/edges/comments, and persists.</p>
          <textarea
            className="fc-agent__ta"
            data-testid="response-paste"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder='{ "responseVersion": "0.1", "briefId": "…", … }'
            aria-label="AgentResponse JSON"
          />
          <div className="fc-agent__row">
            <button className="fc-btn fc-btn--primary" data-testid="response-apply" disabled={!paste.trim() || applying} onClick={() => void apply()}>{applying ? 'Applying…' : 'Apply response'}</button>
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
