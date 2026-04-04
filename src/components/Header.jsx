import React from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Header.css'

const Header = ({ onLogout }) => {
  const { user } = useAuth()

  return (
    <header className="header">
      <div className="header-logo-container">
        <img
          src="/lnmiit-logo.svg"
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
        <button className="logout-button" onClick={onLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </header>
  )
}

export default Header
