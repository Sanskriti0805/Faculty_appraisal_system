import React from 'react'
import { setDialogBridge } from '../utils/appDialogs'

const AppDialogHost = () => {
  const [queue, setQueue] = React.useState([])
  const [promptValue, setPromptValue] = React.useState('')

  React.useEffect(() => {
    setDialogBridge((config) => {
      return new Promise((resolve) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        setQueue((prev) => [...prev, { ...config, id, resolve }])
      })
    })

    return () => {
      setDialogBridge(null)
    }
  }, [])

  const current = queue[0] || null

  React.useEffect(() => {
    if (!current) return
    setPromptValue(current.type === 'prompt' ? (current.defaultValue || '') : '')
  }, [current])

  const closeCurrent = (result) => {
    if (!current) return
    current.resolve(result)
    setQueue((prev) => prev.slice(1))
  }

  if (!current) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, background: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: 'min(92vw, 460px)', background: '#fff', borderRadius: '12px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.1rem', borderBottom: '1px solid #e5e7eb', fontWeight: 700, color: '#1f2937' }}>
          {current.title}
        </div>
        <div style={{ padding: '1rem 1.1rem', color: '#374151', lineHeight: 1.45 }}>
          {current.message}
          {current.type === 'prompt' && (
            <input
              type="text"
              value={promptValue}
              placeholder={current.placeholder || ''}
              onChange={(e) => setPromptValue(e.target.value)}
              style={{ width: '100%', marginTop: '0.85rem', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.6rem 0.7rem', fontSize: '0.95rem' }}
              autoFocus
            />
          )}
        </div>
        <div style={{ padding: '0.9rem 1.1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
          <button type="button" onClick={() => closeCurrent(null)} style={{ border: '1px solid #d1d5db', background: '#fff', color: '#374151', borderRadius: '8px', padding: '0.5rem 0.9rem', cursor: 'pointer' }}>
            {current.cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => closeCurrent(current.type === 'prompt' ? promptValue : true)}
            style={{ border: 'none', background: current.danger ? '#c53030' : '#2563eb', color: '#fff', borderRadius: '8px', padding: '0.5rem 0.9rem', cursor: 'pointer' }}
          >
            {current.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AppDialogHost
