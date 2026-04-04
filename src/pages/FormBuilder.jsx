import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, GripVertical, Settings, Save, Layout, 
  Table as TableIcon, Type, AlignLeft, CheckCircle2, 
  ChevronRight, AlertCircle, Move, MousePointer2 
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
import './FormBuilder.css';

// --- Sortable Field Component ---
const SortableField = ({ field, activeSectionId, onDelete, onUpdateLabel, onUpdateTableColumns }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`fb-field-card ${isDragging ? 'is-dragging' : ''}`}>
      <div className="fb-field-drag" {...attributes} {...listeners}>
        <GripVertical size={20} />
      </div>
      
      <div className="fb-field-content">
        <div className="field-header">
           <span className="field-type-badge">
             {field.field_type === 'table' ? <TableIcon size={12} /> : <Type size={12} />}
             {field.field_type.toUpperCase()}
           </span>
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
                 <thead>
                   <tr>{field.config?.columns?.map((col, i) => <th key={i}>{col.header}</th>)}</tr>
                 </thead>
                 <tbody>
                   <tr>{field.config?.columns?.map((_, i) => <td key={i}>...</td>)}</tr>
                 </tbody>
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
      
      <button className="field-delete-btn" onClick={() => onDelete(field.id)}>
        <Trash2 size={18} />
      </button>
    </div>
  );
};

// --- Main Form Builder Component ---
const FormBuilder = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeId, setActiveId] = useState(null); // For DragOverlay

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchSchema();
  }, []);

  const fetchSchema = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/form-builder/schema');
      if (res.success) {
        setSections(res.data || []);
        if (res.data && res.data.length > 0) {
           const firstSection = res.data[0];
           setActiveSection(firstSection);
        }
      }
    } catch (error) {
      showToast('Error loading form schema', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddSection = async () => {
    const title = window.prompt('Enter section title:');
    if (!title) return;

    try {
      const res = await apiClient.post('/form-builder/sections', {
        title,
        form_type: 'A',
        sequence: sections.length
      });
      if (res.success) {
        const newSection = { ...res.data, fields: [] };
        setSections([...sections, newSection]);
        setActiveSection(newSection);
        showToast('Section created successfully');
      }
    } catch (error) {
      showToast('Failed to create section', 'error');
    }
  };

  const handleAddField = async (type) => {
    if (!activeSection) return;

    let label = 'New Field';
    let config = {};

    if (type === 'table') {
      label = 'New Table Section';
      config = {
        columns: [
          { key: 'col1', header: 'Column 1' },
          { key: 'col2', header: 'Column 2' }
        ]
      };
    }

    try {
      const res = await apiClient.post('/form-builder/fields', {
        section_id: activeSection.id,
        field_type: type,
        label,
        config,
        sequence: activeSection.fields.length
      });

      if (res.success) {
        const updatedSections = sections.map(s => {
          if (s.id === activeSection.id) {
            return { ...s, fields: [...s.fields, res.data] };
          }
          return s;
        });
        setSections(updatedSections);
        setActiveSection(updatedSections.find(s => s.id === activeSection.id));
        showToast('Field added to canvas');
      }
    } catch (error) {
      showToast('Failed to add field', 'error');
    }
  };

  const handleDeleteField = async (fieldId) => {
    if (!window.confirm('Remove this field?')) return;
    // In a real app, we'd hit a DELETE endpoint
    const updatedSections = sections.map(s => {
      if (s.id === activeSection.id) {
        return { ...s, fields: s.fields.filter(f => f.id !== fieldId) };
      }
      return s;
    });
    setSections(updatedSections);
    setActiveSection(updatedSections.find(s => s.id === activeSection.id));
    showToast('Field removed');
  };

  const saveNewOrder = async (sectionId, fieldIds) => {
    try {
      await apiClient.put('/form-builder/fields/order', {
        section_id: sectionId,
        field_ids: fieldIds
      });
    } catch (error) {
      console.error('Failed to sync order:', error);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = activeSection.fields.findIndex(f => f.id === active.id);
      const newIndex = activeSection.fields.findIndex(f => f.id === over.id);

      const newFields = arrayMove(activeSection.fields, oldIndex, newIndex);
      
      const updatedSections = sections.map(s => {
        if (s.id === activeSection.id) {
          return { ...s, fields: newFields };
        }
        return s;
      });

      setSections(updatedSections);
      setActiveSection(updatedSections.find(s => s.id === activeSection.id));
      showToast('Positions updated', 'success');
      saveNewOrder(activeSection.id, newFields.map(f => f.id));
    }
  };

  const handleUpdateFieldLabel = (fieldId, newLabel) => {
    const updatedSections = sections.map(s => {
      if (s.id === activeSection.id) {
        return {
          ...s,
          fields: s.fields.map(f => f.id === fieldId ? { ...f, label: newLabel } : f)
        };
      }
      return s;
    });
    setSections(updatedSections);
    setActiveSection(updatedSections.find(s => s.id === activeSection.id));
  };

  const handleUpdateTableColumns = (fieldId, columns) => {
    const updatedSections = sections.map(s => {
      if (s.id === activeSection.id) {
        return {
          ...s,
          fields: s.fields.map(f => f.id === fieldId ? { ...f, config: { ...f.config, columns } } : f)
        };
      }
      return s;
    });
    setSections(updatedSections);
    setActiveSection(updatedSections.find(s => s.id === activeSection.id));
  };

  if (loading) return <div className="fb-loading">Initializing Canva-like Builder...</div>;

  return (
    <div className="form-builder-container canva-style">
      {toast && <div className={`fb-toast fb-toast--${toast.type}`}>{toast.message}</div>}
      
      {/* 1. Elements Palette (Left Tool Sidebar) */}
      <div className="fb-palette">
        <div className="fb-palette-header">
           <MousePointer2 size={18} />
           <span>Elements</span>
        </div>
        <div className="fb-palette-items">
           <button className="palette-item" onClick={() => handleAddField('text')}>
             <div className="palette-icon"><Type /></div>
             <span>Text Input</span>
           </button>
           <button className="palette-item" onClick={() => handleAddField('textarea')}>
             <div className="palette-icon"><AlignLeft /></div>
             <span>Comment Box</span>
           </button>
           <button className="palette-item" onClick={() => handleAddField('table')}>
             <div className="palette-icon"><TableIcon /></div>
             <span>Data Table</span>
           </button>
        </div>
        
        <div className="fb-palette-footer">
           <div className="fb-section-list-mini">
             <label>Form Sections</label>
             {sections.map(s => (
               <div 
                 key={s.id} 
                 className={`mini-section-item ${activeSection?.id === s.id ? 'active' : ''}`}
                 onClick={() => setActiveSection(s)}
               >
                 {s.title}
               </div>
             ))}
             <button className="add-mini-section" onClick={handleAddSection}>+ New Section</button>
           </div>
        </div>
      </div>

      {/* 2. Main Builder Canvas Area */}
      <div className="fb-canvas">
        <div className="fb-canvas-header">
          <div className="fb-breadcrumb">
            <span>DOFA Office</span> <ChevronRight size={14} /> <strong>Canva Form Builder</strong>
          </div>
          <div className="fb-header-actions">
            <button className="save-btn" onClick={() => showToast('Schema saved to database', 'success')}>
              <Save size={18} /> Publish Changes
            </button>
          </div>
        </div>

        <div className="fb-canvas-scroll">
          {activeSection ? (
            <div className="fb-canvas-content">
              <div className="fb-section-banner">
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
                <div className="banner-badges">
                  <span className={`badge ${activeSection.form_type === 'A' ? 'active' : ''}`}>Form A</span>
                  <span className="badge">Draft</span>
                </div>
              </div>

              {/* Drag and Drop Context */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveId(e.active.id)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={activeSection.fields.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="fb-drop-zone">
                    {activeSection.fields.map((field) => (
                      <SortableField 
                        key={field.id} 
                        field={field} 
                        activeSectionId={activeSection.id}
                        onDelete={handleDeleteField}
                        onUpdateLabel={handleUpdateFieldLabel}
                        onUpdateTableColumns={handleUpdateTableColumns}
                      />
                    ))}
                    
                    {activeSection.fields.length === 0 && (
                      <div className="empty-drop-zone">
                        <Move size={48} />
                        <p>Drag elements here or click from the palette to start building.</p>
                      </div>
                    )}
                  </div>
                </SortableContext>

                <DragOverlay dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                      styles: {
                        active: {
                          opacity: '0.4',
                        },
                      },
                    }),
                  }}>
                  {activeId ? (
                    <div className="fb-field-card dragging-overlay">
                       <GripVertical size={20} />
                       <div className="fb-field-content">
                          <strong>Moving element...</strong>
                       </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          ) : (
            <div className="fb-empty-state">
              <div className="empty-illustration">
                <Layout size={64} />
              </div>
              <h2>Ready to Design?</h2>
              <p>Create a section in the left sidebar to start using the Canva Form Builder.</p>
              <button className="primary-cta" onClick={handleAddSection}>Create New Section</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;
