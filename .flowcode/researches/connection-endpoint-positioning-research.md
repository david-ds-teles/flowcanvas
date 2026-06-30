---
name: connection-endpoint-positioning-research
description: Connection endpoint interaction mechanics across professional design tools — visibility, draggability, snapping, and disambiguation from shape-move/new-connection gestures.
status: complete
tags: [research, canvas, interaction, ux]
links: []
---

# Research: Connection Endpoint Positioning in Professional Design Tools

- **Key finding:** Drag a selected endpoint's visible dot to reposition it. Auto-snapping to cardinal-side magnets is the default (center on fast drag, precise on slow). Hold a modifier (Ctrl/Cmd) to bypass snap and position freely. Cursor is `grab` on hover, `grabbing` during drag. Hit target is 24–48px to exceed Fitts's Law; visible dot is smaller (8–12px).
- Status: complete; dated 2026-06-30.
- Triggered by: Need to implement moving a connection's endpoint dot along a rectangular shape's border in React Flow, matching canonical UX.
- Sources consulted: Figma/FigJam Help, tldraw Docs, Excalidraw DeepWiki, Miro Docs, React Flow Docs, drag-drop design patterns (Atlassian, Marvel).

---

## Summary

Professional design tools consistently treat connection endpoints as **selectable, draggable dots** on a **selected connector** (not directly on the shape). Figma/FigJam snaps endpoints to cardinal side magnets (top, right, bottom, left, center) by default; tldraw binds based on drag velocity (fast → center, slow → precise location) and respects Alt/Option modifiers; Excalidraw shows a visual binding cue (faint outline) and allows free repositioning until released; Miro uses a snapTo enum (auto, top, right, bottom, left) or continuous x/y coordinates. React Flow uses **fixed discrete handle positions** (not moving along edges). All tools show the endpoint dot when the connector is selected; the dot is grab-able (cursor: grab on hover), with a hit target of 24–48px to exceed Fitts's Law. **To disambiguate from shape-move:** the gesture is "select the connector → grab the endpoint → drag" — never a direct drag from the shape itself.

---

## Findings

### 1. Endpoint Representation & Visibility

**Figma/FigJam:**
- Endpoints are represented as **blue dots** on the connector line.
- Dots are **only visible when the connector is selected**. Unselected connectors show no dots.
- Each endpoint (start and end) has its own draggable dot.
- Source: [Create diagrams and flows with connectors in FigJam](https://help.figma.com/hc/en-us/articles/1500004414542-Create-diagrams-and-flows-with-connectors-in-FigJam)

**tldraw:**
- Endpoints are **handles** (interactive control points) on the arrow/connector shape.
- Handles appear **when the arrow is selected**; unselected arrows hide handles.
- Each arrow has two handles (start and end), positioned at endpoint coordinates.
- Source: [Handles – tldraw Docs](https://tldraw.dev/docs/handles)

**Excalidraw:**
- Endpoints are the **start and end points of an arrow**, managed by the Linear Element Editor.
- Dots are visible when the arrow is selected; no dots when unselected (though points are still bindable).
- Binding is indicated by a **faint outline** around the target shape when the endpoint approaches it.
- Source: [Linear Element Editor | excalidraw/excalidraw | DeepWiki](https://deepwiki.com/excalidraw/excalidraw/3.3-linear-element-editor), [Element Binding System](https://deepwiki.com/excalidraw/excalidraw/3.2-element-binding-system)

**Miro:**
- Endpoints are **terminal points** with a snapTo property (auto, top, right, bottom, left) or explicit x/y coordinates.
- In the UI, endpoints are visible as connection anchors; explicit visibility state not documented in public Help.
- The model supports **both discrete snap points and continuous x/y coordinates**.
- Source: [Work with connectors – Miro Developers](https://developers.miro.com/docs/work-with-connectors)

**React Flow:**
- Endpoints are **Handle components**, fixed to discrete positions (Top, Bottom, Left, Right) on a node.
- Handles appear **when the node is selected** (by default); visibility is controlled via CSS (`visibility: hidden`/`opacity: 0`).
- **Handles do NOT move along edges**; they are static attachment points. Custom positioning requires inline styles or CSS overrides.
- Source: [The Handle component – React Flow](https://reactflow.dev/api-reference/components/handle), [Handles – React Flow](https://reactflow.dev/learn/customization/handles)

### 2. Gesture to Reposition an Endpoint Along the Perimeter

**Figma/FigJam (Snapping + Free):**
- **Select the connector** → **Click and drag the blue dot** of the endpoint you want to move.
- By default, the endpoint **snaps to cardinal magnet points**: TOP, LEFT, BOTTOM, RIGHT, CENTER (for elbowed connectors); CENTER and NONE (for straight connectors as of 2024).
- **To position freely (no snap):** Hold **⌘ Cmd (Mac) or Ctrl (Windows)** while dragging; the endpoint will not snap to object sides and can be placed anywhere on the shape or in open space.
- Source: [Create diagrams and flows with connectors in FigJam](https://help.figma.com/hc/en-us/articles/1500004414542-Create-diagrams-and-flows-with-connectors-in-FigJam)

**tldraw (Velocity + Modifier):**
- **Select the arrow** → **Click and drag the handle** at the endpoint.
- **Default behavior (no modifier):**
  - **Fast drag:** arrow binds to the **shape's center** (imprecise binding).
  - **Slow drag:** arrow binds **precisely to your cursor location** on the shape edge.
- **Alt or Option modifier:** Arrow binds **exactly to the point under the cursor** regardless of speed.
- **Shift modifier:** Handle snaps to **15-degree angles** (for angle-constrained dragging).
- Additional snapping to nearby geometry (shapes, alignment guides) is applied automatically.
- Source: [Snapping – tldraw Docs](https://tldraw.dev/sdk-features/snapping), [Handles – tldraw Docs](https://tldraw.dev/docs/handles)

**Excalidraw (Free Drag + Grid Snap):**
- **Select the arrow** → **Drag the endpoint** (arrowhead or start point).
- Endpoint moves **freely** as you drag; no mandatory snap to sides (though grid snapping may be active).
- **Visual cue:** A **faint outline** around the target shape appears when the endpoint is near a bindable shape.
- **To position on the grid:** Drag naturally.
- **To bypass grid snap:** Hold **Ctrl (Windows) or Cmd (Mac)** while dragging.
- For elbow arrows, only the endpoints (index 0 or last) can be bound.
- Source: [Linear Element Editor | excalidraw/excalidraw | DeepWiki](https://deepwiki.com/excalidraw/excalidraw/3.3-linear-element-editor), [Revert arrow binding when moving single arrow – Issue #8802](https://github.com/excalidraw/excalidraw/issues/8802)

**Miro (API-Driven):**
- No explicit UI gesture documented in Help Center.
- **Programmatically:** Set the endpoint's `snapTo` property (auto, top, right, bottom, left) or `position.x` / `position.y` coordinates.
- Coordinates are normalized: x ∈ [0.0, 1.0] (left to right), y ∈ [0.0, 1.0] (top to bottom).
- **Cannot mix:** must choose either `snapTo` OR `position` coordinates, not both.
- Source: [Work with connectors – Miro Developers](https://developers.miro.com/docs/work-with-connectors)

**React Flow (Static Positions, No Per-Edge Repositioning):**
- Handles are **fixed to discrete side positions** (Top, Bottom, Left, Right) and **do NOT move continuously along an edge**.
- To move a handle, you must **update the node's position/size or re-render with a different handle configuration**.
- **No direct "drag endpoint along edge" interaction.** Handles are connection points, not movable anchors.
- If you need multiple handles on one side, position them with CSS (`top`, `left` properties) but they remain static until code updates the node.
- Source: [The Handle component – React Flow](https://reactflow.dev/api-reference/components/handle)

### 3. Disambiguation: Move Endpoint vs. Create Connection vs. Move Shape

**Figma/FigJam:**
- **Move endpoint:** Select the connector → drag its blue dot.
- **Create a new connection:** With the connector tool active, drag from one object to another (or leave endpoint unattached).
- **Move the shape:** Select the shape (not the connector) → drag anywhere on it. Connectors attached to the shape move with it automatically.
- **Clear rule:** Endpoint dots are only on selected connectors; shapes themselves have no dots. Grab the dot to move an endpoint; grab the shape to move it.

**tldraw:**
- **Move endpoint:** Select the arrow → drag a handle.
- **Create a new arrow:** Use the Arrow tool → click and drag to create a new arrow.
- **Move the shape:** Select the shape (not an arrow) → drag it. Arrows bound to the shape adjust their endpoints automatically.
- **Clear rule:** Handles only appear on selected shapes; selecting the arrow (not its bound target shape) reveals handles for repositioning.

**Excalidraw:**
- **Move endpoint:** Select the arrow → drag an endpoint. Visual binding cue (faint outline) appears on approach.
- **Create a new arrow:** Use the arrow tool in the toolbar → click and drag.
- **Move the shape:** Select the shape → drag it. Arrows bound to the shape adjust automatically.
- **Clear rule:** Arrow endpoints are part of the arrow's geometry. You select the arrow itself to edit its endpoints; selecting a shape allows you to move it without affecting arrow positioning (unless the arrow is bound, in which case the binding is maintained).

**Miro:**
- **Move endpoint:** Select the connector → drag an endpoint (UI interaction not fully documented, but API-level repositioning is via snapTo or position x/y).
- **Create a new connector:** Use the Connector tool → click on start shape, then target shape.
- **Move the shape:** Select the shape → drag it. Connectors attached to the shape maintain their binding and adjust.
- **Clear rule:** Same as others—shape and connector selection are distinct.

**React Flow:**
- **Move endpoint:** Not a native gesture. Endpoints are fixed attachment points. To change where a connection attaches, manually rewire the edge's `sourceHandle` / `targetHandle` or move the handle element via node position/size changes.
- **Create a new connection:** Use the connectionMode setting and drag from a handle to another handle.
- **Move the shape:** Select the node → drag it. Connected edges update automatically.
- **Clear rule:** Handles are attachment points, not repositionable anchors. React Flow does not support dragging an endpoint along a node's edge.

### 4. Hit Target, Affordance, Cursor Feedback

**General UX Principles (across all tools):**

**Hit Target Size:**
- Professional design tools use a **24–48px hit target** for draggable handles/dots, following Fitts's Law.
- The **visible dot** is smaller (typically 8–12px), but the grab area extends beyond it.
- Source: [Drag-and-drop patterns – Atlassian Design](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines)

**Cursor Feedback:**
- **Hover (not dragging):** `cursor: grab` (indicates the element is draggable).
- **During drag:** `cursor: grabbing` (indicates active dragging).
- Only the draggable part (the dot/handle) should show `grab`; the connector line itself does not.
- Source: [How to Change Cursor to a Hand Pointer – TheLinuxCode](https://thelinuxcode.com/change-cursor-to-a-hand-pointer-in-css/)

**Visual Affordance (Figma/FigJam):**
- Blue dots on selected connectors are the primary affordance.
- No explicit hover-grow documented, but the selection state (blue dot visibility) is the main cue.

**Visual Affordance (tldraw):**
- Handles are the affordance; they appear on selection.
- Snapping feedback shows visual indicators (alignment lines) when a handle aligns with nearby geometry.

**Visual Affordance (Excalidraw):**
- The arrow endpoints are the affordance.
- **Faint outline around the target shape** is the binding cue when dragging an endpoint near it.
- No explicit cursor change documented.

**Visual Affordance (Miro):**
- Connection points are visual anchors on the connector.
- Snapping behavior is implicit via the snapTo property.

**Visual Affordance (React Flow):**
- Handles are grey circles by default; selection state controls visibility.
- No built-in "drag along edge" interaction, so no affordance for this gesture.
- Cursor feedback is not specified in the Handle component API but can be customized via styles.

### 5. Connection Point Model: Continuous vs. Discrete

**Figma/FigJam (Discrete with Center Option):**
- Elbowed connectors snap to **TOP, LEFT, BOTTOM, RIGHT, CENTER**.
- Straight connectors snap to **CENTER and NONE** (as of 2024).
- Endpoints can snap to any of these predefined points; **no arbitrary perimeter positioning** by default.
- With **Ctrl/Cmd held**, endpoints move **freely** to any position on or near the shape (approaching continuous).
- **Fixed point support:** Yes, each magnet is a fixed cardinal or center point.
- **Arbitrary perimeter (continuous t):** Only with modifier; otherwise discrete.
- Source: [LAUNCHED: Custom connection points on shapes in FigJam – Figma Forum](https://forum.figma.com/suggest-a-feature-11/launched-custom-connection-points-on-shapes-in-figjam-36105)

**tldraw (Continuous with Discrete Binding Options):**
- Arrow endpoints bind **continuously** along a shape's perimeter by default (fast drag → center, slow drag → precise location on edge).
- Predefined snap points (cardinal sides, corners) are available via the snapping system but are not mandatory.
- **Fixed point support:** Via the snapping system (snap points defined per shape).
- **Arbitrary perimeter (continuous t):** Yes, slow drag binds precisely to cursor location; Alt/Option respects exact point under cursor.
- Source: [Snapping – tldraw Docs](https://tldraw.dev/sdk-features/snapping)

**Excalidraw (Mostly Discrete, Grid-Aligned):**
- Arrows bind to shapes via the **Element Binding System**, which uses normalized coordinates `[x, y]` ∈ [0, 1] × [0, 1].
- Binding stores a `fixedPoint` (e.g., [0.5, 0] for top center, [1.0, 0.5] for right center).
- **Free endpoint placement:** Endpoints can be positioned anywhere, but binding is to discrete cardinal or center points on the target shape.
- **Grid alignment:** Endpoints snap to the grid by default (hold Ctrl to disable).
- **Fixed point support:** Yes, cardinal and center points (top, bottom, left, right, center).
- **Arbitrary perimeter (continuous t):** No; binding is to predefined points. Free positioning is outside the shape, not along its edge.
- Source: [Element Binding System | excalidraw/excalidraw | DeepWiki](https://deepwiki.com/excalidraw/excalidraw/3.2-element-binding-system)

**Miro (Dual Model: Discrete or Continuous):**
- Endpoints can attach via **snapTo enum**: auto, top, right, bottom, left (discrete cardinal points).
- **OR** endpoints can attach via **position.x / position.y** (continuous coordinates, normalized ∈ [0, 1]).
- **Cannot mix:** Must choose either snapTo or position, not both.
- **Fixed point support:** Yes, via snapTo enum.
- **Arbitrary perimeter (continuous t):** Yes, via position coordinates.
- Source: [Work with connectors – Miro Developers](https://developers.miro.com/docs/work-with-connectors)

**React Flow (Discrete, Static Positions Only):**
- Handles are **fixed to discrete side positions**: Top, Bottom, Left, Right (and custom offsets via CSS).
- **No dynamic repositioning along edges.** Each handle is a static attachment point defined at design time.
- **Multiple handles on one side:** Can be positioned via CSS, but they do not move; you must re-render the node to change handle positions.
- **Fixed point support:** Yes, handles are fixed attachment points.
- **Arbitrary perimeter (continuous t):** No. React Flow does not support dragging an endpoint along a shape's perimeter.
- Source: [The Handle component – React Flow](https://reactflow.dev/api-reference/components/handle)

---

## Conclusions & Recommendations

### Recommended Interaction for React Flow Canvas

Based on the research, here is the canonical pattern to implement for moving a connection's endpoint dot along a node's rectangular border:

#### 1. **Endpoint Representation & Visibility**
- Represent endpoints as **draggable dots** on the **selected connection** (not on the node itself).
- Dots are **visible only when the connection is selected**; hide them on deselection (use React Flow's `useReactFlow()` to detect selected edge + apply CSS `visibility: hidden`/`opacity: 0`).
- Each endpoint (source and target) gets its own dot.

#### 2. **Gesture & Interaction Flow**
1. User **selects the connection** (click on the edge line).
2. Endpoint dots appear at the current attachment points.
3. User **hovers over a dot** → cursor changes to `grab`.
4. User **clicks and drags the dot** → cursor changes to `grabbing`.
5. As the dot is dragged, update its position in real time (use a custom edge component with `onPointerDown` / `onPointerMove` / `onPointerUp`).
6. Release the mouse → finalize the endpoint position.

#### 3. **Positioning Model (Continuous along Rectangular Perimeter)**
- Implement a **continuous model** where an endpoint can attach at any position `{side, t}` where:
  - `side` ∈ {top, right, bottom, left}
  - `t` ∈ [0.0, 1.0] (0 = start of side, 1 = end of side)
- When dragging an endpoint, calculate which side the dot is nearest to, then compute `t` as the normalized distance along that side.
- **Store the endpoint as:** `{side: 'right', t: 0.45}` (not as x/y world coordinates), so the connection remains valid if the node is moved or resized.

#### 4. **Snapping Behavior**
- **Default (no modifier):** Snap to cardinal magnet points: **top-center (t=0.5), right-center (t=0.5), bottom-center (t=0.5), left-center (t=0.5)**, plus **corners** (t=0.0, t=1.0) if desired.
  - Snap distance: 8–12px magnetic radius.
- **Modifier key (Ctrl on Windows/Linux, Cmd on Mac):** Disable snapping; allow free positioning anywhere along the perimeter (continuous t).
- **Visual snap indicators:** Show a faint highlight or alignment guide when snapping to a magnet point.

#### 5. **Hit Target & Affordance**
- **Visible dot size:** 8–12px diameter (aesthetically small).
- **Hit target:** Extend the interactive area to **24–32px** around the dot (can be transparent, uses pointer-events).
- **Cursor:**
  - Hover → `cursor: grab`
  - Dragging → `cursor: grabbing`
  - On the connector line (not near a dot) → default cursor (no grab).

#### 6. **Disambiguation: Move Endpoint vs. Create Connection vs. Move Node**
- **Move endpoint:** Connection is selected, drag a visible dot.
- **Create a new connection:** Use React Flow's built-in connection UI (drag from a source handle, select mode).
- **Move the node:** Select the node (click on the node itself, not the connection), then drag the node. Endpoints stay attached (side + t remain constant even as the node moves).
- **Clear intent via selection:** Only endpoint dots appear on selected connections; nodes have their own handles or selection outline. These are visually and semantically distinct.

#### 7. **Cursor & Feedback Loop**
- Display the **side and t value** in a tooltip or inspector when an endpoint is being dragged (e.g., "Right side, 65% down").
- Use **visual snap lines** or a **highlight ring** around the dot when it aligns to a magnet point.
- Use **smooth animations** to avoid jank when updating the endpoint position in real time.

#### 8. **Implementation Sketch**
```typescript
// Custom edge component with draggable endpoints
interface ConnectionEndpoint {
  side: 'top' | 'right' | 'bottom' | 'left';
  t: number; // 0.0 to 1.0
}

interface CustomEdgeProps {
  id: string;
  sourceNode: Node;
  targetNode: Node;
  selected: boolean;
  data: {
    sourceEndpoint: ConnectionEndpoint;
    targetEndpoint: ConnectionEndpoint;
  };
}

function CustomEdge(props: CustomEdgeProps) {
  const [draggingEndpoint, setDraggingEndpoint] = useState<'source' | 'target' | null>(null);

  const handlePointerDown = (endpoint: 'source' | 'target') => {
    setDraggingEndpoint(endpoint);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!draggingEndpoint || !props.selected) return;
    // Calculate nearest side and t value
    // Update connection data
  };

  const handlePointerUp = () => {
    setDraggingEndpoint(null);
  };

  return (
    <>
      {/* Connection line */}
      <path d={/* ... */} />
      
      {/* Endpoint dots (only visible if connection is selected) */}
      {props.selected && (
        <>
          <circle
            cx={/* source dot x */}
            cy={/* source dot y */}
            r="6"
            onPointerDown={() => handlePointerDown('source')}
            style={{ cursor: draggingEndpoint === 'source' ? 'grabbing' : 'grab' }}
          />
          <circle
            cx={/* target dot x */}
            cy={/* target dot y */}
            r="6"
            onPointerDown={() => handlePointerDown('target')}
            style={{ cursor: draggingEndpoint === 'target' ? 'grabbing' : 'grab' }}
          />
        </>
      )}
    </>
  );
}
```

#### 9. **Key Tradeoff: Snapping vs. Freedom**
- **Pros of snap-by-default (cardinal + corners):**
  - Cleaner, more organized diagrams (alignments are explicit).
  - Matches Figma/FigJam and professional norms.
- **Pros of free continuous positioning:**
  - More expressive; users can fine-tune exact attachment points.
  - Matches tldraw's slow-drag behavior.
- **Recommendation:** Default to snap-to-magnet-points. Allow Ctrl/Cmd to toggle free mode. This matches Figma and is least surprising to users.

---

## Caveats & Expiry

- **React Flow's current architecture:** Handle components are static and defined at design time. Supporting dynamic endpoint repositioning requires **custom edge components with real-time geometry calculations**; the built-in Handle system does not directly support "drag along edge" interactions.
- **Figma/FigJam behavior** may change with future UI updates; this research is current as of 2026-06-30.
- **tldraw's velocity-based binding** is a sophisticated heuristic (fast = center, slow = precise); this may not suit all use cases. Consider testing with users to see if it feels intuitive.
- **Excalidraw's grid-aligned binding** may feel restrictive if your canvas does not use a grid; evaluate whether continuous positioning is preferred.
- **React Flow does not ship with this feature by default.** You will need to implement custom edge rendering, pointer event handling, and geometry calculations (side detection, t-value calculation, snap distance checks).

---

## Raw Sources

| Source | URL | Relevance |
|--------|-----|-----------|
| Figma/FigJam Connectors Help | [https://help.figma.com/hc/en-us/articles/1500004414542-Create-diagrams-and-flows-with-connectors-in-FigJam](https://help.figma.com/hc/en-us/articles/1500004414542-Create-diagrams-and-flows-with-connectors-in-FigJam) | Official UX for endpoint dragging, snapping, and modifiers |
| Figma Custom Connection Points Forum | [https://forum.figma.com/suggest-a-feature-11/launched-custom-connection-points-on-shapes-in-figjam-36105](https://forum.figma.com/suggest-a-feature-11/launched-custom-connection-points-on-shapes-in-figjam-36105) | Magnet point definitions (TOP, LEFT, BOTTOM, RIGHT, CENTER) |
| Figma ConnectorEndpoint API | [https://developers.figma.com/docs/plugins/api/ConnectorEndpoint/](https://developers.figma.com/docs/plugins/api/ConnectorEndpoint/) | Programmatic endpoint model |
| tldraw Handles Docs | [https://tldraw.dev/docs/handles](https://tldraw.dev/docs/handles) | Handle positioning, interaction model, lifecycle callbacks |
| tldraw Snapping Docs | [https://tldraw.dev/sdk-features/snapping](https://tldraw.dev/sdk-features/snapping) | Velocity-based binding, snap points, alignment guides |
| tldraw Arrow Binding | [https://tldraw.dev/examples/arrow-binding-options](https://tldraw.dev/examples/arrow-binding-options) | Practical examples of arrow endpoint attachment |
| Excalidraw Element Binding System | [https://deepwiki.com/excalidraw/excalidraw/3.2-element-binding-system](https://deepwiki.com/excalidraw/excalidraw/3.2-element-binding-system) | Normalized binding coordinates, fixedPoint model |
| Excalidraw Linear Element Editor | [https://deepwiki.com/excalidraw/excalidraw/3.3-linear-element-editor](https://deepwiki.com/excalidraw/excalidraw/3.3-linear-element-editor) | Endpoint editing, binding cues, grid snapping |
| Excalidraw Elbow Arrow Binding | [https://github.com/excalidraw/excalidraw/pull/8884](https://github.com/excalidraw/excalidraw/pull/8884) | Ctrl modifier to disable snap behavior |
| Miro Connectors API | [https://developers.miro.com/docs/work-with-connectors](https://developers.miro.com/docs/work-with-connectors) | snapTo enum, normalized coordinates model |
| React Flow Handle Component | [https://reactflow.dev/api-reference/components/handle](https://reactflow.dev/api-reference/components/handle) | Handle API, positioning, visibility control |
| React Flow Handles Customization | [https://reactflow.dev/learn/customization/handles](https://reactflow.dev/learn/customization/handles) | Multiple handles, CSS positioning, useUpdateNodeInternals |
| Atlassian Drag & Drop Design Guidelines | [https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines) | Hit target size (24px minimum), cursor affordances |
| Marvel Drag & Drop for Design Systems | [https://marvelapp.com/blog/drag-drop-design-systems](https://marvelapp.com/blog/drag-drop-design-systems) | Drag handle visual affordances, cursor feedback |
| TheLinuxCode: Cursor Pointers | [https://thelinuxcode.com/change-cursor-to-a-hand-pointer-in-css/](https://thelinuxcode.com/change-cursor-to-a-hand-pointer-in-css/) | `cursor: grab` and `grabbing` CSS properties |

---

## Update Discipline (append-only)

Never overwrite or delete prior findings. When this research is re-visited, append a new `## Update YYYY-MM-DD` section below and flip the top-of-file `Status:` based on the update.
