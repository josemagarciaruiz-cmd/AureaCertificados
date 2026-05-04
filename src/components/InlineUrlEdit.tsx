import { useState } from 'react'

interface Props {
  id: string
  defaultUrl: string
  isOverridden: boolean
  onSave: (id: string, url: string) => void
  onReset: (id: string) => void
}

export default function InlineUrlEdit({ id, defaultUrl, isOverridden, onSave, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(defaultUrl)

  const handleOpen = () => {
    setValue(defaultUrl)
    setOpen(true)
  }

  const handleSave = () => {
    if (value.trim()) { onSave(id, value.trim()); setOpen(false) }
  }

  if (!open) {
    return (
      <button
        title={isOverridden ? 'URL personalizada — click para editar' : 'Editar URL'}
        style={{
          fontSize: '11px',
          color: isOverridden ? 'var(--color-accent)' : 'var(--color-text-muted)',
          background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
        }}
        onClick={handleOpen}
      >
        ✎
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px' }}>
      <input
        className="field-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      <div style={{ display: 'flex', gap: '4px' }}>
        <button className="btn-primary" style={{ fontSize: '9px', padding: '2px 8px' }} onClick={handleSave}>
          Guardar
        </button>
        {isOverridden && (
          <button
            className="btn-ghost"
            style={{ fontSize: '9px', padding: '2px 8px', color: 'var(--color-danger)' }}
            onClick={() => { onReset(id); setOpen(false) }}
          >
            Restablecer
          </button>
        )}
        <button className="btn-ghost" style={{ fontSize: '9px', padding: '2px 8px' }} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
