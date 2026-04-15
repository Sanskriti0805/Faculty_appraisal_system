import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';
import './RoleSwitcher.css';

const RoleSwitcher = () => {
  const [currentRole, setCurrentRole] = useState('faculty');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      setCurrentRole(user.role);
    } else {
      // Default to faculty role if no user is set
      authService.mockLogin('faculty');
      setCurrentRole('faculty');
    }
  }, []);

  const switchRole = (role) => {
    authService.mockLogin(role);
    setCurrentRole(role);
    setIsOpen(false);
    
    // Navigate to appropriate dashboard
    const dashboardRoute = authService.getDashboardRoute();
    navigate(dashboardRoute);
    
    // Reload to ensure clean state
    window.location.href = dashboardRoute;
  };

  const getRoleLabel = (role) => {
    const labels = {
      faculty: 'Faculty',
      Dofa: 'Dofa',
      Dofa_office: 'Dofa Office'
    };
    return labels[role] || role;
  };

  return (
    <div className="role-switcher">
      <button
        className="role-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch Role (Development Only)"
      >
        <span className="role-icon">ðŸ‘¤</span>
        <span className="role-text">{getRoleLabel(currentRole)}</span>
        <span className="role-arrow">{isOpen ? 'â–²' : 'â–¼'}</span>
      </button>

      {isOpen && (
        <div className="role-switcher-dropdown">
          <div className="dropdown-header">Switch Role</div>
          <button
            className={`role-option ${currentRole === 'faculty' ? 'active' : ''}`}
            onClick={() => switchRole('faculty')}
          >
            <span className="option-icon">ðŸ‘¨â€ðŸ«</span>
            <span>Faculty</span>
          </button>
          <button
            className={`role-option ${currentRole === 'Dofa' ? 'active' : ''}`}
            onClick={() => switchRole('Dofa')}
          >
            <span className="option-icon">ðŸ‘”</span>
            <span>Dofa</span>
          </button>
          <button
            className={`role-option ${currentRole === 'Dofa_office' ? 'active' : ''}`}
            onClick={() => switchRole('Dofa_office')}
          >
            <span className="option-icon">ðŸ¢</span>
            <span>Dofa Office</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;

