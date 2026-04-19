import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SubmissionContext = createContext();

export const SubmissionProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [submissionData, setSubmissionData] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = `http://${window.location.hostname}:5001/api`;

  const fetchSubmissionData = async () => {
    if (!token || user?.role !== 'faculty') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Get my submission ID
      const subRes = await fetch(`${API}/submissions/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const subData = await subRes.json();
      
      if (!subData.success || !subData.data) {
        setSubmissionData(null);
        setLoading(false);
        return;
      }
      
      const submissionId = subData.data.id;

      // 2. Get full details combining all sections
      const detailRes = await fetch(`${API}/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const detailData = await detailRes.json();
      
      if (detailData.success) {
        setSubmissionData(detailData.data);
      }
    } catch (err) {
      console.error('Error fetching submission context data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissionData();
  }, [user, token]);

  return (
    <SubmissionContext.Provider value={{ submissionData, loading, refetchSubmission: fetchSubmissionData }}>
      {children}
    </SubmissionContext.Provider>
  );
};

export const useSubmission = () => useContext(SubmissionContext);
