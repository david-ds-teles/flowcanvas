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

CORE SPEC DOC (the board's single source of truth — REQUIRED):
- Every board is generated FROM one core markdown spec. If the brief carries coreDocPath, THAT file is
  the spec — read it (read_file) and decompose it; do not rewrite or delete it.
- If there is NO coreDocPath (extracting from an inline prompt / an empty board), FIRST author a single
  core spec doc "<board-stem>.md" (YAML frontmatter + ATX headings describing the WHOLE system) and put
  it in generatedFiles.
- ALWAYS set coreDocPath in your AgentResponse to that one core spec doc (the brief's coreDocPath, or the
  "<board-stem>.md" you just wrote). The app binds it as the living core spine (a docked pane) — it is NOT
  a canvas card. Do NOT add an upsertNodes entry for the core spec doc: it is the spine, never a board node.
- Every node's meta.source.path MUST point to THAT one core spec doc — a file that EXISTS (the brief's
  coreDocPath, or the "<board-stem>.md" you just wrote). NEVER cite a doc path you did not create: a
  dangling source path leaves the board with no readable specification.

EXTRACTION (core spec doc -> typed system-design board, NOT document cards):
- Map each component to one node, stamp meta.kind (see COMPONENT KINDS), and give it a "label": a short
  human name (<= 40 chars). Map each subsystem cluster to a group node (type:"group", label + optional
  shape, set members' parentId to it). A system/trust container is a group with meta.kind:"boundary".
  Map each documented relationship/arrow to a typed edge.
- Decompose node content into small generated .md files (one per node) under
  "<board-stem>.nodes/<slug>.md". Each MUST carry frontmatter with name: (the component display name),
  a one-line description:, and source: { path:"<core spec doc>", anchor } — so the widget shows a real
  name and role, never a bare slug.
- Never inline document prose into the .canvas.
TYPED EDGES:
- Set rel from [references, depends-on, implements, derives-from, calls, produces, informs, related].
  Set label to a short human display (defaults to rel). Do NOT invent rel values. Use containment
  (parentId) for "contains", not an edge.
EDGE STYLE (optional, per edge — full parity with the human style controls; omit any for clean defaults):
- routing: "smoothstep" (default, right-angle — cleanest for a system diagram) | "bezier" (curve) | "straight".
- line: "solid" (default) | "dashed" | "dotted".
- color: hex "#RRGGBB" or a preset "1".."6"; omit ⇒ stroke colored by provenance.
- fromEnd / toEnd: marker shape per end — "none" | "arrow" (default toEnd) | "arrow-open" | "circle" | "diamond".
- fromSide / toSide: pin an endpoint to "top"|"right"|"bottom"|"left". OMIT BOTH to let the edge FLOAT from
  the node center to the nearest perimeter point (the default — cleaner, fewer crossings). Pin only when a
  specific side genuinely reads better.
- labelT: 0..1 label position along the line (0.5 = midpoint); set it to move a label off a busy crossing.
- points: array of {x,y} waypoints (absolute canvas coords) the line bends through; omit ⇒ auto-route.`

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
0. Pick the target board path (canvasRef). To CREATE a new board, choose a fresh path like
   "boards/<name>.canvas" — apply_response creates it if it does not exist. To edit the board the human
   has open, call get_active_board first and use the canvasRef it returns. Every write (apply_response)
   REQUIRES an explicit canvasRef — there is no implicit "active board" for writes, so a generation can
   never overwrite the wrong board.
1. EXISTING board: get_board(canvasRef) → the DesignBrief (nodes/edges/comments + intent +
   responseContract + coreDocPath). NEW board: skip get_board — there is nothing to read yet.
2. If coreDocPath is set, read_file(coreDocPath) for the full living core markdown. If it is NOT set
   (a new board / inline prompt), you will author the core spec doc in step 4 before decomposing.
3. Reason: decompose into typed components (meta.kind + label + meta.source).
4. write_file the core spec "<board-stem>.md" FIRST (only when there was no coreDocPath), then each
   derived "<board-stem>.nodes/<slug>.md" (.md/.mdx only) with name:/description:/source: frontmatter.
5. apply_response({ canvasRef, response }) — echo briefId (any value for a brand-new board); set
   coreDocPath; the tool CREATES the board if the path is new, merges + persists + bumps the revision
   (and binds coreDocPath as the living spine — the core doc is the spine, never a canvas card).`

const WORKED_EXAMPLE = `WORKED EXAMPLE — input "## Order lifecycle\\nCheckout calls Payments, which writes Orders DB."
(no coreDocPath in the brief: author the core spec "board.md", set it as coreDocPath, and every node cites
it. The app binds "board.md" as the living spine — note board.md is NOT in upsertNodes; it is the spine, never a card.)
=> {
  "responseVersion":"0.1","briefId":"<echo>","summary":"Extracted order lifecycle","coreDocPath":"board.md",
  "upsertNodes":[
    {"id":"ag-checkout","type":"file","file":"board.nodes/checkout.md","label":"Checkout","x":0,"y":0,"width":260,"height":120,
     "kind":"service","source":{"path":"board.md","anchor":"order-lifecycle"}},
    {"id":"ag-orders","type":"file","file":"board.nodes/orders-db.md","label":"Orders DB","x":320,"y":0,"width":260,"height":120,
     "kind":"datastore","source":{"path":"board.md","anchor":"order-lifecycle"}}
  ],
  "upsertEdges":[{"id":"ag-e1","fromNode":"ag-checkout","toNode":"ag-orders","rel":"produces","label":"writes","color":"5"}],
  "generatedFiles":[
    {"path":"board.md","content":"---\\ntitle: Order system\\n---\\n## Order lifecycle\\nCheckout calls Payments, which writes Orders DB."},
    {"path":"board.nodes/checkout.md","content":"---\\nname: Checkout\\ndescription: Accepts orders and calls Payments\\nsource:\\n  path: board.md\\n  anchor: order-lifecycle\\n---\\nCheckout service."},
    {"path":"board.nodes/orders-db.md","content":"---\\nname: Orders DB\\ndescription: Persists orders\\nsource:\\n  path: board.md\\n  anchor: order-lifecycle\\n---\\nOrders datastore."}
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
