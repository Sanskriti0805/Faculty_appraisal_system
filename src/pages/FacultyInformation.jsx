import React, { useState } from 'react'
import { Edit2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './FacultyInformation.css'
import FormActions from '../components/FormActions'

const FacultyInformation = () => {
  const location = useLocation()
  const [isEditing, setIsEditing] = useState(false)
  const [facultyData, setFacultyData] = useState({
    name: 'Dr. John Smith',
    designation: 'Associate Professor',
    department: 'Computer Science',
    dateOfJoining: '15th August 2018',
  })

  const handleInputChange = (field, value) => {
    setFacultyData({ ...facultyData, [field]: value })
  }

  const handleSave = async () => {
    setIsEditing(false)
    console.log('Saving data:', facultyData)
    // simulate delay
    return new Promise((resolve) => {
      setTimeout(() => {
        alert('Data saved successfully!')
        resolve(true)
      }, 500)
    })
  }

  return (
    <div className="faculty-information">
      <div className="page-header">
        <h1 className="page-title">Faculty Information</h1>
        {!isEditing && (
          <button className="edit-profile-button" onClick={() => setIsEditing(true)}>
            <Edit2 size={18} />
            Edit Profile
          </button>
        )}
      </div>

      <div className="data-sheet-card">
        <h2 className="section-title">Part-A: Data Sheet</h2>
        
        <div className="form-grid">
          <div className="form-field">
            <label>1. Name:</label>
            {isEditing ? (
              <input
                type="text"
                value={facultyData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            ) : (
              <p>{facultyData.name}</p>
            )}
          </div>

          <div className="form-field">
            <label>2. Designation:</label>
            {isEditing ? (
              <input
                type="text"
                value={facultyData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
              />
            ) : (
              <p>{facultyData.designation}</p>
            )}
          </div>

          <div className="form-field">
            <label>3. Department:</label>
            {isEditing ? (
              <input
                type="text"
                value={facultyData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
              />
            ) : (
              <p>{facultyData.department}</p>
            )}
          </div>

          <div className="form-field">
            <label>4. Date of Joining:</label>
            {isEditing ? (
              <input
                type="text"
                value={facultyData.dateOfJoining}
                onChange={(e) => handleInputChange('dateOfJoining', e.target.value)}
              />
            ) : (
              <p>{facultyData.dateOfJoining}</p>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <FormActions 
          onSave={handleSave} 
          currentPath={location.pathname} 
          showPrevious={false}
        />
      )}
      
      {!isEditing && (
        <FormActions 
          onSave={() => Promise.resolve(true)} 
          currentPath={location.pathname} 
          showPrevious={false}
        />
      )}
    </div>
  )
}

export default FacultyInformation

