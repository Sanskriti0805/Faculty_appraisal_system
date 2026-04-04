import React, { useState } from 'react'
import { LogOut, Settings, X, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Header.css'

const API_BASE = `http://${window.location.hostname}:5000/api`;

const Header = ({ onLogout }) => {
  const { user, token } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setIsError(true)
      setMessage("New passwords do not match.")
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setIsError(true)
      setMessage("New password must be at least 6 characters.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })
      const data = await res.json()
      if (data.success) {
        setIsError(false)
        setMessage("Password updated successfully ✅")
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => {
          setShowSettings(false)
          setMessage('')
        }, 2000)
      } else {
        setIsError(true)
        setMessage(data.message || "Failed to update password.")
      }
    } catch (e) {
      setIsError(true)
      setMessage("Server error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="header">
        <div className="header-logo-container">
          <img
            src="/lnmiit-logo.png"
            alt="LNMIIT"
            className="header-logo"
          />
        </div>
        <h1 className="header-title">Faculty Appraisal System</h1>
        <div className="header-actions">
          {user && (
            <span style={{
              fontSize: '13px', color: '#5b6e9f', fontWeight: '500',
              padding: '6px 12px', background: '#f0f4ff', borderRadius: '20px'
            }}>
              {user.salutation ? `${user.salutation}. ` : ''}{user.name}
            </span>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="settings-button" onClick={() => setShowSettings(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={15} />
              Account Settings
            </button>
            <button className="logout-button" onClick={onLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false) }}>
          <div className="admin-modal" style={{ maxWidth: '400px' }}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Account Settings</h2>
              <button className="admin-modal-close" onClick={() => setShowSettings(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="admin-modal-body">
                <h3 style={{ fontSize: '15px', color: '#2d3748', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Change Password</h3>
                
                {message && (
                  <div className={isError ? "admin-form-error" : "admin-form-success"} style={{ margin: '0 0 16px 0' }}>
                    {isError ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
                    {message}
                  </div>
                )}

                <div className="admin-form-field">
                  <label className="admin-form-label"><Lock size={14} style={{ display: 'inline', marginRight: '4px' }} /> Current Password</label>
                  <div className="login-password-wrapper" style={{ position: 'relative' }}>
                    <input type={showPassword.current ? 'text' : 'password'} className="admin-form-input" required
                      value={passwordForm.currentPassword} onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} />
                    <button type="button" style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer' }}
                      onClick={() => setShowPassword(p => ({ ...p, current: !p.current }))}>
                      {showPassword.current ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label"><Lock size={14} style={{ display: 'inline', marginRight: '4px' }} /> New Password</label>
                  <div className="login-password-wrapper" style={{ position: 'relative' }}>
                    <input type={showPassword.new ? 'text' : 'password'} className="admin-form-input" required minLength={6} placeholder="Min. 6 characters"
                      value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} />
                    <button type="button" style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer' }}
                      onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}>
                      {showPassword.new ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label"><Lock size={14} style={{ display: 'inline', marginRight: '4px' }} /> Confirm New Password</label>
                  <div className="login-password-wrapper" style={{ position: 'relative' }}>
                    <input type={showPassword.confirm ? 'text' : 'password'} className="admin-form-input" required minLength={6}
                      value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                    <button type="button" style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer' }}
                      onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}>
                      {showPassword.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-cancel" onClick={() => setShowSettings(false)}>Cancel</button>
                <button type="submit" className="admin-btn-submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default Header
