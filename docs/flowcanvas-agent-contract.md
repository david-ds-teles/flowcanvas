<!-- GENERATED — do not hand-edit. Source of truth: buildContractDoc() in lib/canvas/generation-kit.ts. Run `npm run gen:contract` to regenerate. -->

# Flowcanvas Agent Contract

RETURN CHECKLIST — every board MUST satisfy ALL of these (this is how the board is read; the server
re-checks them and reports violations back to you):
  [ ] Every component node has meta.kind + a <=40-char label + meta.source.anchor.
  [ ] Every subsystem is a type:"group" boundary, and EVERY member node sets parentId to it.
  [ ] Child node boxes sit visually INSIDE their group box (absolute coords; see GROUPS).
  [ ] Edges carry edgeType ONLY — fromEnd/toEnd OMITTED so the legend drives color+line+head.
  [ ] Every node's .md body is a STRUCTURED, CONCRETE spec (role + responsibilities + the real contract:
      routes/signatures/tables/config/thresholds + the key constraint & why) — never a one-paragraph summary.
  [ ] At least one type:"text" note captures a key decision / constraint / legend.
  [ ] coreDocPath is set, and every meta.source.path points to that one EXISTING doc.
A board that skips parentId, forces arrowheads, has no notes, or ships thin one-paragraph cards is
INCOMPLETE — fix it before returning.

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
  a one-line description:, and source: { path:"<core spec doc>", anchor }. Never inline document prose
  into the .canvas itself.
- The file BODY is a STRUCTURED, CONCRETE spec card — NOT a one-paragraph summary. Write it so a senior
  engineer understands the component's real contract from the card alone. Use this shape (drop a section
  only when the source genuinely has nothing for it):
    - a bold one-line ROLE — what it is and why it exists.
    - "**Responsibilities**" — 2-4 bullets of what it does.
    - "**Contract / Interface**" — the CONCRETE surface, pulled from the source: exact routes + HTTP
      methods + status codes, function/tool signatures + args, table + key columns, index types, enum
      values, config/env keys, model names, thresholds, quotas, timeouts. Real names and numbers, not
      paraphrase.
    - "**Talks to / depends on**" — its concrete neighbours + the protocol (e.g. "-> Postgres (asyncpg)",
      "<- arq queue").
    - "**Constraints & decisions**" — the load-bearing rule, risk + mitigation, or design decision AND why
      (e.g. an idempotency key, a retry budget, a tenancy/security invariant, a chosen library).
  Format with card-friendly markdown: a bold lead line, then "**Label**" runs with "-" bullet lists — NOT
  big "#" headings (they blow up the small card). Aim for 6-16 lines of real substance. Ground every
  detail in the cited section: extract real specifics, never invent an API the source does not state. A
  bare paragraph with no concrete contract is INCOMPLETE and the server will flag it back to you.

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
- Example: a "⚡ Async — max retry 3" note beside a queue, or a "Legend: cyan=data-flow …" overview note.

COMPONENT KINDS (set meta.kind on a node; absent ⇒ a plain card):
- service   — a runtime process that executes logic (API, microservice, worker, gateway, function).
- datastore — persistent state (database, table, cache, blob/object store, search index).
- queue     — an asynchronous channel (broker, topic, stream, event bus, job queue).
- actor     — a human role / external user (persona, operator, admin, end user).
- external  — a third-party system/API outside the ownership boundary (payment gateway, SaaS).
- decision  — a branch/gate/conditional in a flow (router, policy check, switch, guard).
- process   — a step/activity/transform inside a flow that is not a deployable service.
- boundary  — a system/trust/bounded-context container. GROUP-ONLY: meta.kind:"boundary" is valid
              ONLY on a type:"group" node, never on a leaf node.
Do NOT invent kinds. Allowed set: service, datastore, queue, actor, external, decision, process, boundary.

SECTION ANCHORS (provenance, bidirectional linking):
- Stamp meta.source = { path:"<core doc path>", anchor:"<github-slug of the heading>" } on every
  extracted node so it links back to the doc section it came from.
- The anchor MUST be the github-slugger slug of the heading text (lowercase, spaces→"-",
  punctuation dropped). e.g. "## Order lifecycle" ⇒ "order-lifecycle".

