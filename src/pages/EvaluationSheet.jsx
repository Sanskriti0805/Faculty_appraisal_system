import React, { useState, useEffect, useRef } from 'react';
import './DOFADashboard.css';
import './EvaluationSheet.css';

const API = `http://${window.location.hostname}:5000/api`;

const EvaluationSheet = () => {
  const [sections, setSections] = useState([]);       // unique section_name strings
  const [submissions, setSubmissions] = useState([]); // faculty rows
  const [scores, setScores] = useState({});           // { `${subId}||${section}` : score }
  const [remarks, setRemarks] = useState({});         // { subId: remarkText }
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [remarkModal, setRemarkModal] = useState(null);
  const [remarkDraft, setRemarkDraft] = useState('');
  const saveTimers = useRef({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/evaluation`);
      const data = await res.json();
      if (data.success) {
        setSections(data.sections || []);
        setSubmissions(data.submissions || []);

        // Build score map: key = "submissionId||sectionName"
        const scoreMap = {};
        (data.scores || []).forEach(s => {
          scoreMap[`${s.submission_id}||${s.section_name}`] = s.score;
        });
        setScores(scoreMap);

        // Latest remark per submission
        const remarkMap = {};
        (data.remarks || []).forEach(r => {
          if (!remarkMap[r.submission_id]) {
            remarkMap[r.submission_id] = r.remark;
          }
        });
        setRemarks(remarkMap);
      }
    } catch {
      showToast('Error loading evaluation data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getScore = (subId, section) => {
    const val = scores[`${subId}||${section}`];
    return val === undefined || val === null ? '' : val;
  };

  const getTotal = (subId) => {
    let total = 0;
    sections.forEach(sec => {
      const val = parseFloat(scores[`${subId}||${sec}`]);
      if (!isNaN(val)) total += val;
    });
    return total % 1 === 0 ? total : total.toFixed(2);
  };

  const handleScoreChange = (subId, section, value) => {
    const key = `${subId}||${section}`;
    setScores(prev => ({ ...prev, [key]: value }));

    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      persistScore(subId, section, value);
    }, 700);
  };

  const persistScore = async (subId, section, value) => {
    try {
      const res = await fetch(`${API}/evaluation/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: subId, section_name: section, score: parseFloat(value) || 0 })
      });
      const data = await res.json();
      if (!data.success) showToast(data.message || 'Score validation failed', 'error');
    } catch {
      showToast('Error saving score', 'error');
    }
  };

  const handleStatusChange = async (sub, status) => {
    const label = status === 'approved' ? 'approve' : 'send back';
    if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} submission for ${sub.faculty_name}?`)) return;

    // Save remark first if sending back
    if (status === 'sent_back' && remarks[sub.submission_id]) {
      await fetch(`${API}/evaluation/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: sub.submission_id, remark: remarks[sub.submission_id] })
      });
    }

    try {
      const res = await fetch(`${API}/submissions/${sub.submission_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approved_by: status === 'approved' ? 2 : undefined })
      });
      const data = await res.json();
      if (data.success) {
        showToast(status === 'approved' ? `✅ ${sub.faculty_name} approved!` : `↩ Sent back to ${sub.faculty_name}`);
        fetchData();
      }
    } catch {
      showToast('Error updating status', 'error');
    }
  };

  const openRemarkModal = (sub) => {
    setRemarkModal(sub);
    setRemarkDraft(remarks[sub.submission_id] || '');
  };

  const saveRemark = async () => {
    if (!remarkModal) return;
    try {
      await fetch(`${API}/evaluation/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: remarkModal.submission_id, remark: remarkDraft })
      });
      setRemarks(prev => ({ ...prev, [remarkModal.submission_id]: remarkDraft }));
      showToast('Remark saved!');
    } catch {
      showToast('Error saving remark', 'error');
    }
    setRemarkModal(null);
  };

  const getStatusBadge = (status) => {
    const map = {
      submitted:    { label: 'Submitted',    cls: 'status-badge status-submitted' },
      under_review: { label: 'Under Review', cls: 'status-badge status-review' },
      approved:     { label: 'Approved',     cls: 'status-badge status-approved' },
      sent_back:    { label: 'Sent Back',    cls: 'status-badge status-sent-back' },
    };
    const s = map[status] || { label: status, cls: 'status-badge' };
    return <span className={s.cls}>{s.label}</span>;
  };

  if (loading) {
    return (
      <div className="dofa-dashboard">
        <div className="loading-state">Loading evaluation data...</div>
      </div>
    );
  }

  return (
    <div className="dofa-dashboard">
      {toast && (
        <div className={`rubric-toast rubric-toast--${toast.type}`}>{toast.message}</div>
      )}

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Evaluation Sheet — Sheet 1</h1>
          <p className="dashboard-subtitle">
            Faculty rows × Section columns — enter marks awarded per section
          </p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="submissions-card">
          <div className="empty-state">
            <p>No submitted faculty appraisals to evaluate yet.</p>
          </div>
        </div>
      ) : (
        <div className="eval-scroll-wrapper">
          <table className="eval-table">
            <thead>
              <tr>
                {/* Sticky fixed cols */}
                <th className="eval-th-sticky eval-th-name">Faculty Name</th>
                <th className="eval-th-sticky2 eval-th-dept">Department</th>
                <th className="eval-th-status">Status</th>

                {/* One col per unique section */}
                {sections.map(sec => (
                  <th key={sec} className="eval-th-section" title={sec}>
                    {sec}
                  </th>
                ))}

                {/* Fixed right cols */}
                <th className="eval-th-total">Total Score</th>
                <th className="eval-th-remarks">Remarks</th>
                <th className="eval-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, idx) => (
                <tr key={sub.submission_id} className={idx % 2 === 0 ? '' : 'eval-tr-alt'}>
                  {/* Faculty Name — sticky */}
                  <td className="eval-td-sticky eval-td-name">
                    <div className="eval-faculty-name">{sub.faculty_name}</div>
                    <div className="eval-faculty-email">{sub.email}</div>
                  </td>

                  {/* Department — sticky 2 */}
                  <td className="eval-td-sticky2 eval-td-dept">
                    {sub.department || '—'}
                  </td>

                  {/* Status */}
                  <td className="eval-td-status">{getStatusBadge(sub.status)}</td>

                  {/* Section score inputs */}
                  {sections.map(sec => (
                    <td key={sec} className="eval-td-score">
                      <input
                        type="number"
                        className="eval-score-input"
                        min="0"
                        step="0.5"
                        value={getScore(sub.submission_id, sec)}
                        onChange={e => handleScoreChange(sub.submission_id, sec, e.target.value)}
                        placeholder="—"
                        title={`${sec} marks for ${sub.faculty_name}`}
                      />
                    </td>
                  ))}

                  {/* Total */}
                  <td className="eval-td-total">
                    <strong>{getTotal(sub.submission_id)}</strong>
                  </td>

                  {/* Remarks */}
                  <td className="eval-td-remarks">
                    {remarks[sub.submission_id] && (
                      <div className="eval-remark-preview" title={remarks[sub.submission_id]}>
                        {remarks[sub.submission_id].length > 40
                          ? remarks[sub.submission_id].substring(0, 40) + '…'
                          : remarks[sub.submission_id]}
                      </div>
                    )}
                    <button className="eval-remark-btn" onClick={() => openRemarkModal(sub)}>
                      ✏️ {remarks[sub.submission_id] ? 'Edit' : 'Add'} Remark
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="eval-td-actions">
                    {sub.status !== 'approved' && (
                      <button
                        className="action-btn btn-approve eval-action-btn"
                        onClick={() => handleStatusChange(sub, 'approved')}
                      >
                        ✅ Approve
                      </button>
                    )}
                    {sub.status !== 'approved' && (
                      <button
                        className="action-btn btn-reject eval-action-btn"
                        onClick={() => handleStatusChange(sub, 'sent_back')}
                      >
                        ↩ Send Back
                      </button>
                    )}
                    {sub.status === 'approved' && (
                      <span className="eval-approved-label">✅ Approved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Remark Modal */}
      {remarkModal && (
        <div className="eval-modal-overlay" onClick={() => setRemarkModal(null)}>
          <div className="eval-modal" onClick={e => e.stopPropagation()}>
            <h3 className="eval-modal-title">Remark for {remarkModal.faculty_name}</h3>
            <p className="eval-modal-sub">{remarkModal.department || 'No department'} — {remarkModal.email}</p>
            <textarea
              className="eval-modal-textarea"
              rows={5}
              placeholder="Enter your remarks here..."
              value={remarkDraft}
              onChange={e => setRemarkDraft(e.target.value)}
              autoFocus
            />
            <div className="eval-modal-actions">
              <button className="action-btn-secondary" onClick={() => setRemarkModal(null)}>Cancel</button>
              <button className="action-btn-primary" onClick={saveRemark}>Save Remark</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationSheet;
