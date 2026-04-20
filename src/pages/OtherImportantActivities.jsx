import React, { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import './FormPages.css'
import FormActions from '../components/FormActions'
import { useAuth } from '../context/AuthContext'
import { legacySectionsService } from '../services/legacySectionsService'

const OtherImportantActivities = () => {
  const { user } = useAuth()
  const [items, setItems] = useState([{ id: Date.now(), text: '' }])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    const hydrate = async () => {
      try {
        const res = await legacySectionsService.getMySection('other_important_activities')
        const data = res?.data
        if (!data) return

        // Handle legacy string data or existing array
        if (data.items && Array.isArray(data.items)) {
          setItems(data.items.length > 0 ? data.items : [{ id: Date.now(), text: '' }])
        } else if (data.activities && typeof data.activities === 'string') {
          setItems([{ id: Date.now(), text: data.activities }])
        }
      } catch (error) {
        console.error('Failed to load other important activities data:', error)
      }
    }

    hydrate()
  }, [user])

  const handleInputChange = (id, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, text: value } : item))
  }

  const handleAddActivity = () => {
    setItems(prev => [...prev, { id: Date.now(), text: '' }])
  }

  const handleRemoveActivity = (id) => {
    setItems(prev => {
      const updated = prev.filter(item => item.id !== id)
      return updated.length > 0 ? updated : [{ id: Date.now(), text: '' }]
    })
  }

  const handleSave = async () => {
    if (!user?.id) {
      window.appToast('Unable to identify logged-in faculty. Please login again.')
      return false
    }

    setLoading(true)
    try {
      // We save as an object with 'items' key to keep it clean, 
      // but also include 'activities' (joined string) for legacy compatibility if needed
      const payload = {
        items: items,
        activities: items.map(i => i.text).filter(t => t.trim()).join('\n\n')
      }
      await legacySectionsService.saveSection('other_important_activities', payload)
      window.appToast('Data saved successfully!')
      return true
    } catch (error) {
      console.error('Failed to save other important activities data:', error)
      window.appToast('Failed to save data. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1 className="page-title">Other Important Activity</h1>
          <button
            onClick={handleAddActivity}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#f0fff4',
              color: '#2f855a',
              border: '1px solid #c6f6d5',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} /> Add Activity
          </button>
        </div>
      </div>

      <div className="form-card" style={{ padding: '2rem' }}>
        <div className="form-section">
          <p style={{ color: '#718096', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Enter details of any other important activities not covered in previous sections.
          </p>

          {items.map((item, index) => (
            <div key={item.id} style={{
              position: 'relative',
              marginBottom: '1.5rem',
              padding: '1.2rem',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a5568' }}>Activity #{index + 1}</span>
                {items.length > 1 && (
                  <button
                    onClick={() => handleRemoveActivity(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#e53e3e',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.2rem'
                    }}
                    title="Remove activity"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <textarea
                rows="4"
                value={item.text}
                onChange={(e) => handleInputChange(item.id, e.target.value)}
                placeholder="Describe your activity here..."
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e0',
                  fontSize: '1rem',
                  resize: 'vertical',
                  minHeight: '100px'
                }}
              />
            </div>
          ))}
        </div>
        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
      </div>
    </div>
  )
}

export default OtherImportantActivities

