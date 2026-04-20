import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, GripVertical, Save, Layout,
  Table as TableIcon, Type, AlignLeft, CheckCircle2,
  ChevronRight, AlertCircle, Move, MousePointer2,
  X, ArrowLeft, ArrowRight, FileText, Layers,
  Info, Bell, ExternalLink, FolderPlus, FolderOpen
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import apiClient from '../services/api';
import { showConfirm } from '../utils/appDialogs';
import './FormBuilder.css';

// --- Sortable Field Card ------------------------------------------------------
const SortableField = ({ field, onDelete, onUpdateLabel, onUpdateTableColumns }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const typeIcon = field.field_type === 'table'
    ? <TableIcon size={12} />
    : field.field_type === 'textarea'
      ? <AlignLeft size={12} />
      : <Type size={12} />;

  const typeLabel = field.field_type === 'textarea' ? 'COMMENT BOX'
    : field.field_type === 'table' ? 'DATA TABLE' : 'TEXT INPUT';

  return (
    <div ref={setNodeRef} style={style} className={`fb-field-card ${isDragging ? 'is-dragging' : ''}`}>
      <div className="fb-field-drag" {...attributes} {...listeners}><GripVertical size={20} /></div>
      <div className="fb-field-content">
        <div className="field-header">
          <span className="field-type-badge">{typeIcon} {typeLabel}</span>
          <input
            type="text"
            className="field-label-input"
            value={field.label}
            onChange={(e) => onUpdateLabel(field.id, e.target.value)}
            placeholder="Field Label / Question"
          />
        </div>
        {field.field_type === 'table' && (
          <div className="fb-table-editor">
            <div className="table-columns-config">
              {field.config?.columns?.map((col, cIdx) => (
                <div key={cIdx} className="column-pill">
                  <input
                    value={col.header}
                    onChange={(e) => {
                      const newCols = [...field.config.columns];
                      newCols[cIdx].header = e.target.value;
                      onUpdateTableColumns(field.id, newCols);
                    }}
                    placeholder="Column name"
                  />
                  <button onClick={() => {
                    const newCols = field.config.columns.filter((_, i) => i !== cIdx);
                    onUpdateTableColumns(field.id, newCols);
                  }}><Trash2 size={12} /></button>
                </div>
              ))}
              <button className="add-col-btn" onClick={() => {
                const newCols = [...(field.config?.columns || []), { key: `col${Date.now()}`, header: 'New Column' }];
                onUpdateTableColumns(field.id, newCols);
              }}>+ Add Column</button>
            </div>
            <div className="table-preview">
              <table>
                <thead><tr>{field.config?.columns?.map((col, i) => <th key={i}>{col.header || '-'}</th>)}</tr></thead>
                <tbody><tr>{field.config?.columns?.map((_, i) => <td key={i}>...</td>)}</tr></tbody>
              </table>
            </div>
          </div>
        )}
        {field.field_type === 'textarea' && (
          <textarea disabled className="fb-preview-textarea" placeholder="Multi-line comment box preview..." />
        )}
        {field.field_type === 'text' && (
          <input disabled className="fb-preview-text" placeholder="Single line input preview..." />
        )}
      </div>
      <button className="field-delete-btn" onClick={() => onDelete(field.id)} title="Remove field">
        <Trash2 size={18} />
      </button>
    </div>
  );
};

// --- Add Section Wizard -------------------------------------------------------
const FIELD_TYPES = [
  { id: 'text',     label: 'Text Input',   desc: 'Single-line answer',        icon: Type },
  { id: 'textarea', label: 'Comment Box',  desc: 'Multi-line paragraph',      icon: AlignLeft },
  { id: 'table',    label: 'Data Table',   desc: 'Rows with custom columns',  icon: TableIcon },
];

const defaultField = () => ({
  _uid: Math.random().toString(36).slice(2),
  type: 'text',
  label: '',
  columns: [{ key: 'col1', header: 'Column 1' }, { key: 'col2', header: 'Column 2' }],
});

const WizardModal = ({ onClose, onCreated, existingSections }) => {
  const [step, setStep] = useState(1); // 1..4
  const [formType, setFormType] = useState(null);          // 'A' | 'B'
  const [sectionKind, setSectionKind] = useState(null);    // 'new' | 'existing' | 'subsection'
  const [sectionName, setSectionName] = useState('');
  const [parentId, setParentId] = useState(null);
  const [fields, setFields] = useState([defaultField()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredSections = existingSections.filter(s => s.form_type === formType && !s.parent_id);
  const filteredSubSections = existingSections.filter(s => s.form_type === formType && s.parent_id === parentId);

  const canNext = () => {
    if (step === 1) return !!formType;
    if (step === 2) {
      if (!sectionKind) return false;
      if (sectionKind === 'new') return sectionName.trim().length > 0;
      if (sectionKind === 'existing') return !!parentId;
      if (sectionKind === 'subsection') return !!parentId && sectionName.trim().length > 0;
    }
    if (step === 3) return fields.length > 0 && fields.every(f => f.label.trim().length > 0);
    return true;
  };

  const addField = () => setFields(prev => [...prev, defaultField()]);
  const removeField = uid => setFields(prev => prev.filter(f => f._uid !== uid));
  const updateField = (uid, key, val) =>
    setFields(prev => prev.map(f => f._uid === uid ? { ...f, [key]: val } : f));
  const updateColumn = (uid, idx, val) =>
    setFields(prev => prev.map(f => {
      if (f._uid !== uid) return f;
      const cols = [...f.columns];
      cols[idx] = { ...cols[idx], header: val };
      return { ...f, columns: cols };
    }));
  const addColumn = uid =>
    setFields(prev => prev.map(f =>
      f._uid === uid ? { ...f, columns: [...f.columns, { key: `col${Date.now()}`, header: 'New Column' }] } : f
    ));
  const removeColumn = (uid, idx) =>
    setFields(prev => prev.map(f =>
      f._uid === uid ? { ...f, columns: f.columns.filter((_, i) => i !== idx) } : f
    ));

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      let targetSectionId;

      if (sectionKind === 'existing') {
        // Adding fields to an existing section
        targetSectionId = parentId;
      } else {
        // Create new section (or subsection)
        const res = await apiClient.post('/form-builder/sections', {
          title: sectionName.trim(),
          form_type: formType,
          sequence: 999,
          parent_id: sectionKind === 'subsection' ? parentId : null,
        });
        if (!res.success) throw new Error(res.message || 'Failed to create section');
        targetSectionId = res.data.id;
      }

      // Create all fields
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const config = f.type === 'table' ? { columns: f.columns } : {};
        await apiClient.post('/form-builder/fields', {
          section_id: targetSectionId,
          field_type: f.type,
          label: f.label.trim(),
          config,
          sequence: i,
        });
      }

      onCreated({ sectionName: sectionName || existingSections.find(s => s.id === parentId)?.title });
    } catch (e) {
      setError(e.message || 'Something went wrong');
      setSaving(false);
    }
  };

  const STEP_LABELS = ['Form', 'Section', 'Fields', 'Review'];

  return (
    <div className="wizard-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wizard-modal">
        {/* Header */}
        <div className="wizard-header">
          <div className="wizard-title">
            <FolderPlus size={20} />
            <span>Add New Section</span>
          </div>
          <button className="wizard-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Step indicators */}
        <div className="wizard-steps">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`wizard-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
              <div className="step-dot">{step > i + 1 ? <CheckCircle2 size={14} /> : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
          <div className="wizard-steps-line" style={{ '--progress': `${((step - 1) / 3) * 100}%` }} />
        </div>

        {/* Body */}
        <div className="wizard-body">
          {/* -- Step 1: Form Type -- */}
          {step === 1 && (
            <div className="wizard-step-content">
              <h3 className="wizard-step-title">Which form does this section belong to?</h3>
              <p className="wizard-step-sub">Faculty fill Form A (Part A) and Form B (Part B) separately.</p>
              <div className="form-type-cards">
                {['A', 'B'].map(t => (
                  <button
                    key={t}
                    className={`form-type-card ${formType === t ? 'selected' : ''}`}
                    onClick={() => setFormType(t)}
                  >
                    <div className="form-card-icon">
                      <FileText size={28} />
                    </div>
                    <div className="form-card-label">Form {t}</div>
                    <div className="form-card-sub">{t === 'A' ? 'Teaching & Research activities' : 'Institutional contributions & Goals'}</div>
                    {formType === t && <div className="form-card-check"><CheckCircle2 size={18} /></div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* -- Step 2: Section Kind -- */}
          {step === 2 && (
            <div className="wizard-step-content">
              <h3 className="wizard-step-title">What kind of section is this?</h3>
              <p className="wizard-step-sub">Form {formType} currently has {filteredSections.length} top-level section(s).</p>
              <div className="section-kind-options">
                <button
                  className={`kind-option ${sectionKind === 'new' ? 'selected' : ''}`}
                  onClick={() => { setSectionKind('new'); setParentId(null); }}
                >
                  <div className="kind-icon"><FolderPlus size={22} /></div>
                  <div>
                    <div className="kind-label">Brand new top-level section</div>
                    <div className="kind-desc">Appears as a main section in Form {formType}</div>
                  </div>
                </button>
                <button
                  className={`kind-option ${sectionKind === 'existing' ? 'selected' : ''}`}
                  onClick={() => { setSectionKind('existing'); setSectionName(''); }}
                  disabled={filteredSections.length === 0}
                >
                  <div className="kind-icon"><FolderOpen size={22} /></div>
                  <div>
                    <div className="kind-label">Add fields to an existing section</div>
                    <div className="kind-desc">Add more field(s) inside a section that already exists</div>
                  </div>
                </button>
                <button
                  className={`kind-option ${sectionKind === 'subsection' ? 'selected' : ''}`}
                  onClick={() => { setSectionKind('subsection'); }}
                  disabled={filteredSections.length === 0}
                >
                  <div className="kind-icon"><Layers size={22} /></div>
                  <div>
                    <div className="kind-label">New subsection under an existing section</div>
                    <div className="kind-desc">Creates a nested group inside a parent section</div>
                  </div>
                </button>
              </div>

              {/* Sub-options */}
              {sectionKind === 'new' && (
                <div className="wizard-field-row">
                  <label>Section name</label>
                  <input
                    className="wizard-text-input"
                    value={sectionName}
                    onChange={e => setSectionName(e.target.value)}
                    placeholder="e.g. Research Activities"
                    autoFocus
                  />
                </div>
              )}

              {(sectionKind === 'existing' || sectionKind === 'subsection') && (
                <div className="wizard-field-row">
                  <label>Select parent section</label>
                  <select
                    className="wizard-select"
                    value={parentId || ''}
                    onChange={e => setParentId(Number(e.target.value) || null)}
                  >
                    <option value="">- choose a section -</option>
                    {filteredSections.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {sectionKind === 'subsection' && (
                <div className="wizard-field-row">
                  <label>Subsection name</label>
                  <input
                    className="wizard-text-input"
                    value={sectionName}
                    onChange={e => setSectionName(e.target.value)}
                    placeholder="e.g. Journal Publications"
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}

          {/* -- Step 3: Fields -- */}
          {step === 3 && (
            <div className="wizard-step-content">
              <h3 className="wizard-step-title">Define the fields for this section</h3>
              <p className="wizard-step-sub">Add one or more fields. You can always add more later from the canvas.</p>
              <div className="wizard-fields-list">
                {fields.map((f, idx) => (
                  <div key={f._uid} className="wizard-field-block">
                    <div className="wizard-field-header">
                      <span className="wizard-field-num">Field {idx + 1}</span>
                      {fields.length > 1 && (
                        <button className="wizard-field-remove" onClick={() => removeField(f._uid)}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="wizard-field-row">
                      <label>Type</label>
                      <div className="field-type-pills">
                        {FIELD_TYPES.map(ft => (
                          <button
                            key={ft.id}
                            className={`field-type-pill ${f.type === ft.id ? 'selected' : ''}`}
                            onClick={() => updateField(f._uid, 'type', ft.id)}
                          >
                            <ft.icon size={14} /> {ft.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="wizard-field-row">
                      <label>Label / Question</label>
                      <input
                        className="wizard-text-input"
                        value={f.label}
                        onChange={e => updateField(f._uid, 'label', e.target.value)}
                        placeholder={
                          f.type === 'table' ? 'e.g. Research Publications Table'
                            : f.type === 'textarea' ? 'e.g. Additional Remarks'
                              : 'e.g. Specialization'
                        }
                      />
                    </div>
                    {f.type === 'table' && (
                      <div className="wizard-field-row">
                        <label>Table Columns</label>
                        <div className="wizard-columns">
                          {f.columns.map((col, ci) => (
                            <div key={ci} className="wizard-col-pill">
                              <input
                                value={col.header}
                                onChange={e => updateColumn(f._uid, ci, e.target.value)}
                                placeholder={`Column ${ci + 1}`}
                              />
                              <button onClick={() => removeColumn(f._uid, ci)} disabled={f.columns.length <= 1}>
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                          <button className="add-col-btn" onClick={() => addColumn(f._uid)}>+ Column</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button className="wizard-add-field-btn" onClick={addField}>
                  <Plus size={16} /> Add Another Field
                </button>
              </div>
            </div>
          )}

          {/* -- Step 4: Review -- */}
          {step === 4 && (
            <div className="wizard-step-content">
              <h3 className="wizard-step-title">Review & Confirm</h3>
              <p className="wizard-step-sub">Everything look right? Click Create to save to the database.</p>
              <div className="wizard-review-card">
                <div className="review-row">
                  <span className="review-label">Form</span>
                  <span className="review-value badge-accent">Form {formType}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Type</span>
                  <span className="review-value">
                    {sectionKind === 'new' ? 'New top-level section'
                      : sectionKind === 'existing' ? 'Fields added to existing section'
                        : 'New subsection'}
                  </span>
                </div>
                {sectionName && (
                  <div className="review-row">
                    <span className="review-label">Name</span>
                    <span className="review-value">{sectionName}</span>
                  </div>
                )}
                {parentId && (
                  <div className="review-row">
                    <span className="review-label">Parent</span>
                    <span className="review-value">{existingSections.find(s => s.id === parentId)?.title}</span>
                  </div>
                )}
                <div className="review-divider" />
                <div className="review-fields-title">Fields ({fields.length})</div>
                {fields.map((f, i) => (
                  <div key={f._uid} className="review-field-row">
                    <span className="review-field-type">
                      {f.type === 'table' ? <TableIcon size={13} />
                        : f.type === 'textarea' ? <AlignLeft size={13} />
                          : <Type size={13} />}
                      {f.type.toUpperCase()}
                    </span>
                    <span className="review-field-label">{f.label}</span>
                    {f.type === 'table' && (
                      <span className="review-field-cols">({f.columns.length} columns)</span>
                    )}
                  </div>
                ))}
              </div>
              {error && (
                <div className="wizard-error"><AlertCircle size={16} /> {error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="wizard-footer">
          <button className="wizard-btn wizard-btn-ghost" onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? 'Cancel' : <><ArrowLeft size={16} /> Back</>}
          </button>
          {step < 4 ? (
            <button
              className="wizard-btn wizard-btn-primary"
              disabled={!canNext()}
              onClick={() => setStep(s => s + 1)}
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="wizard-btn wizard-btn-success"
              disabled={saving}
              onClick={handleCreate}
            >
              {saving ? 'Creating...' : <><CheckCircle2 size={16} /> Create Section</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Rubric Reminder Popup ----------------------------------------------------
const RubricReminder = ({ sectionName, onClose, onGoToRubrics }) => (
  <div className="rubric-reminder-overlay">
    <div className="rubric-reminder-card">
      <div className="rubric-reminder-icon"><Bell size={28} /></div>
      <h3>Section Created</h3>
      <p className="rubric-reminder-main">
        <strong>"{sectionName}"</strong> is now part of your form.
      </p>
      <div className="rubric-reminder-warning">
        <AlertCircle size={18} />
        <span>
          <strong>Don't forget Rubrics!</strong> Faculty will fill this section but it won't
          contribute to their score until you define rubric rules for it in Rubrics Management.
        </span>
      </div>
      <div className="rubric-reminder-actions">
        <button className="rubric-reminder-btn primary" onClick={onGoToRubrics}>
          <ExternalLink size={15} /> Go to Rubrics Management
        </button>
        <button className="rubric-reminder-btn secondary" onClick={onClose}>
          Later, I'll do it
        </button>
      </div>
    </div>
  </div>
);

// --- Main Form Builder --------------------------------------------------------
const FormBuilder = () => {
  const navigate = useNavigate();
  const [allSections, setAllSections] = useState([]); // flat list from /schema/flat
  const [sections, setSections] = useState([]);        // nested schema (active form tab)
  const [activeFormTab, setActiveFormTab] = useState('A');
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [rubricReminder, setRubricReminder] = useState(null); // sectionName string

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchSchema(); }, []);
  useEffect(() => { if (allSections.length) filterSections(); }, [allSections, activeFormTab]);

  const fetchSchema = async () => {
    try {
      setLoading(true);
      // Flat for wizard dropdowns
      const flatRes = await apiClient.get('/form-builder/schema/flat');
      if (flatRes.success) setAllSections(flatRes.data || []);

      // Nested for the canvas
      const nestedRes = await apiClient.get('/form-builder/schema');
      if (nestedRes.success) {
        const nested = nestedRes.data || [];
        setSections(nested);
        // Auto-select first section of current tab
        const firstOfTab = nested.find(s => s.form_type === activeFormTab);
        if (firstOfTab) setActiveSection(firstOfTab);
      }
    } catch (error) {
      showToast('Error loading form schema', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterSections = () => {
    // Full reload approach is simpler and always consistent
    // (sections state is already filtered by current nestedRes, but tabs just switch view)
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleWizardCreated = ({ sectionName }) => {
    setShowWizard(false);
    setRubricReminder(sectionName);
    fetchSchema(); // Reload everything
    showToast('Section created successfully!', 'success');
  };

  const handleDeleteField = async (fieldId) => {
    if (!(await showConfirm('Remove this field from the section?'))) return;
    try {
      await apiClient.delete(`/form-builder/fields/${fieldId}`);
    } catch (e) { /* ignore, update UI anyway */ }
    const updatedSections = sections.map(s => {
      if (s.id === activeSection?.id) {
        return { ...s, fields: s.fields.filter(f => f.id !== fieldId) };
      }
      return s;
    });
    setSections(updatedSections);
    setActiveSection(updatedSections.find(s => s.id === activeSection?.id));
    showToast('Field removed');
  };

  const saveNewOrder = async (sectionId, fieldIds) => {
    try {
      await apiClient.put('/form-builder/fields/order', { section_id: sectionId, field_ids: fieldIds });
    } catch (error) { console.error('Failed to sync order:', error); }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oldIndex = activeSection.fields.findIndex(f => f.id === active.id);
      const newIndex = activeSection.fields.findIndex(f => f.id === over.id);
      const newFields = arrayMove(activeSection.fields, oldIndex, newIndex);
      const updatedSections = sections.map(s =>
        s.id === activeSection.id ? { ...s, fields: newFields } : s
      );
      setSections(updatedSections);
      setActiveSection(updatedSections.find(s => s.id === activeSection.id));
      showToast('Order updated', 'success');
      saveNewOrder(activeSection.id, newFields.map(f => f.id));
    }
  };

  const handleUpdateFieldLabel = (fieldId, newLabel) => {
    const updatedSections = sections.map(s => {
      if (s.id === activeSection?.id) {
        return { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, label: newLabel } : f) };
      }
      return s;
    });
    setSections(updatedSections);
    setActiveSection(updatedSections.find(s => s.id === activeSection?.id));
  };

  const handleUpdateTableColumns = (fieldId, columns) => {
    const updatedSections = sections.map(s => {
      if (s.id === activeSection?.id) {
        return { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, config: { ...f.config, columns } } : f) };
      }
      return s;
    });
    setSections(updatedSections);
    setActiveSection(updatedSections.find(s => s.id === activeSection?.id));
  };

  const handleDeleteSection = async (sectionId) => {
    if (!(await showConfirm('Delete this section and ALL its fields? This cannot be undone.'))) return;
    try {
      await apiClient.delete(`/form-builder/sections/${sectionId}`);
      showToast('Section deleted');
      if (activeSection?.id === sectionId) setActiveSection(null);
      fetchSchema();
    } catch (e) {
      showToast('Failed to delete section', 'error');
    }
  };

  // Sections visible in the current tab
  const tabSections = sections.filter(s => s.form_type === activeFormTab);

  if (loading) return (
    <div className="fb-loading">
      <div className="fb-loading-spinner" />
      <p>Loading Form Builder...</p>
    </div>
  );

  return (
    <div className="form-builder-container canva-style">
      {toast && <div className={`fb-toast fb-toast--${toast.type}`}>{toast.message}</div>}

      {showWizard && (
        <WizardModal
          onClose={() => setShowWizard(false)}
          onCreated={handleWizardCreated}
          existingSections={allSections}
        />
      )}

      {rubricReminder && (
        <RubricReminder
          sectionName={rubricReminder}
          onClose={() => setRubricReminder(null)}
          onGoToRubrics={() => { setRubricReminder(null); navigate('/Dofa-office/rubrics'); }}
        />
      )}

      {/* -- Left Palette -- */}
      <div className="fb-palette">
        <div className="fb-palette-header">
          <MousePointer2 size={18} />
          <span>Form Builder</span>
        </div>

        {/* Form A / B Tabs */}
        <div className="fb-form-tabs">
          {['A', 'B'].map(t => (
            <button
              key={t}
              className={`fb-form-tab ${activeFormTab === t ? 'active' : ''}`}
              onClick={() => {
                setActiveFormTab(t);
                const first = sections.find(s => s.form_type === t);
                setActiveSection(first || null);
              }}
            >
              Form {t}
            </button>
          ))}
        </div>

        <div className="fb-palette-items">
          <div className="palette-section-label">Elements</div>
          {[
            { type: 'text',     label: 'Text Input',  Icon: Type },
            { type: 'textarea', label: 'Comment Box', Icon: AlignLeft },
            { type: 'table',    label: 'Data Table',  Icon: TableIcon },
          ].map(({ type, label, Icon }) => (
            <button
              key={type}
              className={`palette-item ${!activeSection ? 'palette-item--disabled' : ''}`}
              title={!activeSection ? 'Select a section first' : `Add ${label}`}
              onClick={async () => {
                if (!activeSection) { showToast('Select a section first', 'error'); return; }
                const config = type === 'table'
                  ? { columns: [{ key: 'col1', header: 'Column 1' }, { key: 'col2', header: 'Column 2' }] }
                  : {};
                try {
                  const res = await apiClient.post('/form-builder/fields', {
                    section_id: activeSection.id, field_type: type,
                    label: `New ${label}`, config, sequence: activeSection.fields.length
                  });
                  if (res.success) {
                    const updatedSections = sections.map(s =>
                      s.id === activeSection.id ? { ...s, fields: [...s.fields, res.data] } : s
                    );
                    setSections(updatedSections);
                    setActiveSection(updatedSections.find(s => s.id === activeSection.id));
                    showToast(`${label} added`);
                  }
                } catch { showToast('Failed to add field', 'error'); }
              }}
            >
              <div className="palette-icon"><Icon /></div>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Section Navigator */}
        <div className="fb-palette-footer">
          <div className="fb-section-list-mini">
            <label>Form {activeFormTab} Sections</label>
            {tabSections.length === 0 && (
              <div className="no-sections-msg">No sections yet</div>
            )}
            {tabSections.map(s => (
              <div key={s.id} className="mini-section-group">
                <div
                  className={`mini-section-item ${activeSection?.id === s.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(s)}
                >
                  <span>{s.title}</span>
                  <button
                    className="mini-section-delete"
                    onClick={e => { e.stopPropagation(); handleDeleteSection(s.id); }}
                    title="Delete section"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {s.children?.map(child => (
                  <div
                    key={child.id}
                    className={`mini-section-item mini-section-child ${activeSection?.id === child.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(child)}
                  >
                      <span>{'-> '}{child.title}</span>
                    <button
                      className="mini-section-delete"
                      onClick={e => { e.stopPropagation(); handleDeleteSection(child.id); }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
            <button className="add-mini-section" onClick={() => setShowWizard(true)}>
              <Plus size={14} /> New Section
            </button>
          </div>
        </div>
      </div>

      {/* -- Canvas -- */}
      <div className="fb-canvas">
        <div className="fb-canvas-header">
          <div className="fb-breadcrumb">
            <span>DoFA Office</span> <ChevronRight size={14} /> <strong>Form Builder</strong>
            {activeSection && (
              <><ChevronRight size={14} /> <span className="bc-section">{activeSection.title}</span></>
            )}
          </div>
          <div className="fb-header-actions">
            <div className={`form-tab-badge form-tab-badge--${activeFormTab.toLowerCase()}`}>
              Form {activeFormTab}
            </div>
            <button className="save-btn" onClick={() => showToast('Schema saved to database', 'success')}>
              <Save size={18} /> Publish Changes
            </button>
          </div>
        </div>

        <div className="fb-canvas-scroll">
          {activeSection ? (
            <div className="fb-canvas-content">
              <div className="fb-section-banner">
                <div className="section-banner-left">
                  <div className="section-banner-meta">
                    <span className={`badge badge--form${activeFormTab.toLowerCase()}`}>Form {activeSection.form_type}</span>
                    {activeSection.parent_id && <span className="badge badge--sub">Subsection</span>}
                    <span className="badge">{activeSection.fields.length} field{activeSection.fields.length !== 1 ? 's' : ''}</span>
                  </div>
                  <input
                    type="text"
                    className="section-title-input"
                    value={activeSection.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setSections(sections.map(s => s.id === activeSection.id ? { ...s, title: newTitle } : s));
                      setActiveSection({ ...activeSection, title: newTitle });
                    }}
                  />
                </div>
                <button className="section-delete-btn" onClick={() => handleDeleteSection(activeSection.id)}>
                  <Trash2 size={16} /> Delete Section
                </button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveId(e.active.id)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={activeSection.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="fb-drop-zone">
                    {activeSection.fields.map((field) => (
                      <SortableField
                        key={field.id}
                        field={field}
                        onDelete={handleDeleteField}
                        onUpdateLabel={handleUpdateFieldLabel}
                        onUpdateTableColumns={handleUpdateTableColumns}
                      />
                    ))}
                    {activeSection.fields.length === 0 && (
                      <div className="empty-drop-zone">
                        <Move size={48} />
                        <p>Click an element from the left palette, or drag from there.</p>
                        <button className="empty-drop-cta" onClick={() => setShowWizard(true)}>
                          <Plus size={16} /> Add via Wizard
                        </button>
                      </div>
                    )}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
                  {activeId ? (
                    <div className="fb-field-card dragging-overlay">
                      <GripVertical size={20} />
                      <div className="fb-field-content"><strong>Moving element...</strong></div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {/* Children (subsections) */}
              {activeSection.children?.length > 0 && (
                <div className="fb-subsections">
                  <div className="fb-subsections-label">Subsections</div>
                  {activeSection.children.map(child => (
                    <button key={child.id} className="subsection-chip" onClick={() => setActiveSection(child)}>
                      <Layers size={14} /> {child.title} ({child.fields.length} fields)
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="fb-empty-state">
              <div className="empty-illustration"><Layout size={64} /></div>
              <h2>Ready to Design?</h2>
              <p>Create your first section for <strong>Form {activeFormTab}</strong> to start building.</p>
              <button className="primary-cta" onClick={() => setShowWizard(true)}>
                <Plus size={18} /> Create New Section
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;

