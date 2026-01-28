import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import './Layout.css'

const Layout = () => {
  const navigate = useNavigate()

  const handleLogout = () => {
    // Add logout logic here
    alert('Logging out...')
    // navigate('/login')
  }

  return (
    <div className="layout">
      <Header onLogout={handleLogout} />
      <div className="layout-body">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

