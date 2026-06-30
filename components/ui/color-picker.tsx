'use client'
import { colorVar } from '@/lib/canvas/adapter'
import type { CanvasColor } from '@/lib/canvas/jsoncanvas'

/** The six nyx presets (mapped to hex by adapter.colorVar) — the default quick-pick chips. */
const NYX_PRESETS: CanvasColor[] = ['1', '2', '3', '4', '5', '6']
const isHex = (c?: string): c is string => !!c && /^#[0-9a-fA-F]{6}$/.test(c)

export interface ColorPickerProps {
  value?: CanvasColor                 // hex "#rrggbb" or a preset id "1".."6"
  presets?: CanvasColor[]             // quick-pick chips (defaults to the nyx palette)
  onChange: (color: CanvasColor) => void
  onClear?: () => void                // shown when clearable (edge: back to the flow-type default colour)
  label?: string
}

/**
 * 006 — shared colour picker (design Decision 3). Preset chips + a native `<input type=color>` custom
 * swatch + an optional clear. Extracted from the node-format-bar native-picker pattern and reused by the
 * edge style panel (per-edge colour override) and node-format-bar (text + fill), satisfying "use this
 * colour pick on other components as well".
 */
export function ColorPicker({ value, presets = NYX_PRESETS, onChange, onClear, label }: ColorPickerProps) {
  return (
    <div className="fc-colorpicker nodrag nopan" role="group" aria-label={label ?? 'Colour'} data-testid="color-picker">
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          className="fc-colorpicker__chip"
          data-testid={`color-chip-${c}`}
          aria-pressed={value === c}
          title={`Colour ${c}`}
          style={{ background: colorVar(c) }}
          onClick={() => onChange(c)}
        />
      ))}
      <label className="fc-colorpicker__custom" title="Custom colour" data-testid="color-custom">
        <span className="fc-colorpicker__swatch" style={{ background: isHex(value) ? value : 'transparent' }} />
        <input
          type="color"
          aria-label="Custom colour"
          value={isHex(value) ? value : colorVar(value) ?? '#5ef2ff'}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      {onClear && (
        <button
          type="button"
          className="fc-colorpicker__clear"
          data-testid="color-clear"
          title="Clear / auto"
          aria-label="Clear colour"
          onClick={onClear}
        >⌫</button>
      )}
    </div>
  )
}
