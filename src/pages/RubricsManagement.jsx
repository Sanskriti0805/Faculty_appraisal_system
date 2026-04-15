import React, { useState, useEffect, useRef } from 'react';
import './DofaDashboard.css';
import './RubricsManagement.css';

import apiClient from '../services/api';
import { showConfirm } from '../utils/appDialogs';

const SCORING_TYPES = [
  { value: 'manual',      label: 'Manual',      desc: 'Dofa enters score manually' },
  { value: 'rule',        label: 'Rule-Driven', desc: 'Calculated from rule configuration' },
  { value: 'count_based', label: 'Count-Based', desc: 'Rows x per-unit marks (auto)' },
  { value: 'text_exists', label: 'Text Exists', desc: 'Full marks if field is filled' },
];

const RubricsManagement = () => {
  const [rubrics, setRubrics] = useState([]);
  const [dynamicSections, setDynamicSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editCell, setEditCell] = useState(null); // { rowIndex, field }
  const [editValue, setEditValue] = useState('');
  const [editingSection, setEditingSection] = useState(null);
  const [editSectionValue, setEditSectionValue] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [deletedIds, setDeletedIds] = useState([]);
  const [toast, setToast] = useState(null);
  const [recalcPopup, setRecalcPopup] = useState(null);
  const inputRef = useRef(null);
  const sectionInputRef = useRef(null);

  useEffect(() => {
    fetchRubrics();
    fetchDynamicSections();
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
        setRubrics(response.data.map(r => ({
          ...r,
          rule_config: r.rule_config || null,
          data_source: r.data_source || null,
          _isNew: false
        })));
      }
    } catch (error) {
      console.error('Error fetching rubrics:', error);
      showToast('Error loading rubrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDynamicSections = async () => {
    try {
      const res = await apiClient.get('/form-builder/schema/flat');
      if (res.success) setDynamicSections(res.data || []);
    } catch (e) {
      console.error('Could not load dynamic sections', e);
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
      academic_year: new Date().getFullYear().toString(),
      scoring_type: 'manual',
      per_unit_marks: null,
      dynamic_section_id: null,
      data_source: null,
      rule_config: null,
    };
    setRubrics(prev => [...prev, newRow]);
  };

  const handleAddSubSection = (sectionName) => {
    const newRow = {
      _isNew: true,
      id: `new_${Date.now()}`,
      section_name: sectionName,
      sub_section: '',
      max_marks: 0,
      weightage: '',
      academic_year: new Date().getFullYear().toString(),
      scoring_type: 'manual',
      per_unit_marks: null,
      dynamic_section_id: null,
      data_source: null,
      rule_config: null,
    };
    setRubrics(prev => [...prev, newRow]);
    setExpandedSections(prev => ({ ...prev, [sectionName]: true }));
  };

  const handleDeleteRow = (index) => {
    const row = rubrics[index];
    if (!row._isNew) {
      setDeletedIds(prev => [...prev, row.id]);
    }
    setRubrics(prev => prev.filter((_, i) => i !== index));
    if (editCell?.rowIndex === index) setEditCell(null);
  };

  const handleDeleteSection = async (sectionName) => {
    if (!(await showConfirm(`Are you sure you want to delete the entire section "${sectionName}"?`))) return;

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
      if ((row.scoring_type || '').toLowerCase() === 'rule' && !row.rule_config) {
        showToast(`Rule config missing for "${row.sub_section || row.section_name}"`, 'error');
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
          academic_year: row.academic_year,
          scoring_type: row.scoring_type || 'manual',
          per_unit_marks: row.per_unit_marks !== null && row.per_unit_marks !== '' ? parseFloat(row.per_unit_marks) : null,
          dynamic_section_id: row.dynamic_section_id || null,
          data_source: row.data_source || null,
          rule_config: row.rule_config || null,
        };

        if (row._isNew) {
          await apiClient.post('/rubrics', payload);
        } else {
          await apiClient.put(`/rubrics/${row.id}`, payload);
        }
      }

      // Recalculate scores and show popup if any faculties were affected
      const recalcRes = await apiClient.post('/rubrics/recalculate');
      if (recalcRes && recalcRes.success && recalcRes.affectedFaculties && recalcRes.affectedFaculties.length > 0) {
        setRecalcPopup(recalcRes.affectedFaculties);
      } else {
        showToast('Changes saved successfully!');
      }

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
      <div className="Dofa-dashboard">
        <div className="loading-state">Loading rubrics...</div>
      </div>
    );
  }

  return (
    <div className="Dofa-dashboard">
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
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="submissions-card">
        <div className="table-container">
          <table className="submissions-table rubrics-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Sub Section</th>
                <th style={{ width: '10%' }}>Max Marks</th>
                <th style={{ width: '10%' }}>Weightage</th>
                <th style={{ width: '14%' }}>Scoring Type</th>
                <th style={{ width: '10%' }}>Per Unit</th>
                <th style={{ width: '18%' }}>Linked Section</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
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
                      <tr className="rubric-section-header-row">
                        <td colSpan={6}>
                          {editingSection === sectionName ? (
                            <input
                              ref={sectionInputRef}
                              className="rubric-inline-input rubric-section-input"
                              value={editSectionValue}
                              onChange={e => setEditSectionValue(e.target.value)}
                              onBlur={handleSectionBlur}
                              onKeyDown={handleSectionKeyDown}
                            />
                          ) : (
                            <div
                              className="rubric-section-name-row"
                              onClick={() => setExpandedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }))}
                              title="Click to expand/collapse"
                            >
                              <span className="rubric-chevron">
                                {expandedSections[sectionName] ? 'â–¼' : 'â–¶'}
                              </span>
                              <span className="rubric-section-title">{sectionName}</span>
                              <span className="rubric-item-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </td>
                        <td className="rubric-section-actions-cell">
                          <button
                            className="rubric-sec-btn rubric-sec-btn--add"
                            onClick={e => { e.stopPropagation(); handleAddSubSection(sectionName); }}
                            title="Add sub-section"
                          >+ Add Item</button>
                          <button
                            className="rubric-sec-btn rubric-sec-btn--edit"
                            onClick={e => { e.stopPropagation(); setEditingSection(sectionName); setEditSectionValue(sectionName); }}
                            title="Rename section"
                          >âœŽ Edit</button>
                          <button
                            className="rubric-sec-btn rubric-sec-btn--del"
                            onClick={e => { e.stopPropagation(); handleDeleteSection(sectionName); }}
                            title="Delete section"
                          >ðŸ—‘ Delete</button>
                        </td>
                      </tr>
                      {expandedSections[sectionName] && items.map(row => (
                        <tr key={row.id} className={row._isNew ? 'rubric-row-new' : ''}>
                          <td style={{ paddingLeft: '32px' }}>{renderCell(row, row.originalIndex, 'sub_section')}</td>
                          <td>{renderCell(row, row.originalIndex, 'max_marks')}</td>
                          <td>{renderCell(row, row.originalIndex, 'weightage')}</td>
                          <td>
                            <select
                              className="rubric-scoring-select"
                              value={row.scoring_type || 'manual'}
                              onChange={e => {
                                setRubrics(prev => {
                                  const updated = [...prev];
                                  updated[row.originalIndex] = { ...updated[row.originalIndex], scoring_type: e.target.value };
                                  return updated;
                                });
                              }}
                              title={SCORING_TYPES.find(s => s.value === row.scoring_type)?.desc}
                            >
                              {SCORING_TYPES.map(st => (
                                <option key={st.value} value={st.value}>{st.label}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {row.scoring_type === 'count_based' ? (
                              <input
                                className="rubric-inline-input"
                                type="number"
                                min="0"
                                step="0.5"
                                value={row.per_unit_marks ?? ''}
                                onChange={e => {
                                  setRubrics(prev => {
                                    const updated = [...prev];
                                    updated[row.originalIndex] = { ...updated[row.originalIndex], per_unit_marks: e.target.value };
                                    return updated;
                                  });
                                }}
                                placeholder="pts/row"
                                style={{ width: '70px' }}
                              />
                            ) : <span style={{ color: '#cbd5e1' }}>-</span>}
                          </td>
                          <td>
                            <select
                              className="rubric-scoring-select"
                              value={row.dynamic_section_id || ''}
                              onChange={e => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                setRubrics(prev => {
                                  const updated = [...prev];
                                  updated[row.originalIndex] = { ...updated[row.originalIndex], dynamic_section_id: val };
                                  return updated;
                                });
                              }}
                            >
                              <option value="">- none -</option>
                              {dynamicSections.map(ds => (
                                <option key={ds.id} value={ds.id}>
                                  {ds.parent_id ? `â†³ ${ds.title}` : ds.title} [{ds.form_type}]
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="action-btn btn-reject"
                              onClick={() => handleDeleteRow(row.originalIndex)}
                              title="Delete row"
                            >
                              ðŸ—‘
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

      {recalcPopup && (
        <div className="rubric-modal-overlay">
          <div className="rubric-modal-content">
            <h2>Scores Updated</h2>
            <p>The total score has been updated for the following faculties:</p>
            <div className="faculty-list">
              {recalcPopup.join(', ')}
            </div>
            <div className="modal-suggestion">
              <p>Accordingly, you need to go to the statistics sheet. Recalculate the statistics, update the grades and increments.</p>
            </div>
            <button 
              className="action-btn-primary" 
              onClick={() => setRecalcPopup(null)}
              style={{ marginTop: '15px', width: '100%' }}
            >
              OK, Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RubricsManagement;

