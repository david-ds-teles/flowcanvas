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

const SCHEMA_CONTRACT_BASE = `RETURN CHECKLIST — every board MUST satisfy ALL of these (this is how the board is read; the server
re-checks them and reports violations back to you):
  [ ] Every component node has meta.kind + a <=40-char label + meta.source.anchor.
  [ ] Every subsystem is a type:"group" boundary, and EVERY member node sets parentId to it.
  [ ] Child node boxes sit visually INSIDE their group box (absolute coords; see GROUPS).
  [ ] Edges carry edgeType ONLY — fromEnd/toEnd OMITTED so the legend drives color+line+head.
  [ ] At least one type:"text" note captures a key decision / constraint / legend.
  [ ] coreDocPath is set, and every meta.source.path points to that one EXISTING doc.
A board that skips parentId, forces arrowheads, or has no notes is INCOMPLETE — fix it before returning.

Return exactly one JSON object matching AgentResponse — no prose, no code fence, nothing outside it.
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

EXTRACTION (core spec doc → typed system-design board, NOT document cards):
- Map each component to one node, stamp meta.kind (see COMPONENT KINDS), and give it a "label": a short
  human name (<= 40 chars). Map each documented relationship/arrow to a typed edge. Map each subsystem
  cluster to a group node (see GROUPS below — parentId is mandatory for every member node).
- Decompose node content into small generated .md files (one per node) under
  "<board-stem>.nodes/<slug>.md". Each MUST carry frontmatter with name: (the component display name),
  a one-line description:, and source: { path:"<core spec doc>", anchor }. The file BODY must include
  the relevant spec content extracted from that section — at minimum 2–4 sentences covering the
  component's role, technology choice, and key behaviour — so the canvas card shows real spec, not a
  bare name. Never inline document prose into the .canvas.

GROUPS (subsystem boundaries — parentId is MANDATORY on every member):
- For each subsystem cluster, create one type:"group" node with label and meta.kind:"boundary" (for a
  trust or system container).
- EVERY node inside a group MUST have parentId set to that group's id. A node without parentId is a
  top-level node that floats OUTSIDE the group on the canvas — it will not appear inside the boundary.
- Child node coordinates are ABSOLUTE canvas coords. Position each child so its bounding box falls
  INSIDE the group box (child.x >= group.x + ~40px padding, child.x + child.width <= group.x +
  group.width - 40px; same rule on y with extra top headroom for the group label). The layout engine
  resizes groups to enclose their children — size the group generously.
- Use containment (parentId) for "contains" relationships, not an edge.

TYPED EDGES (flow type — the PRIMARY edge meaning; the board is read by color/line/head):
- Set edgeType from [data-flow, request, response, event, dependency, reference]. It drives the edge's
  default color + line + arrowhead via the legend. Pick the one matching the documented arrow:
  a data write/produce ⇒ "data-flow"; a synchronous call ⇒ "request" (its return ⇒ "response");
  an async/published signal ⇒ "event"; a build/needs-it relation ⇒ "dependency"; a doc/see-also link
  ⇒ "reference". Omit ⇒ "reference". Set label to a short human display. Use containment (parentId) for
  "contains", not an edge.
- LEGEND (edgeType ⇒ {color, line, head}): data-flow = cyan · solid · arrow; request = amber · solid ·
  open-arrow; response = amber · dotted · open-arrow; event = violet · solid · diamond; dependency =
  grey · dashed · arrow; reference = grey · dotted · circle.
- rel (LEGACY, optional): the older taxonomy [references, depends-on, implements, derives-from, calls,
  produces, informs, related] is still accepted and maps to an edgeType — prefer edgeType.

EDGE STYLE (optional, per edge — OVERRIDES the edgeType legend default; omit any to keep the type's style):
- color: hex "#RRGGBB" or a preset "1".."6"; omit ⇒ the edgeType's legend color.
- line: "solid" | "dashed" | "dotted"; omit ⇒ the edgeType's legend line.
- fromEnd / toEnd: marker per end — "none" | "arrow" | "arrow-open" | "circle" | "diamond"; OMIT BOTH
  to let the edgeType legend control the head shapes (this is the default — the legend MUST drive
  arrowheads; only set these when a specific edge genuinely needs a non-standard marker).
- routing: "smoothstep" (default, right-angle — cleanest for a system diagram) | "bezier" (curve) | "straight".
- fromSide / toSide: pin an endpoint to "top"|"right"|"bottom"|"left". OMIT BOTH to let the edge attach at a
  connection dot facing the other node (the default — cleaner, fewer crossings). Pin only when a specific
  side genuinely reads better.
- Do NOT set fromPort / toPort — the system manages connection ports automatically. Use fromSide/toSide
  to pin a side, or omit both for auto-routing.
- labelT: 0..1 label position along the line (0.5 = midpoint); set it to move a label off a busy crossing.
- points: array of {x,y} waypoints (absolute canvas coords) the line bends through; omit ⇒ auto-route.

CANVAS NOTES (design callouts):
- Add type:"text" nodes for key design decisions, constraints, or legend callouts that don't map to a
  component. Set the text field to a concise markdown snippet. Position near the relevant area of the board.
- Example: a "⚡ Async — max retry 3" note beside a queue, or a "Legend: cyan=data-flow …" overview note.`

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

const SYSTEM_PROMPT = `You are a senior system-design draftsperson. Your output is a VISUAL system-design
diagram on an infinite canvas — it is read at a glance by SHAPE, COLOR, and CONTAINMENT, not by reading
text. A syntactically valid JSON that renders a flat, unreadable board is a FAILURE, not a pass. Use the
full canvas vocabulary, every time:

  • COMPONENTS — every service, datastore, queue, actor, external, decision, process is a typed node
    (meta.kind) with a short label and a meta.source anchor back to its spec section.
  • BOUNDARIES — every subsystem is a type:"group" boundary, and EVERY node inside it sets parentId to
    that group. A boundary with no parentId children renders as an empty box floating in dead space —
    the single most common defect. Never emit a group you do not populate via parentId.
  • TYPED EDGES — every relationship is an edgeType (data-flow/request/response/event/dependency/
    reference). The edgeType ALONE drives color + line + arrowhead via the legend. Do NOT set fromEnd/
    toEnd: forcing a plain "arrow" on every edge erases the very semantics the colors and heads carry.
  • NOTES — add type:"text" callouts for the key decisions, constraints, and a legend that the
    components cannot show on their own.

Decompose the document into this vocabulary, lay it out as a clean left-to-right flow, and return ONLY
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
   (and binds coreDocPath as the living spine — the core doc is the spine, never a canvas card).
6. Read the returned MergeReport.warnings — the server re-checks the visual rules (empty boundary
   groups, edges whose markers override the legend, missing notes). If warnings is non-empty, your board
   is incomplete: fix each one (set parentId, omit fromEnd/toEnd, add notes) in a follow-up apply_response.`

const WORKED_EXAMPLE = `WORKED EXAMPLE — input "## Order lifecycle\\nCheckout (service) calls Payments, which writes Orders DB.\\nAll three live inside the Backend boundary."

(No coreDocPath in the brief: author board.md first, set it as coreDocPath. board.md is NOT in upsertNodes
— it is the spine, never a canvas card. Groups: every member node sets parentId. Edges: omit fromEnd/toEnd
so the legend controls arrowheads from edgeType. Node files carry real spec content in their body.)

=> {
  "responseVersion":"0.1","briefId":"<echo>","summary":"Extracted order lifecycle: 1 boundary, 2 services, 1 datastore","coreDocPath":"board.md",
  "upsertNodes":[
    {"id":"ag-backend","type":"group","label":"Backend",
     "x":80,"y":60,"width":680,"height":280,
     "kind":"boundary","source":{"path":"board.md","anchor":"order-lifecycle"}},
    {"id":"ag-checkout","type":"file","file":"board.nodes/checkout.md",
     "x":120,"y":160,"width":260,"height":140,
     "kind":"service","source":{"path":"board.md","anchor":"order-lifecycle"},"parentId":"ag-backend"},
    {"id":"ag-orders","type":"file","file":"board.nodes/orders-db.md",
     "x":460,"y":160,"width":260,"height":140,
     "kind":"datastore","source":{"path":"board.md","anchor":"order-lifecycle"},"parentId":"ag-backend"}
  ],
  "upsertEdges":[
    {"id":"ag-e1","fromNode":"ag-checkout","toNode":"ag-orders","edgeType":"data-flow","label":"writes"}
  ],
  "generatedFiles":[
    {"path":"board.md","content":"---\\ntitle: Order system\\n---\\n## Order lifecycle\\nCheckout (service) calls Payments and writes to Orders DB. All three live inside the Backend boundary."},
    {"path":"board.nodes/checkout.md","content":"---\\nname: Checkout\\ndescription: Entry-point service for the order flow\\nsource:\\n  path: board.md\\n  anchor: order-lifecycle\\n---\\nCheckout validates cart items, calls Payments for authorization, and persists confirmed orders to Orders DB. Stateless and horizontally scalable."},
    {"path":"board.nodes/orders-db.md","content":"---\\nname: Orders DB\\ndescription: Persistent store for confirmed orders\\nsource:\\n  path: board.md\\n  anchor: order-lifecycle\\n---\\nPostgreSQL datastore for all confirmed orders. Append-mostly with soft-deletes. Indexed on user_id + created_at for feed queries."}
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

/**
 * Render `docs/flowcanvas-agent-contract.md` from the single source (`kitSections().schemaContract`).
 * The committed file MUST equal this output — `contract-sync.test.ts` fails on drift, and
 * `npm run gen:contract` rewrites it. This is the "visible sync" guard: the contract doc can never
 * silently fall out of step with the contract the MCP serves.
 */
export function buildContractDoc(): string {
  return [
    '<!-- GENERATED — do not hand-edit. Source of truth: buildContractDoc() in lib/canvas/generation-kit.ts. Run `npm run gen:contract` to regenerate. -->',
    '# Flowcanvas Agent Contract',
    kitSections().schemaContract,
    '',
  ].join('\n\n')
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
