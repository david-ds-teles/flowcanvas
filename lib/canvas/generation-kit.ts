// lib/canvas/generation-kit.ts — 004. Pure: no fs, no network, no DOM.
// SINGLE SOURCE OF TRUTH. MCP tool + MCP resource (Phase 3), DesignBrief.responseContract,
// the UI copy bundle (Phase 3), and docs/flowcanvas-agent-contract.md all render FROM here.
import { COMPONENT_KINDS } from './jsoncanvas'

export interface KitSections {
  systemPrompt: string
  schemaContract: string
  mcpHowTo: string
  workedExample: string
}

const SCHEMA_CONTRACT_BASE = `Return exactly one JSON object matching AgentResponse — no prose, no code fence, nothing outside it.
Echo briefId from the brief (it is the concurrency token).
Mint new ids with the "ag-" prefix; reuse an existing brief id to update that item.
To add a markdown file: include it in generatedFiles (full content INCLUDING YAML frontmatter) AND a matching upsertNodes entry { type:"file", file:"<same path>" }.
Reply to a comment by setting parentId to that comment's id from the brief and copying its anchor.
Keep coordinates on a 20px grid and place new nodes in empty regions.

EXTRACTION (design doc -> typed system-design board, NOT document cards):
- Map each component to one node and stamp meta.kind (see COMPONENT KINDS). Map each subsystem
  cluster to a group node (type:"group", label + optional shape, set members' parentId to it).
  A system/trust container is a group with meta.kind:"boundary". Map each documented
  relationship/arrow to a typed edge.
- Decompose node content into small generated .md files (one per node) under
  "<board-stem>.nodes/<slug>.md", each with frontmatter source: { path, anchor }.
- Never inline document prose into the .canvas; never delete or rewrite the source doc.
TYPED EDGES:
- Set rel from [references, depends-on, implements, derives-from, calls, produces, informs, related].
  Set label to a short human display (defaults to rel). Do NOT invent rel values. Use containment
  (parentId) for "contains", not an edge.`

const KIND_CATALOG = `COMPONENT KINDS (set meta.kind on a node; absent ⇒ a plain card):
- service   — a runtime process that executes logic (API, microservice, worker, gateway, function).
- datastore — persistent state (database, table, cache, blob/object store, search index).
- queue     — an asynchronous channel (broker, topic, stream, event bus, job queue).
- actor     — a human role / external user (persona, operator, admin, end user).
- external  — a third-party system/API outside the ownership boundary (payment gateway, SaaS).
- decision  — a branch/gate/conditional in a flow (router, policy check, switch, guard).
- process   — a step/activity/transform inside a flow that is not a deployable service.
- boundary  — a system/trust/bounded-context container. GROUP-ONLY: meta.kind:"boundary" is valid
              ONLY on a type:"group" node, never on a leaf node.
Do NOT invent kinds. Allowed set: ${COMPONENT_KINDS.join(', ')}.`

const SLUG_RULE = `SECTION ANCHORS (provenance, bidirectional linking):
- Stamp meta.source = { path:"<core doc path>", anchor:"<github-slug of the heading>" } on every
  extracted node so it links back to the doc section it came from.
- The anchor MUST be the github-slugger slug of the heading text (lowercase, spaces→"-",
  punctuation dropped). e.g. "## Order lifecycle" ⇒ "order-lifecycle".`

const SYSTEM_PROMPT = `You are a system-design draftsperson. Given a markdown design document, decompose
it into a TYPED system-design board (services, datastores, queues, actors, externals, decisions,
processes, boundaries) — not an arrangement of document cards. Every component is a node with a
meta.kind and a meta.source anchor back to the section it came from; every documented relationship is
a typed edge; every subsystem is a group (a boundary group for a trust/system container). Return only
the AgentResponse JSON defined by the schema contract below.`

const MCP_HOW_TO = `MCP LOOP (connected harness):
1. get_board → the DesignBrief (nodes/edges/comments + intent + responseContract + coreDocPath).
2. If coreDocPath is set, read_file(coreDocPath) for the full living core markdown.
3. Reason: decompose into typed components (meta.kind + meta.source).
4. write_file each derived "<board-stem>.nodes/<slug>.md" (.md/.mdx only).
5. apply_response(AgentResponse) — echo briefId; the tool merges + persists + bumps the revision.`

const WORKED_EXAMPLE = `WORKED EXAMPLE — input "## Order lifecycle\\nCheckout calls Payments, which writes Orders DB."
=> {
  "responseVersion":"0.1","briefId":"<echo>","summary":"Extracted order lifecycle",
  "upsertNodes":[
    {"id":"ag-checkout","type":"file","file":"board.nodes/checkout.md","x":0,"y":0,"width":260,"height":120,
     "kind":"service","source":{"path":"commerce-design.md","anchor":"order-lifecycle"}},
    {"id":"ag-orders","type":"file","file":"board.nodes/orders-db.md","x":320,"y":0,"width":260,"height":120,
     "kind":"datastore","source":{"path":"commerce-design.md","anchor":"order-lifecycle"}}
  ],
  "upsertEdges":[{"id":"ag-e1","fromNode":"ag-checkout","toNode":"ag-orders","rel":"produces","label":"writes"}],
  "generatedFiles":[
    {"path":"board.nodes/checkout.md","content":"---\\nsource:\\n  path: commerce-design.md\\n  anchor: order-lifecycle\\n---\\nCheckout service."}
  ]
}`

export function kitSections(): KitSections {
  return {
    systemPrompt: SYSTEM_PROMPT,
    schemaContract: [SCHEMA_CONTRACT_BASE, KIND_CATALOG, SLUG_RULE].join('\n\n'),
    mcpHowTo: MCP_HOW_TO,
    workedExample: WORKED_EXAMPLE,
  }
}

/** Render the full kit as one paste-ready markdown string; appends the doc payload when given. */
export function buildKit(markdown?: string): string {
  const k = kitSections()
  const parts = [
    '# Flowcanvas Agent Generation Kit',
    `## 1 · System prompt\n\n${k.systemPrompt}`,
    `## 2 · Schema contract\n\n${k.schemaContract}`,
    `## 3 · MCP loop\n\n${k.mcpHowTo}`,
    `## 4 · Worked example\n\n${k.workedExample}`,
  ]
  if (markdown != null) parts.push(`## 5 · Your document to convert\n\n\`\`\`markdown\n${markdown}\n\`\`\``)
  return parts.join('\n\n')
}
