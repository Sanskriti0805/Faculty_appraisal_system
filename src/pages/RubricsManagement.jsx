import React, { useState, useEffect, useRef } from 'react';
import './DOFADashboard.css';
import './RubricsManagement.css';

import apiClient from '../services/api';

const RubricsManagement = () => {
  const [rubrics, setRubrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editCell, setEditCell] = useState(null); // { rowIndex, field }
  const [editValue, setEditValue] = useState('');
  const [editingSection, setEditingSection] = useState(null);
  const [editSectionValue, setEditSectionValue] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [deletedIds, setDeletedIds] = useState([]);
  const [toast, setToast] = useState(null);
  const inputRef = useRef(null);
  const sectionInputRef = useRef(null);

  useEffect(() => {
    fetchRubrics();
  }, []);

  useEffect(() => {
    if (editCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editCell]);

  useEffect(() => {
    if (editingSection && sectionInputRef.current) {
      sectionInputRef.current.focus();
    }
  }, [editingSection]);

  const handleSectionBlur = () => {
    if (editingSection) {
      if (editSectionValue.trim() !== '') {
        setRubrics(prev => prev.map(r => 
          r.section_name === editingSection ? { ...r, section_name: editSectionValue.trim() } : r
        ));
      }
      setEditingSection(null);
    }
  };

  const handleSectionKeyDown = (e) => {
    if (e.key === 'Enter') handleSectionBlur();
    if (e.key === 'Escape') setEditingSection(null);
  };

  const fetchRubrics = async () => {
    try {
      const response = await apiClient.get('/rubrics');
      if (response.success) {
        setRubrics(response.data.map(r => ({ ...r, _isNew: false })));
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

  const handleDeleteSection = (sectionName) => {
    if (!window.confirm(`Are you sure you want to delete the entire section "${sectionName}"?`)) return;

    const rowsToDelete = rubrics.filter(r => r.section_name === sectionName);
    const idsToDelete = rowsToDelete.filter(r => !r._isNew).map(r => r.id);

    setDeletedIds(prev => [...prev, ...idsToDelete]);
    setRubrics(prev => prev.filter(r => r.section_name !== sectionName));

    if (editingSection === sectionName) {
      setEditingSection(null);
    }
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
        await apiClient.delete(`/rubrics/${id}`);
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
          await apiClient.post('/rubrics', payload);
        } else {
          await apiClient.put(`/rubrics/${row.id}`, payload);
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
                <th style={{ width: '55%' }}>Sub Section</th>
                <th style={{ width: '15%' }}>Max Marks</th>
                <th style={{ width: '15%' }}>Weightage</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rubrics.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    No rubrics defined. Click "Add Section" to create one.
                  </td>
                </tr>
              ) : (
                (() => {
                  const grouped = {};
                  rubrics.forEach((r, idx) => {
                    if (!grouped[r.section_name]) grouped[r.section_name] = [];
                    grouped[r.section_name].push({ ...r, originalIndex: idx });
                  });

                  return Object.entries(grouped).map(([sectionName, items]) => (
                    <React.Fragment key={sectionName}>
                      <tr style={{ backgroundColor: '#e2e8f0' }}>
                        <td colSpan={4} style={{ fontWeight: 'bold', fontSize: '1.05rem', padding: '12px 16px' }}>
                          {editingSection === sectionName ? (
                            <input
                              ref={sectionInputRef}
                              className="rubric-inline-input"
                              style={{ fontWeight: 'bold', fontSize: '1.05rem', padding: '4px', width: '100%', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              value={editSectionValue}
                              onChange={e => setEditSectionValue(e.target.value)}
                              onBlur={handleSectionBlur}
                              onKeyDown={handleSectionKeyDown}
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div 
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flex: 1 }} 
                                onClick={() => setExpandedSections(prev => prev[sectionName] ? { [sectionName]: false } : { [sectionName]: true })}
                                title="Click to expand/collapse"
                              >
                                <span style={{ marginRight: '10px', color: '#64748b', fontSize: '0.8rem', userSelect: 'none' }}>
                                  {expandedSections[sectionName] ? '▼' : '▶'}
                                </span> 
                                {sectionName}
                              </div>
                              <div style={{ display: 'flex', gap: '15px' }}>
                                <button 
                                  onClick={() => { setEditingSection(sectionName); setEditSectionValue(sectionName); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '0.85rem', fontWeight: 600 }}
                                  title="Edit Section Name"
                                >
                                  ✎ Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteSection(sectionName)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}
                                  title="Delete Entire Section"
                                >
                                  🗑 Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedSections[sectionName] && items.map(row => (
                        <tr key={row.id} className={row._isNew ? 'rubric-row-new' : ''}>
                          <td style={{ paddingLeft: '32px' }}>{renderCell(row, row.originalIndex, 'sub_section')}</td>
                          <td>{renderCell(row, row.originalIndex, 'max_marks')}</td>
                          <td>{renderCell(row, row.originalIndex, 'weightage')}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="action-btn btn-reject"
                              onClick={() => handleDeleteRow(row.originalIndex)}
                              title="Delete row"
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ));
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RubricsManagement;
