import React from 'react'
import './Dashboard.css'

const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="welcome-card">
        <h1 className="dashboard-title">Welcome to the Faculty Dashboard</h1>
        <p className="dashboard-description">
          Use the sidebar to navigate through different academic and administrative sections. 
          Select Part A or Part B to view and manage your faculty appraisal information.
        </p>
      </div>
    </div>
  )
}

export default Dashboard

