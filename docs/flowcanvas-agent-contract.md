<!-- GENERATED — do not hand-edit. Source of truth: kitSections().schemaContract in lib/canvas/generation-kit.ts. Regenerate via the same. -->

# Flowcanvas Agent Contract

Return exactly one JSON object matching AgentResponse — no prose, no code fence, nothing outside it.
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
  (parentId) for "contains", not an edge.

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
