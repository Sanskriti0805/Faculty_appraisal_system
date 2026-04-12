import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { confirmLogout } from '../utils/appDialogs'
import './Layout.css'

const Layout = () => {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    const shouldLogout = await confirmLogout()
    if (!shouldLogout) return

    logout()
    navigate('/login')
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
