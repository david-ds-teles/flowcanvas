// lib/canvas/validate.ts — 004. Pure (zod over the FlowcanvasDoc shape).
import { z } from 'zod'
import type { FlowcanvasDoc } from './jsoncanvas'
import { COMPONENT_KINDS } from './jsoncanvas'

const componentKind = z.enum(COMPONENT_KINDS as unknown as [string, ...string[]])
const nodeMeta = z.object({ kind: componentKind.optional() }).passthrough().optional()

const nodeBase = { id: z.string(), x: z.number(), y: z.number(), width: z.number(), height: z.number(),
  color: z.string().optional(), parentId: z.string().optional(), meta: nodeMeta }
// .passthrough() on every member: an import validator must PRESERVE unmodeled fields
// (GroupNode.background/backgroundStyle, fromSide/toSide on edges, etc.), not silently strip them.
const node = z.discriminatedUnion('type', [
  z.object({ type: z.literal('file'),  file: z.string(), subpath: z.string().optional(), ...nodeBase }).passthrough(),
  z.object({ type: z.literal('link'),  url: z.string(), ...nodeBase }).passthrough(),
  z.object({ type: z.literal('text'),  text: z.string(), ...nodeBase }).passthrough(),
  z.object({ type: z.literal('group'), label: z.string().optional(), ...nodeBase }).passthrough(),
])

export const flowcanvasDocSchema = z.object({
  nodes: z.array(node),
  edges: z.array(z.object({ id: z.string(), fromNode: z.string(), toNode: z.string() }).passthrough()),
  flowcanvas: z.object({
    // 006: new edge fields (fromPort/toPort/meta.edgeType) + node meta.ports are NOT modeled here —
    // they ride the existing .passthrough() on the edge object + nodeMeta, by design (the import
    // validator preserves unmodeled fields; it is not a write-time normalizer).
    schemaVersion: z.enum(['0.1', '0.2', '0.3', '0.4', '0.5']),
    session: z.object({ createdAt: z.string(), updatedAt: z.string(), revision: z.number() }).passthrough(),
    comments: z.array(z.unknown()),
  }).passthrough(),
}).superRefine((doc, ctx) => {
  // Q3 — meta.kind:'boundary' is group-only.
  doc.nodes.forEach((n, i) => {
    if (n.meta?.kind === 'boundary' && n.type !== 'group') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nodes', i, 'meta', 'kind'],
        message: "meta.kind:'boundary' is valid only on a type:'group' node" })
    }
  })
  // superRefine() widens the inferred type and .passthrough() loosens it; the schema validates the
  // FlowcanvasDoc shape at runtime, so we assert the contract type for callers. Double cast needed
  // because the zod-inferred type is not structurally assignable to FlowcanvasDoc (passthrough unknowns).
}) as unknown as z.ZodType<FlowcanvasDoc>

/** Parse + validate untrusted JSON into a FlowcanvasDoc. Throws ZodError → caller renders message. */
export function parseFlowcanvasDoc(json: unknown): FlowcanvasDoc {
  return flowcanvasDocSchema.parse(json)
}
