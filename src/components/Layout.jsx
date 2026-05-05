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
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem('sidebar_collapsed') === '1'
  })

  React.useEffect(() => {
    localStorage.setItem('sidebar_collapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  const handleLogout = async () => {
    const shouldLogout = await confirmLogout()
    if (!shouldLogout) return

    logout()
    navigate('/login')
  }

  return (
    <div className={`layout ${sidebarCollapsed ? 'layout--sidebar-collapsed' : ''}`}>
      <Header onLogout={handleLogout} />
      <div className="layout-body">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
