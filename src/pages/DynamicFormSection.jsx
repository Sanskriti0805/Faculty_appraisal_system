import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Plus, Trash2, AlertCircle, Cloud, CheckCircle2, Loader } from 'lucide-react';
import apiClient from '../services/api';
import './DynamicFormSection.css';
import FormActions from '../components/FormActions';
import { useAuth } from '../context/AuthContext';
import { useSubmission } from '../context/SubmissionContext';

const DynamicFormSection = () => {
  const { sectionId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { submissionData } = useSubmission();
  const [section, setSection] = useState(null);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  // autosave: 'idle' | 'saving' | 'saved' | 'error'
  const [autosaveStatus, setAutosaveStatus] = useState('idle');
  const autosaveTimer = useRef(null);
  const isFirstLoad = useRef(true); // don't autosave on initial data load

  useEffect(() => {
    fetchData();
  }, [sectionId, user, submissionData?.id]);

  // ── Debounced autosave ──────────────────────────────────────────────────────
  // Fires 2 seconds after the user stops making changes.
  // Skipped on the very first load (when responses are populated from the DB).
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (Object.keys(responses).length === 0) return;

    // Clear any pending timer
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(async () => {
      setAutosaveStatus('saving');
      const success = await handleSave(true); // true = silent (no toast)
      setAutosaveStatus(success ? 'saved' : 'error');
      // Reset back to idle after 3s
      setTimeout(() => setAutosaveStatus('idle'), 3000);
    }, 2000);

    // Cleanup on unmount or re-run
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [responses]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      if (!user?.id) return;
      const submissionId = submissionData?.id || null;
      setLoading(true);
      const [schemaRes, respRes] = await Promise.all([
        apiClient.get('/form-builder/schema'),
        apiClient.get(`/form-builder/responses?faculty_id=${user.id}${submissionId ? `&submission_id=${submissionId}` : ''}`)
      ]);

      if (schemaRes.success) {
        const currentSection = schemaRes.data.find(s => s.id === parseInt(sectionId));
        setSection(currentSection);
        
        // Map existing responses to state
        const initialResponses = {};
        if (respRes.success) {
            respRes.data.forEach(r => {
                initialResponses[r.field_id] = r.value;
            });
        }
        setResponses(initialResponses);
      }
    } catch (error) {
      showToast('Error loading section data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInputChange = (fieldId, value) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleTableChange = (fieldId, rowIndex, columnKey, value) => {
    const currentTable = responses[fieldId] || [];
    const updatedTable = [...currentTable];
    if (!updatedTable[rowIndex]) updatedTable[rowIndex] = {};
    updatedTable[rowIndex][columnKey] = value;
    handleInputChange(fieldId, updatedTable);
  };

  const addTableRow = (fieldId) => {
    const currentTable = responses[fieldId] || [];
    handleInputChange(fieldId, [...currentTable, {}]);
  };

  const removeTableRow = (fieldId, rowIndex) => {
    const currentTable = responses[fieldId] || [];
    handleInputChange(fieldId, currentTable.filter((_, i) => i !== rowIndex));
  };

  // silent=true → skip toast (used by autosave)
  const handleSave = async (silent = false) => {
    try {
      if (!user?.id) {
        if (!silent) showToast('Unable to identify logged-in faculty. Please login again.', 'error');
        return false;
      }
      const submissionId = submissionData?.id || null;
      setSaving(true);
      const responsePayload = Object.entries(responses).map(([fieldId, value]) => ({
        field_id: parseInt(fieldId),
        value
      }));

      const res = await apiClient.post('/form-builder/responses', {
        faculty_id: user?.id,
        submission_id: submissionId,
        responses: responsePayload
      });

      if (res.success) {
        if (!silent) showToast('Data saved successfully');
        return true;
      }
      return false;
    } catch (error) {
      if (!silent) showToast('Error saving data', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="dfs-loading">Loading Section...</div>;
  if (!section) return <div className="dfs-error">Section not found</div>;

  // ── Autosave indicator ─────────────────────────────────────────────────────
  const AutosaveIndicator = () => {
    if (autosaveStatus === 'idle') return null;
    return (
      <div className={`dfs-autosave dfs-autosave--${autosaveStatus}`}>
        {autosaveStatus === 'saving' && <><Loader size={13} className="dfs-spin" /> Saving…</>}
        {autosaveStatus === 'saved'  && <><CheckCircle2 size={13} /> Saved</>}
        {autosaveStatus === 'error'  && <><AlertCircle size={13} /> Save failed</>}
      </div>
    );
  };

  return (
    <div className="dynamic-form-section">
      {toast && <div className={`dfs-toast dfs-toast--${toast.type}`}>{toast.message}</div>}
      
      <div className="dfs-header">
        <div>
          <h1>{section.title}</h1>
          <p>Please provide the required information below.</p>
        </div>
        <AutosaveIndicator />
      </div>

      <div className="dfs-content">
        {section.fields.map(field => (
          <div key={field.id} className="dfs-field-group">
            <label className="dfs-field-label">{field.label}</label>

            {field.field_type === 'text' && (
              <input 
                type="text" 
                className="dfs-input"
                value={responses[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
              />
            )}

            {field.field_type === 'textarea' || field.field_type === 'comment' && (
              <textarea 
                className="dfs-textarea"
                rows="4"
                value={responses[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
              />
            )}

            {field.field_type === 'table' && (
              <div className="dfs-table-container">
                <table className="dfs-table">
                  <thead>
                    <tr>
                      {field.config?.columns?.map(col => (
                        <th key={col.key}>{col.header}</th>
                      ))}
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(responses[field.id] || [{}]).map((row, rIdx) => (
                      <tr key={rIdx}>
                        {field.config?.columns?.map(col => (
                          <td key={col.key}>
                            <input 
                              type="text"
                              value={row[col.key] || ''}
                              onChange={(e) => handleTableChange(field.id, rIdx, col.key, e.target.value)}
                            />
                          </td>
                        ))}
                        <td>
                          <button 
                            className="row-del-btn"
                            onClick={() => removeTableRow(field.id, rIdx)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button 
                  className="add-row-btn"
                  onClick={() => addTableRow(field.id)}
                >
                  <Plus size={16} /> Add Row
                </button>
              </div>
            )}
          </div>
        ))}
        <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={saving} />
      </div>
    </div>
  );
};

export default DynamicFormSection;
