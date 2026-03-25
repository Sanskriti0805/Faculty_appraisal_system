import React, { useState, useEffect, useRef } from 'react';
import './DOFADashboard.css';
import './RubricsManagement.css';

const API = `http://${window.location.hostname}:5001/api`;

const RubricsManagement = () => {
  const [rubrics, setRubrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editCell, setEditCell] = useState(null); // { rowIndex, field }
  const [editValue, setEditValue] = useState('');
  const [deletedIds, setDeletedIds] = useState([]);
  const [toast, setToast] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchRubrics();
  }, []);

  useEffect(() => {
    if (editCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editCell]);

  const fetchRubrics = async () => {
    try {
      const response = await fetch(`${API}/rubrics`);
      const data = await response.json();
      if (data.success) {
        setRubrics(data.data.map(r => ({ ...r, _isNew: false })));
      }
    } catch (error) {
      console.error('Error fetching rubrics:', error);
      showToast('Error loading rubrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddRow = () => {
    const newRow = {
      _isNew: true,
      id: `new_${Date.now()}`,
      section_name: 'New Section',
      sub_section: '',
      max_marks: 0,
      weightage: '',
      academic_year: new Date().getFullYear().toString()
    };
    setRubrics(prev => [...prev, newRow]);
  };

  const handleDeleteRow = (index) => {
    const row = rubrics[index];
    if (!row._isNew) {
      setDeletedIds(prev => [...prev, row.id]);
    }
    setRubrics(prev => prev.filter((_, i) => i !== index));
    if (editCell?.rowIndex === index) setEditCell(null);
  };

  const handleCellClick = (rowIndex, field) => {
    const value = rubrics[rowIndex][field];
    setEditCell({ rowIndex, field });
    setEditValue(value === null || value === undefined ? '' : value);
  };

  const handleCellBlur = () => {
    if (editCell) {
      setRubrics(prev => {
        const updated = [...prev];
        updated[editCell.rowIndex] = { ...updated[editCell.rowIndex], [editCell.field]: editValue };
        return updated;
      });
      setEditCell(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCellBlur();
    if (e.key === 'Escape') setEditCell(null);
  };

  const handleSaveChanges = async () => {
    // Basic validation
    for (const row of rubrics) {
      if (!row.section_name || row.section_name.trim() === '') {
        showToast('Section name cannot be empty', 'error');
        return;
      }
      if (isNaN(parseFloat(row.max_marks))) {
        showToast('Max marks must be a valid number', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Delete removed rows
      for (const id of deletedIds) {
        await fetch(`${API}/rubrics/${id}`, { method: 'DELETE' });
      }
      setDeletedIds([]);

      // 2. Create or update rows
      for (const row of rubrics) {
        const payload = {
          section_name: row.section_name.trim(),
          sub_section: row.sub_section,
          max_marks: parseFloat(row.max_marks) || 0,
          weightage: row.weightage !== '' ? parseFloat(row.weightage) : null,
          academic_year: row.academic_year
        };

        if (row._isNew) {
          await fetch(`${API}/rubrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          await fetch(`${API}/rubrics/${row.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      }

      showToast('Changes saved successfully!');
      fetchRubrics();
    } catch (error) {
      console.error('Save error:', error);
      showToast('Error saving changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (row, rowIndex, field) => {
    const isEditing = editCell?.rowIndex === rowIndex && editCell?.field === field;
    const value = row[field];

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          className="rubric-inline-input"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleCellBlur}
          onKeyDown={handleKeyDown}
        />
      );
    }

    return (
      <span
        className="rubric-cell-value"
        onClick={() => handleCellClick(rowIndex, field)}
        title="Click to edit"
      >
        {value !== null && value !== undefined && value !== '' ? value : <span className="rubric-placeholder">Click to edit</span>}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="dofa-dashboard">
        <div className="loading-state">Loading rubrics...</div>
      </div>
    );
  }

  return (
    <div className="dofa-dashboard">
      {/* Toast */}
      {toast && (
        <div className={`rubric-toast rubric-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Rubrics Management</h1>
          <p className="dashboard-subtitle">Define and manage section-wise marks allocation</p>
        </div>
        <div className="rubric-header-actions">
          <button className="action-btn-secondary" onClick={handleAddRow}>
            + Add Section
          </button>
          <button
            className="action-btn-primary"
            onClick={handleSaveChanges}
            disabled={saving}
          >
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      <div className="submissions-card">
        <div className="table-container">
          <table className="submissions-table rubrics-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Section Name</th>
                <th style={{ width: '42%' }}>Sub Section</th>
                <th style={{ width: '10%' }}>Max Marks</th>
                <th style={{ width: '12%' }}>Weightage</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rubrics.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    No rubrics defined. Click "Add Section" to create one.
                  </td>
                </tr>
              ) : (
                rubrics.map((row, index) => (
                  <tr key={row.id} className={row._isNew ? 'rubric-row-new' : ''}>
                    <td>{renderCell(row, index, 'section_name')}</td>
                    <td>{renderCell(row, index, 'sub_section')}</td>
                    <td>{renderCell(row, index, 'max_marks')}</td>
                    <td>{renderCell(row, index, 'weightage')}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="action-btn btn-reject"
                        onClick={() => handleDeleteRow(index)}
                        title="Delete row"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RubricsManagement;
