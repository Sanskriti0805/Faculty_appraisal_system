import React from 'react'
import RoleSwitcher from './RoleSwitcher'
import './Header.css'

const Header = ({ onLogout }) => {
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
        <RoleSwitcher />
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  )
}

export default Header

