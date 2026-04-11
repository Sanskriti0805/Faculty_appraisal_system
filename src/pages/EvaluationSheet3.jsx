import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../services/api';
import './EvaluationSheet3.css';

const EvaluationSheet3 = () => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/dofa-office') ? '/dofa-office' : '/dofa';
  const [data, setData] = useState([]);
  const [gradeIncrements, setGradeIncrements] = useState({});
  const [availableGrades, setAvailableGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/evaluation/sheet3');
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
      }
    } catch (err) {
      showToast('Error loading Sheet 3 data', 'error');
    } finally {
      setLoading(false);
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
      setLoading(true);
      const incArray = availableGrades.map((grade) => ({
        grade,
        increment_percentage: gradeIncrements[grade] || 0
      }));
      await apiClient.post('/evaluation/grade-increments', { increments: incArray });
      const res = await apiClient.post('/evaluation/apply-increments');
      if (res.success) {
        showToast('Increments applied successfully');
        fetchData();
      }
    } catch {
      showToast('Error applying increments', 'error');
      setLoading(false);
    }
  };

  if (loading) return <div className="eval3-loading">Loading Sheet 3…</div>;

  return (
    <div className="eval3-container">
      {toast && <div className={`eval3-toast eval3-toast--${toast.type}`}>{toast.message}</div>}

      <div className="eval3-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Evaluation — Sheet 3</h1>
            <p>Grade-based Salary Increments Summary</p>
          </div>
          <Link to={`${basePath}/sheet2`} className="back-btn">
            &larr; Back to Sheet 2
          </Link>
        </div>
      </div>

      <div className="eval3-inc-config">
        <h2>Set Increment Percentage by Grade</h2>
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
                    />
                    <span>%</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="apply-inc-btn" onClick={applyIncrements}>
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
                <td className="eval3-grade">{item.final_grade || '—'}</td>
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