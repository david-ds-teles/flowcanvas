<!-- GENERATED — do not hand-edit. Source of truth: kitSections().schemaContract in lib/canvas/generation-kit.ts. Regenerate via the same. -->

# Flowcanvas Agent Contract

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
  "<board-stem>.md" you just wrote). The app then binds it as the living core spine AND places a readable
  markdown card for it on the canvas automatically. This is the ONE exception to the generatedFiles +
  upsertNodes rule above: do NOT add your own upsertNodes entry for the core spec doc — the app owns its
  card (creation, placement, dedup).
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
- routing: "bezier" (default, curved) | "smoothstep" (right-angle) | "straight".
- line: "solid" (default) | "dashed" | "dotted".
- color: hex "#RRGGBB" or a preset "1".."6"; omit ⇒ stroke colored by provenance.
- fromEnd / toEnd: marker shape per end — "none" | "arrow" (default toEnd) | "arrow-open" | "circle" | "diamond".
- fromSide / toSide: pin an endpoint to "top"|"right"|"bottom"|"left". OMIT BOTH to let the edge FLOAT from
  the node center to the nearest perimeter point (the default — cleaner, fewer crossings). Pin only when a
  specific side genuinely reads better.
- labelT: 0..1 label position along the line (0.5 = midpoint); set it to move a label off a busy crossing.

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
