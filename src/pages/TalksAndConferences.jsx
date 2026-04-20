import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Plus, X, Calendar } from 'lucide-react';
import './TalksAndConferences.css';
import FormActions from '../components/FormActions';
import FilePreviewButton from '../components/FilePreviewButton';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatDateForDisplay = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB');
};

const formatVenue = (venue = {}) => {
  const parts = [venue.city, venue.state, venue.country].map((p) => (p || '').trim()).filter(Boolean);
  return parts.join(', ');
};

const formatStoredFileName = (name) => {
  if (!name) return '';
  return String(name).replace(/^\d+(?:-\d+)+-/, '');
};

const MAIN_CATEGORIES = {
  1: 'Organized at LNMIIT',
  2: 'Invited talks',
  3: 'Conference outside LNMIIT'
};

const CATEGORY_1_ROLES = [
  'Convenor/Coordinator',
  'Co-convenor/Co-coordinator/Organizing Chair',
  'Organizing Committee Member'
];

const CATEGORY_3_ROLES = [
  'Programme Committee Chair',
  'Session Chair',
  'General Chair',
  'TPC Member',
  'Other Member'
];

const TalksAndConferences = () => {
  const { user, token } = useAuth();
  const fileInputRef = useRef(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [toast, setToast] = useState(null);
  const [persistedSessions, setPersistedSessions] = useState([]);
  const [persistedTalks, setPersistedTalks] = useState([]);

  const initialState = {
    mainCategory: '1',
    eventType: 'Conference', // Generic text for Cat 1 & 3
    eventMode: 'Offline', // Cat 3
    cat2Category: 'Keynote', // Keynote/Seminar/Invited Talk for Cat 2
    cat2SubCategory: 'FDP/Conference', // FDP/Conference vs Other for Cat 2
    title: '',
    organizer: '',
    role: CATEGORY_1_ROLES[0],
    certificateFile: null,
    venue: { city: '', state: '', country: '' },
    fromDate: '',
    toDate: '',
    date: '', // Single date for Cat 2
    dates: [] // Multiple dates for Cat 2
  };

  const [submittedItems, setSubmittedItems] = useState([]);
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const resetDraftForm = () => {
    setFormData({
      ...initialState,
      mainCategory: formData.mainCategory,
      role: formData.mainCategory === '1' ? CATEGORY_1_ROLES[0] : CATEGORY_3_ROLES[0]
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFileInputKey((prev) => prev + 1);
  };

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    window.clearTimeout(window.__talksToastTimer);
    window.__talksToastTimer = window.setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!user?.id) return;

    const hydrateExisting = async () => {
      try {
        const mySub = await apiClient.get('/submissions/my');
        if (!mySub?.success || !mySub?.data?.id) return;

        const details = await apiClient.get(`/submissions/${mySub.data.id}`);
        const sessions = Array.isArray(details?.data?.conferenceSessions) ? details.data.conferenceSessions : [];
        const talks = Array.isArray(details?.data?.keynotesTalks) ? details.data.keynotesTalks : [];

        setPersistedSessions(sessions.map(s => s.id).filter(Boolean));
        setPersistedTalks(talks.map(t => t.id).filter(Boolean));

        const mappedItems = [];

        // Map Sessions (Cat 1 and 3)
        sessions.forEach(row => {
          const role = row.role || '';
          // Determine if it was Cat 1 or Cat 3 based on role
          const isCat1 = CATEGORY_1_ROLES.includes(role);
          const isCat3 = CATEGORY_3_ROLES.includes(role);
          let mainCategory = '1';
          if (isCat3) mainCategory = '3';
          else if (!isCat1 && role.toLowerCase().includes('chair')) mainCategory = '3';

          const locationParts = (row.location || '').split(',').map((part) => part.trim()).filter(Boolean);
          const city = locationParts[0] || '';
          const country = locationParts.length > 1 ? locationParts[locationParts.length - 1] : '';

          mappedItems.push({
            id: row.id,
            apiType: 'conference-sessions',
            mainCategory,
            eventType: 'Conference',
            title: row.session_title || '',
            organizer: row.conference_name || '',
            role: role,
            eventMode: 'Offline',
            certificateFile: null,
            evidence_file: row.evidence_file || null,
            venue: { city, state: '', country },
            fromDate: row.date ? String(row.date).slice(0, 10) : '',
            toDate: ''
          });
        });

        // Map Talks (Cat 2)
        talks.forEach(row => {
          const locationParts = (row.location || '').split(',').map((part) => part.trim()).filter(Boolean);
          const city = locationParts[0] || '';
          const country = locationParts.length > 1 ? locationParts[locationParts.length - 1] : '';

          mappedItems.push({
            id: row.id,
            apiType: 'keynotes-talks',
            mainCategory: '2',
            cat2Category: row.event_type || 'Keynote',
            cat2SubCategory: row.audience_type || 'Other',
            title: row.title || '',
            organizer: row.event_name || '',
            date: row.date ? String(row.date).slice(0, 10) : '',
            dates: row.date ? [String(row.date).slice(0, 10)] : [],
            certificateFile: null,
            evidence_file: row.evidence_file || null,
            venue: { city, state: '', country }
          });
        });

        setSubmittedItems(mappedItems);
      } catch (error) {
        console.error('Failed to prefill talks and conferences:', error);
      }
    };

    hydrateExisting();
  }, [user]);

  const handleMainCategoryChange = (e) => {
    const nextCat = e.target.value;
    setFormData(prev => ({
      ...initialState,
      mainCategory: nextCat,
      role: nextCat === '1' ? CATEGORY_1_ROLES[0] : nextCat === '3' ? CATEGORY_3_ROLES[0] : ''
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFileInputKey(prev => prev + 1);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVenueChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, venue: { ...prev.venue, [name]: value } }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, certificateFile: e.target.files[0] }));
  };

  const handleAddDate = (e) => {
    e.preventDefault();
    if (!formData.date) return showToast('Please select a date first.');
    setFormData(prev => ({
      ...prev,
      dates: prev.dates.includes(prev.date) ? prev.dates : [...prev.dates, prev.date],
      date: ''
    }));
  };

  const handleRemoveDate = (dateToRemove) => {
    setFormData(prev => ({ ...prev, dates: prev.dates.filter(d => d !== dateToRemove) }));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!formData.title) return showToast('Please fill in at least the Title.');

    // For Cat 2, ensure dates exist
    if (formData.mainCategory === '2') {
      const normalizedDates = [...formData.dates];
      if (formData.date && !normalizedDates.includes(formData.date)) {
        normalizedDates.push(formData.date);
      }
      if (normalizedDates.length === 0) return showToast('Please add at least one date.');
      
      setSubmittedItems(prev => [...prev, { 
        ...formData, 
        dates: normalizedDates, 
        date: normalizedDates[0],
        apiType: 'keynotes-talks'
      }]);
    } else {
      setSubmittedItems(prev => [...prev, { ...formData, apiType: 'conference-sessions' }]);
    }
    
    resetDraftForm();
    showToast('Entry added to list. You can now add another.', 'success');
  };

  const handleRemoveItem = (index) => {
    setSubmittedItems(prev => prev.filter((_, i) => i !== index));
  };

  const clearDraftEvidence = () => {
    setFormData(prev => ({ ...prev, certificateFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFileInputKey(prev => prev + 1);
  };

  const clearItemEvidence = (index) => {
    setSubmittedItems(prev => prev.map((item, i) => (
      i === index ? { ...item, certificateFile: null, evidence_file: null } : item
    )));
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);

    try {
      if (!user?.id || !token) {
        showToast('Unable to identify logged-in faculty. Please login again.');
        return false;
      }

      // 1. Delete all persisted instances to cleanly overwrite
      await Promise.all([
        ...persistedSessions.map(id => fetch(`http://${window.location.hostname}:5001/api/activities/conference-sessions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })),
        ...persistedTalks.map(id => fetch(`http://${window.location.hostname}:5001/api/activities/keynotes-talks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }))
      ]);

      const allItems = [...submittedItems];
      if (formData.title) {
        const itemToPush = { ...formData };
        if (formData.mainCategory === '2') {
          const dt = [...formData.dates];
          if (formData.date && !dt.includes(formData.date)) dt.push(formData.date);
          itemToPush.dates = dt;
          itemToPush.date = dt[0] || '';
          itemToPush.apiType = 'keynotes-talks';
        } else {
          itemToPush.apiType = 'conference-sessions';
        }
        allItems.push(itemToPush);
      }

      if (allItems.length === 0) {
        showToast('Please add at least one entry');
        return false;
      }

      const promises = allItems.map(item => {
        const payload = new FormData();
        payload.append('faculty_id', user.id);
        payload.append('title', item.title);

        if (item.certificateFile) {
          payload.append('evidence_file', item.certificateFile);
        } else if (item.evidence_file) {
          payload.append('existing_evidence_file', item.evidence_file);
        }

        if (item.apiType === 'conference-sessions') {
          payload.append('conference_name', item.organizer);
          payload.append('session_title', item.title);
          payload.append('role', item.role);
          payload.append('location', formatVenue(item.venue));
          payload.append('date', item.fromDate || item.toDate || '');
          return fetch(`http://${window.location.hostname}:5001/api/activities/conference-sessions`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: payload
          });
        } else {
          payload.append('event_name', item.organizer);
          payload.append('event_type', item.cat2Category);
          payload.append('audience_type', item.cat2SubCategory);
          payload.append('location', formatVenue(item.venue));
          payload.append('date', item.date || item.dates?.[0] || '');
          return fetch(`http://${window.location.hostname}:5001/api/activities/keynotes-talks`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: payload
          });
        }
      });

      const responses = await Promise.all(promises);
      const settled = await Promise.all(responses.map(async (r) => {
        let p = null;
        try { p = await r.json(); } catch { p = null; }
        return { ok: r.ok, payload: p };
      }));

      const failed = settled.find((s) => !s.ok);
      if (failed) throw new Error(failed.payload?.message || 'Failed to save a record');

      setPersistedSessions([]);
      setPersistedTalks([]);
      
      const newSessions = [];
      const newTalks = [];
      
      settled.forEach((s, idx) => {
        if (s.ok && s.payload?.data?.id) {
          if (allItems[idx].apiType === 'conference-sessions') newSessions.push(s.payload.data.id);
          else newTalks.push(s.payload.data.id);
        }
      });

      setPersistedSessions(newSessions);
      setPersistedTalks(newTalks);
      
      showToast('Data saved successfully!', 'success');
      setSubmittedItems([]);
      resetDraftForm();
      return true;

    } catch (error) {
      console.error('Error saving data:', error);
      showToast('Error saving data: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="talks-conferences form-page">
      {toast && (
        <div role="alert" style={{ position: 'fixed', right: '1rem', bottom: '5.5rem', zIndex: 9999, background: toast.type === 'success' ? '#276749' : '#c53030', color: '#fff', padding: '0.9rem 1rem', borderRadius: '10px', boxShadow: '0 12px 24px rgba(0,0,0,0.18)', minWidth: '280px', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}>×</button>
        </div>
      )}
      
      <div className="page-header">
        <div>
          <h1 className="page-title">Talks and Conferences</h1>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSave} autoComplete="off" noValidate>
          
          <div className="form-row" style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ width: '100%' }}>
              <label>Category<span className="required-star">*</span></label>
              <select name="mainCategory" value={formData.mainCategory} onChange={handleMainCategoryChange} style={{ fontSize: '1.05rem', fontWeight: 600, padding: '0.6rem 1rem' }}>
                <option value="1">{MAIN_CATEGORIES[1]}</option>
                <option value="2">{MAIN_CATEGORIES[2]}</option>
                <option value="3">{MAIN_CATEGORIES[3]}</option>
              </select>
            </div>
          </div>

          {/* Conditional Form Fields */}
          {(formData.mainCategory === '1' || formData.mainCategory === '3') && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Type of Event<span className="required-star">*</span></label>
                  <select name="eventType" value={formData.eventType} onChange={handleInputChange}>
                    <option value="Workshop">Workshop</option>
                    <option value="Conference">Conference</option>
                    <option value="FDP">FDP</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {formData.mainCategory === '3' && (
                  <div className="form-group">
                    <label>Mode of Event</label>
                    <select name="eventMode" value={formData.eventMode} onChange={handleInputChange}>
                      <option value="Offline">Offline</option>
                      <option value="Online">Online</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Title<span className="required-star">*</span></label>
                  <input type="text" name="title" value={formData.title} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Organizer<span className="required-star">*</span></label>
                  <input type="text" name="organizer" value={formData.organizer} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role<span className="required-star">*</span></label>
                  <select name="role" value={formData.role} onChange={handleInputChange}>
                    {(formData.mainCategory === '1' ? CATEGORY_1_ROLES : CATEGORY_3_ROLES).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {formData.mainCategory === '2' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Type of Talk</label>
                  <select name="cat2Category" value={formData.cat2Category} onChange={handleInputChange}>
                    <option value="Keynote">Keynote</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Invited Talk">Invited Talk</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Talk Context<span className="required-star">*</span></label>
                  <select name="cat2SubCategory" value={formData.cat2SubCategory} onChange={handleInputChange}>
                    <option value="FDP/Conference">At an FDP or Conference</option>
                    <option value="Other">Other Invited Talk</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Title<span className="required-star">*</span></label>
                  <input type="text" name="title" value={formData.title} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Organizer<span className="required-star">*</span></label>
                  <input type="text" name="organizer" value={formData.organizer} onChange={handleInputChange} required />
                </div>
              </div>
            </>
          )}

          <div className="section-fieldset">
            <span className="section-legend">Venue</span>
            <div className="venue-row">
              <div className="form-group"><label>City</label><input type="text" name="city" value={formData.venue.city} onChange={handleVenueChange} /></div>
              <div className="form-group"><label>State</label><input type="text" name="state" value={formData.venue.state} onChange={handleVenueChange} /></div>
              <div className="form-group"><label>Country</label><input type="text" name="country" value={formData.venue.country} onChange={handleVenueChange} /></div>
            </div>
          </div>

          {(formData.mainCategory === '1' || formData.mainCategory === '3') && (
            <div className="form-row">
              <div className="form-group"><label>From</label><input type="date" name="fromDate" value={formData.fromDate} onChange={handleInputChange} /></div>
              <div className="form-group"><label>To</label><input type="date" name="toDate" value={formData.toDate} onChange={handleInputChange} /></div>
            </div>
          )}

          {formData.mainCategory === '2' && (
            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <div className="date-input-wrapper">
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} />
                  <Calendar className="calendar-icon" size={18} />
                </div>
                <button type="button" className="add-date-btn" onClick={handleAddDate} style={{ marginTop: '0.5rem', background: '#f1f5f9', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Add Date</button>
                {formData.dates.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {formData.dates.map((d) => (
                      <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.6rem', border: '1px solid #d1d8e0', borderRadius: '999px', fontSize: '0.85rem' }}>
                        {d} <button type="button" onClick={() => handleRemoveDate(d)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>x</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Upload Evidence<span className="required-star">*</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input key={fileInputKey} ref={fileInputRef} type="file" onChange={handleFileChange} />
                <FilePreviewButton file={formData.certificateFile} />
                {formData.certificateFile && (
                  <button type="button" onClick={clearDraftEvidence} title="Remove" style={{ width: '32px', height: '32px', border: '1px solid #d1d8e0', borderRadius: '6px', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleAddItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>
              <Plus size={18} /> Add Entry
            </button>
          </div>

          {submittedItems.length > 0 && (
            <div className="added-sessions-list" style={{ marginTop: '2rem' }}>
              <h3>Added Entries ({submittedItems.length})</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {submittedItems.map((item, index) => (
                  <li key={index} style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{flex: 1}}>
                      <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem', color: '#1e293b' }}>
                        <span style={{ fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '0.15rem 0.4rem', backgroundColor: '#e2e8f0', borderRadius: '4px', marginRight: '0.5rem', verticalAlign: 'middle', color: '#475569' }}>
                          {MAIN_CATEGORIES[item.mainCategory]}
                        </span>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.15rem' }}>
                        {item.mainCategory === '2' ? `Type: ${item.cat2Category} (${item.cat2SubCategory})` : `Event: ${item.eventType} | Role: ${item.role}`} | Organizer: {item.organizer}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.15rem' }}>Venue: {formatVenue(item.venue) || 'N/A'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                        Date: {item.mainCategory === '2' 
                          ? (item.dates && item.dates.length > 0 ? item.dates.map(d => formatDateForDisplay(d)).join(', ') : formatDateForDisplay(item.date))
                          : `${formatDateForDisplay(item.fromDate)} - ${formatDateForDisplay(item.toDate)}`}
                      </div>
                      {(item.certificateFile || item.evidence_file) && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FilePreviewButton file={item.certificateFile || item.evidence_file} style={{ width: '28px', height: '28px' }} />
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.certificateFile?.name || formatStoredFileName(item.evidence_file)}</span>
                          <button type="button" onClick={() => clearItemEvidence(index)} title="Remove file" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', padding: '0' }}><X size={14}/></button>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(index)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', padding: '0.5rem' }}>
                      <Trash2 size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </form>
      </div>
      <FormActions onSave={handleSave} currentPath={window.location.pathname} loading={loading} />
    </div>
  );
};

export default TalksAndConferences;
