import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useLocation } from 'react-router-dom';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import apiClient from '../services/api';
import './DynamicFormSection.css';
import FormActions from '../components/FormActions';

const DynamicFormSection = () => {
  const { user } = useAuth();
  const { sectionId } = useParams();
  const location = useLocation();
  const [section, setSection] = useState(null);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, [sectionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schemaRes, respRes] = await Promise.all([
        apiClient.get('/form-builder/schema'),
        apiClient.get(`/form-builder/responses?faculty_id=1`) // TODO: Use real faculty ID
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

  const handleSave = async () => {
    try {
      setSaving(true);
      const responsePayload = Object.entries(responses).map(([fieldId, value]) => ({
        field_id: parseInt(fieldId),
        value
      }));

      const res = await apiClient.post('/form-builder/responses', {
        faculty_id: user?.id || 1, // TODO: Use real faculty ID
        responses: responsePayload
      });

      if (res.success) {
        showToast('Data saved successfully');
        return true;
      }
      return false;
    } catch (error) {
      showToast('Error saving data', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="dfs-loading">Loading Section...</div>;
  if (!section) return <div className="dfs-error">Section not found</div>;

  return (
    <div className="dynamic-form-section">
      {toast && <div className={`dfs-toast dfs-toast--${toast.type}`}>{toast.message}</div>}
      
      <div className="dfs-header">
        <div>
          <h1>{section.title}</h1>
          <p>Please provide the required information below.</p>
        </div>
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
