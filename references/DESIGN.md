---
name: nyx
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001b'
  tertiary-container: '#ff516a'
  on-tertiary-container: '#5b0017'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-md:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  body-editor:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-ui:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 2rem
  editor-max-width: 840px
  sidebar-width: 280px
  gutter: 24px
---

## Brand & Style
The design system is centered on a **Glassmorphic-Minimalist** aesthetic, engineered for a high-focus writing environment. It evokes a sense of deep immersion, treating the interface as a series of translucent, layered glass panes floating over a dark, atmospheric void. 

The target audience consists of developers, technical writers, and digital creators who value a workspace that feels both futuristic and unobtrusive. The UI emphasizes high-contrast typography against soft, diffused backgrounds to ensure legibility while maintaining a sophisticated, high-end editorial feel. Visual noise is aggressively eliminated, leaving only the essential tools visible through subtle light-refraction effects and vibrant, electric accents.

## Colors
The palette is anchored by a **Deep Charcoal and Obsidian** base to minimize eye strain during long writing sessions. 

- **Primary (Electric Indigo):** Used for active states, primary actions, and critical syntax highlighting elements.
- **Secondary (Vivid Violet):** Used for secondary accents, selection highlights, and metadata tags.
- **Surface Strategy:** The design system utilizes semi-transparent layers. The background is a dark gradient, while "glass" surfaces use a blurred obsidian tint with a 1px "inner-glow" border to define edges without using heavy solid colors.
- **Syntax Highlighting:** A curated spectrum of neons (Cyan, Lime, and Rose) is used sparingly against the dark background to provide immediate visual parsing of Markdown structures.

## Typography
The typographic system relies on a dual-engine approach. **Geist** provides a clean, geometric structure for all UI elements, sidebars, and menus, ensuring the interface feels modern and systematic. For the core writing experience, **JetBrains Mono** is utilized to provide the necessary rhythmic spacing required for Markdown and code blocks.

- **Scale:** Large display headings use tight tracking and heavy weights to create a "poster" feel in document previews.
- **Readability:** The editor font size is locked to a comfortable 16px with a generous 1.6 line height to prevent line-tracking fatigue.
- **Hierarchy:** Labels and metadata use the monospace font at smaller scales to clearly distinguish "system data" from "creative content."

## Layout & Spacing
The layout follows a **Hybrid-Focus model**. The central writing area is a fixed-width column (840px) to maintain optimal line lengths for reading and writing. Peripheral UI, such as file trees and property inspectors, exist as glass-morphed sidebars that can be collapsed to achieve a "Zen Mode" effect.

Spacing is strictly based on an **8px grid**. 
- **Margins:** Large 32px or 48px margins are used to separate the document from the UI chrome.
- **Responsive:** On mobile, sidebars transition into full-screen overlays with a bottom-sheet pattern for toolbars. The editor switches to a fluid width with 16px horizontal safe-area margins.

## Elevation & Depth
Depth is created through **Background Blurs** rather than traditional drop shadows. 
- **Tier 1 (Base):** Deep obsidian/charcoal background with a subtle radial gradient.
- **Tier 2 (Panels):** `backdrop-filter: blur(20px)` with a 50% opaque fill. These surfaces feature a 1px stroke using a white-transparent gradient to simulate a glass edge.
- **Tier 3 (Popovers/Modals):** Higher blur (40px) and a subtle "ambient" shadow—low opacity, high spread (#000000 40% opacity, 30px blur).
- **Interactions:** Hovering over elements increases the "glow" of the border-stroke rather than changing the background color, maintaining the transparency of the glass.

## Shapes
The shape language is consistently soft to counteract the technical nature of a Markdown editor.
- **Containers:** Main UI panels and cards use a **16px (rounded-lg)** radius.
- **Small Elements:** Buttons, input fields, and chips use an **8px (rounded-md)** radius.
- **Active Indicators:** Vertical pills for active file indicators are fully rounded.

Curves should be mathematically smooth (squircle-adjacent) to reinforce the premium, polished feel of the glass surfaces.

## Components
- **Buttons:** Primary buttons use a vibrant Electric Indigo gradient with white text. Secondary buttons are "Ghost Glass"—no fill, just a 1px border that illuminates on hover.
- **Input Fields:** Minimalist lines with a subtle glass fill. The focus state triggers a neon indigo bottom-border glow.
- **Cards/List Items:** In the file tree, items have no background by default; hover states trigger a 10% white overlay with a 12px corner radius.
- **Chips/Tags:** Monospace font, small caps, with a low-opacity violet background and high-saturation violet text.
- **Mermaid Charts:** Styled with "Sleek Dark" theme. Nodes use the Indigo/Violet palette with thin 1px lines. Text inside charts must use Geist for consistency with the UI.
- **The Editor Gutter:** Line numbers are rendered in a muted slate with no background, ensuring they don't distract from the text.