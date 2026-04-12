import React from 'react'

const AppAlertHost = () => {
  const [alerts, setAlerts] = React.useState([])

  React.useEffect(() => {
    const originalAlert = window.alert
    const originalAppToast = window.appToast

    const pushToast = (message) => {
      const text = typeof message === 'string' ? message : String(message ?? '')
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      setAlerts((prev) => [...prev, { id, text }])

      window.setTimeout(() => {
        setAlerts((prev) => prev.filter((item) => item.id !== id))
      }, 3600)
    }

    window.appToast = (message) => {
      pushToast(message)
    }

    window.alert = (message) => {
      pushToast(message)
    }

    return () => {
      window.alert = originalAlert
      window.appToast = originalAppToast
    }
  }, [])

  if (alerts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        zIndex: 12000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        width: 'min(92vw, 420px)'
      }}
    >
      {alerts.map((item) => (
        <div
          key={item.id}
          role="alert"
          style={{
            background: '#c53030',
            color: '#fff',
            borderRadius: '10px',
            padding: '0.9rem 1rem',
            boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.8rem'
          }}
        >
          <span style={{ lineHeight: 1.35 }}>{item.text}</span>
          <button
            type="button"
            onClick={() => setAlerts((prev) => prev.filter((entry) => entry.id !== item.id))}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#fff',
              fontSize: '1.05rem',
              lineHeight: 1,
              cursor: 'pointer'
            }}
            aria-label="Dismiss message"
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}

export default AppAlertHost
