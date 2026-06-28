'use client'

import { useState } from 'react'
import { useCanvasStore } from '@/lib/canvas/store'
import { nodeKind } from '@/lib/canvas/jsoncanvas'
import type { CanvasNode, NodeKind } from '@/lib/canvas/jsoncanvas'

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Human-readable display name for any node type. */
function displayName(node: CanvasNode): string {
  switch (node.type) {
    case 'file': {
      const parts = node.file.split('/')
      return parts[parts.length - 1]
    }
    case 'link': {
      try {
        const u = new URL(node.url)
        return u.hostname + (u.pathname !== '/' ? u.pathname : '')
      } catch {
        return node.url
      }
    }
    case 'text': {
      const t = node.text.trim()
      return t.length > 40 ? `${t.slice(0, 40)}…` : t || '(note)'
    }
    case 'group':
      return node.label || '(group)'
  }
}

// ─── kind glyph ──────────────────────────────────────────────────────────────

function KindGlyph({ kind }: { kind: NodeKind }) {
  const cls = `fc-srail__kg fc-srail__kg--${kind}`
  const base = {
    className: cls,
    viewBox: '0 0 24 24' as const,
    width: 15,
    height: 15,
    fill: 'none' as const,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  switch (kind) {
    case 'markdown':
      return (
        <svg {...base}>
          <path d="M4 5h16v14H4z" />
          <path d="M7 15V9l3 3 3-3v6" />
        </svg>
      )
    case 'image':
      return (
        <svg {...base}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.4" />
          <path d="M5 17l5-5 4 4 2-2 3 3" />
        </svg>
      )
    case 'link':
      return (
        <svg {...base}>
          <path d="M9 15l6-6M8 12l-2 2a3 3 0 104 4l2-2M16 12l2-2a3 3 0 10-4-4l-2 2" />
        </svg>
      )
    case 'note':
      return (
        <svg {...base}>
          <path d="M5 7h14M5 12h14M5 17h9" />
        </svg>
      )
    case 'group':
      return (
        <svg {...base}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
        </svg>
      )
    case 'file':
    default:
      return (
        <svg {...base}>
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v4h4" />
        </svg>
      )
  }
}

// ─── chevron ─────────────────────────────────────────────────────────────────

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`fc-srail__chev${expanded ? '' : ' fc-srail__chev--collapsed'}`}
      viewBox="0 0 24 24"
      width={12}
      height={12}
      fill="none"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// ─── node row ────────────────────────────────────────────────────────────────

interface NodeRowProps {
  node: CanvasNode
  selected: boolean
  onSelect: (id: string) => void
}

function NodeRow({ node, selected, onSelect }: NodeRowProps) {
  const kind = nodeKind(node)
  return (
    <button
      type="button"
      className={`fc-srail__item${selected ? ' fc-srail__item--sel' : ''}`}
      data-testid="tree-node"
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(node.id)}
    >
      <KindGlyph kind={kind} />
      <span className="fc-srail__tn">{displayName(node)}</span>
    </button>
  )
}

// ─── group section ───────────────────────────────────────────────────────────

interface GroupSectionProps {
  groupId: string           // synthetic "__ungrouped__" for the ungrouped bucket
  label: string
  items: CanvasNode[]       // member nodes (not React children — avoids react/no-children-prop)
  expanded: boolean
  onToggle: (id: string) => void
  selectedIds: string[]
  onSelect: (id: string) => void
}

function GroupSection({ groupId, label, items, expanded, onToggle, selectedIds, onSelect }: GroupSectionProps) {
  return (
    <div className="fc-srail__sec">
      <button
        type="button"
        className="fc-srail__grp"
        data-testid="tree-group"
        aria-expanded={expanded}
        onClick={() => onToggle(groupId)}
      >
        <ChevronIcon expanded={expanded} />
        <span className="fc-srail__gname">{label}</span>
        <span className="fc-srail__gcount">{items.length}</span>
      </button>
      {expanded && (
        <div className="fc-srail__kids">
          {items.map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              selected={selectedIds.includes(node.id)}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── main export ─────────────────────────────────────────────────────────────

export function StructureRail() {
  const doc = useCanvasStore((s) => s.doc)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const focusNode = useCanvasStore((s) => s.focusNode)

  const [filter, setFilter] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  if (!doc) return null

  const q = filter.toLowerCase().trim()

  const matchesFilter = (node: CanvasNode): boolean =>
    !q || displayName(node).toLowerCase().includes(q)

  const toggleGroup = (id: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleSelect = (id: string) => focusNode(id)   // select + center the canvas on the node

  // Build sections: one per group node, trailing "Ungrouped" for parentId-less non-group nodes
  const groupNodes = doc.nodes.filter((n) => n.type === 'group')
  const childrenOf = (groupId: string) =>
    doc.nodes.filter((n) => n.parentId === groupId && n.type !== 'group')
  const ungroupedNodes = doc.nodes.filter((n) => !n.parentId && n.type !== 'group')

  return (
    <div className="fc-srail">
      {/* Filter input */}
      <div className="fc-srail__filterbar">
        <svg className="fc-srail__filterbar-icon" viewBox="0 0 24 24" aria-hidden>
          <circle cx="11" cy="11" r="6" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          className="fc-srail__filter-input"
          data-testid="tree-filter"
          placeholder="Filter nodes…"
          aria-label="Filter structure tree"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Group sections */}
      {groupNodes.map((group) => {
        const allChildren = childrenOf(group.id)
        const visible = allChildren.filter(matchesFilter)
        // When filter is active and no children survive, hide the whole group
        if (q && visible.length === 0) return null
        return (
          <GroupSection
            key={group.id}
            groupId={group.id}
            label={displayName(group)}
            items={visible}
            expanded={!collapsedGroups.has(group.id)}
            onToggle={toggleGroup}
            selectedIds={selectedIds}
            onSelect={handleSelect}
          />
        )
      })}

      {/* Ungrouped section — only rendered when there are ungrouped non-group nodes */}
      {(() => {
        if (ungroupedNodes.length === 0) return null
        const visible = ungroupedNodes.filter(matchesFilter)
        if (q && visible.length === 0) return null
        const sectionId = '__ungrouped__'
        return (
          <GroupSection
            groupId={sectionId}
            label="Ungrouped"
            items={visible}
            expanded={!collapsedGroups.has(sectionId)}
            onToggle={toggleGroup}
            selectedIds={selectedIds}
            onSelect={handleSelect}
          />
        )
      })()}
    </div>
  )
}
