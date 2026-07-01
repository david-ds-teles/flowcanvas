# Flowcanvas

Flowcanvas renders flowcode markdown files as spatial, typed-relation canvas nodes, connects them with semantic edges, and round-trips the whole board to an AI agent over MCP. Built with [Next.js](https://nextjs.org) + React Flow.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. Load a specific board with `?path=your-board.canvas` (paths are relative to the project root).

## Canvas navigation & shortcuts

Getting around a board — especially a large generated one.

### Pan & zoom

| Gesture | Action |
| --- | --- |
| Mouse wheel · two-finger scroll | Zoom the canvas |
| Pinch · **⌘/Ctrl + wheel** | Zoom the canvas — works even over a component card |
| Wheel / scroll **over a component card** | Scrolls the card's content; falls through to canvas zoom once it reaches the edge |
| **Hold Space + drag** | Pan the board — drag anywhere, never grabs the node under the cursor |
| **H** · the hand tool in the toolbar | Toggle the pan tool on/off (sticky — no need to hold Space) |

### Framing (keyboard)

| Shortcut | Action |
| --- | --- |
| **Shift + 1** | Fit the whole board |
| **Shift + 2** | Zoom tight to the selection |
| **Shift + 3** | Zoom to the selection with a ring of context (see what it connects to) |
| **Shift + 0** | Reset zoom to 100% |

### Reading & connecting

| Gesture | Action |
| --- | --- |
| Single-click a component / markdown node | Highlight its section in the Core Doc spine |
| Double-click a component / markdown node | Open the full-fidelity reader |
| Click a connection dot, then click a target | Draw a typed edge (**Esc** cancels an armed connection) |
| Drag a connection dot | Slide the endpoint along the node's border (**Shift** snaps to sides/corners) |

### Editing

| Shortcut | Action |
| --- | --- |
| **⌘/Ctrl + S** | Save the board |
| **⌘/Ctrl + Z** · **⌘/Ctrl + Shift + Z** | Undo · redo |
| **⌘/Ctrl + click** | Add / remove a node from the selection (marquee-drag in Select mode) |
| **⌘/Ctrl + \\** | Toggle both side panels |
| **Delete / Backspace** | Delete the selected node(s) or edge(s) |
| **Esc** | Cancel an in-progress connection / close an inline editor |

You can start editing the app by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
