import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../services/api';
import './EvaluationSheet3.css';

const EvaluationSheet3 = () => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/Dofa-office') ? '/Dofa-office' : '/Dofa';
  const [data, setData] = useState([]);
  const [gradeIncrements, setGradeIncrements] = useState({});
  const [availableGrades, setAvailableGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeSessionYear, setActiveSessionYear] = useState('');
  const [sessionLockState, setSessionLockState] = useState({ locked: false });
  const [sessionLockLoading, setSessionLockLoading] = useState(false);

  const isOfficePath = basePath === '/Dofa-office';

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    setLoading(true);
    try {
      const targetYear = await fetchTargetYear();
      if (targetYear) {
        await Promise.all([fetchData(targetYear), fetchSessionLockState(targetYear)]);
      } else {
        setData([]);
        setAvailableGrades([]);
        setGradeIncrements({});
        setSessionLockState({ locked: false });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTargetYear = async () => {
    try {
      const res = await apiClient.get('/sessions/active');
      const year = res?.session?.academic_year || '';
      if (year) {
        setActiveSessionYear(year);
        return year;
      }
    } catch {
      // Fall back to Sheet 3 derived year when active session API is unavailable.
    }
    return '';
  };

  const fetchSessionLockState = async (preferredYear = '') => {
    let targetYear = preferredYear || activeSessionYear;
    if (!targetYear && data.length > 0) {
      targetYear = data[0]?.academic_year || '';
    }
    if (!targetYear) {
      setSessionLockState({ locked: false });
      return;
    }

    try {
      const res = await apiClient.get(`/submissions/session-lock?academic_year=${encodeURIComponent(targetYear)}`);
      if (res?.success) {
        setActiveSessionYear(res?.data?.academic_year || targetYear);
        setSessionLockState(res.data || { academic_year: targetYear, locked: false });
        return;
      }
    } catch {
      // Keep unlocked fallback state.
    }

    setActiveSessionYear(targetYear);
    setSessionLockState({ academic_year: targetYear, locked: false });
  };

  const fetchData = async (academicYear = activeSessionYear) => {
    if (!academicYear) return;
    try {
      const res = await apiClient.get(`/evaluation/sheet3?academic_year=${encodeURIComponent(academicYear)}`);
      if (res.success) {
        setData(res.data || []);
        const activeGrades = res.availableGrades || [];
        setAvailableGrades(activeGrades);
        const incMap = {};
        (res.gradeIncrements || []).forEach(item => {
          if (activeGrades.includes(item.grade)) {
            incMap[item.grade] = item.increment_percentage;
          }
        });
        setGradeIncrements(incMap);
        setActiveSessionYear(academicYear);
      }
    } catch (err) {
      showToast('Error loading Sheet 3 data', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleIncChange = (grade, value) => {
    setGradeIncrements(prev => ({ ...prev, [grade]: value }));
  };

  const applyIncrements = async () => {
    try {
      if (sessionLockState?.locked) {
        showToast(`Session ${activeSessionYear || ''} is final-locked. Increments cannot be changed.`, 'error');
        return;
      }

      setLoading(true);
      const incArray = availableGrades.map((grade) => ({
        grade,
        increment_percentage: gradeIncrements[grade] || 0
      }));
      await apiClient.post('/evaluation/grade-increments', { increments: incArray });
      const res = await apiClient.post('/evaluation/apply-increments');
      if (res.success) {
        showToast('Increments applied successfully');
        await fetchData();
        await fetchSessionLockState();
      }
    } catch {
      showToast('Error applying increments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionLockToggle = async (nextLocked) => {
    const targetYear = activeSessionYear || data[0]?.academic_year;
    if (!targetYear) {
      showToast('Academic year is unavailable. Unable to change lock state.', 'error');
      return;
    }

    if (nextLocked) {
      const ok = window.confirm(
        `Final-lock session ${targetYear}? This will freeze Sheet 1/2/3 edits and all review actions (except view/download) until DoFA unlocks.`
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(
        `Unlock session ${targetYear}? This will re-enable evaluation and review actions for this academic year.`
      );
      if (!ok) return;
    }

    try {
      setSessionLockLoading(true);
      const res = await apiClient.put('/submissions/session-lock', {
        academic_year: targetYear,
        locked: nextLocked
      });
      if (res?.success) {
        showToast(res.message || `Session ${targetYear} ${nextLocked ? 'locked' : 'unlocked'} successfully`);
        await fetchSessionLockState(targetYear);
        await fetchData();
      } else {
        showToast(res?.message || 'Unable to update session lock state.', 'error');
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Unable to update session lock state.', 'error');
    } finally {
      setSessionLockLoading(false);
    }
  };

  if (loading) return <div className="eval3-loading">Loading Sheet 3...</div>;

  return (
    <div className="eval3-container">
      {toast && <div className={`eval3-toast eval3-toast--${toast.type}`}>{toast.message}</div>}

      <div className="eval3-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Evaluation - Sheet 3</h1>
            <p>Grade-based Salary Increments Summary</p>
          </div>
          <Link to={`${basePath}/sheet2`} className="back-btn">
            &larr; Back to Sheet 2
          </Link>
        </div>
      </div>

      <div className={`eval3-lock-banner ${sessionLockState?.locked ? 'locked' : 'unlocked'}`}>
        <div>
          <h3>Session Lock Status</h3>
          <p>
            {activeSessionYear ? `${activeSessionYear}: ` : ''}
            {sessionLockState?.locked
              ? 'Final-locked. Sheet 1/2/3 data and review actions are frozen.'
              : 'Unlocked. You can still apply grading, increments, and reviews.'}
          </p>
          {!activeSessionYear && (
            <p style={{ marginTop: 6 }}>No active appraisal session found. Sheet 3 will open when a session is released.</p>
          )}
        </div>
        <div className="eval3-lock-actions">
          {!sessionLockState?.locked && (
            <button
              className="session-lock-btn"
              onClick={() => handleSessionLockToggle(true)}
              disabled={sessionLockLoading || !activeSessionYear}
              title="Lock this session after verifying Sheet 3 increments"
            >
              {sessionLockLoading ? 'Working...' : 'Final Lock Session'}
            </button>
          )}
          {sessionLockState?.locked && !isOfficePath && (
            <button
              className="session-unlock-btn"
              onClick={() => handleSessionLockToggle(false)}
              disabled={sessionLockLoading || !activeSessionYear}
              title="DoFA-only action to re-open this session"
            >
              {sessionLockLoading ? 'Working...' : 'Unlock Session'}
            </button>
          )}
        </div>
      </div>

      <div className="eval3-inc-config">
        <h2>Set Increment Percentage by Grade</h2>
        {sessionLockState?.locked && (
          <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
            This academic session is final-locked. Increment settings are read-only.
          </p>
        )}
        {availableGrades.length === 0 ? (
          <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>
            No grades found in Sheet 2. Please finalise grades in Sheet 2 first.
          </p>
        ) : (
          <>
            <div className="inc-rules-grid">
              {availableGrades.map(grade => (
                <div key={grade} className="inc-rule-card">
                  <label>Grade {grade}</label>
                  <div className="inc-input-wrapper">
                    <input
                      type="number"
                      className="inc-input"
                      placeholder="0"
                      value={gradeIncrements[grade] || ''}
                      onChange={(e) => handleIncChange(grade, e.target.value)}
                      disabled={sessionLockState?.locked}
                    />
                    <span>%</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="apply-inc-btn" onClick={applyIncrements} disabled={sessionLockState?.locked}>
              Apply Increments to All Faculty
            </button>
          </>
        )}
      </div>

      <div className="eval3-table-wrapper">
        <table className="eval3-table">
          <colgroup>
            <col /><col /><col /><col /><col /><col />
          </colgroup>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Faculty Name</th>
              <th>Department</th>
              <th>Total Score</th>
              <th>Grade</th>
              <th>Increment %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={item.submission_id}>
                <td style={{ color: '#94a3b8', fontWeight: 500 }}>{idx + 1}</td>
                <td style={{ fontWeight: 600, color: '#1e293b' }}>{item.faculty_name}</td>
                <td style={{ color: '#64748b' }}>{item.department}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                  {item.total_score || 0}
                </td>
                <td className="eval3-grade">{item.final_grade || '-'}</td>
                <td className="eval3-increment">
                  {item.increment_percentage ? `${item.increment_percentage}%` : '0%'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EvaluationSheet3;
