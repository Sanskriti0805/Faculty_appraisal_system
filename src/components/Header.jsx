import React from 'react'
import './Header.css'

const Header = ({ onLogout }) => {
  return (
    <header className="header">
      <div></div>
      <h1 className="header-title">Faculty Appraisal System</h1>
      <button className="logout-button" onClick={onLogout}>
        Logout
      </button>
    </header>
  )
}

export default Header

