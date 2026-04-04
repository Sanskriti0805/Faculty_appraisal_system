import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { getNextPath, getPreviousPath } from '../constants/navigation';

/**
 * FormActions - Standardized action buttons for appraisal forms
 * @param {Object} props
 * @param {Function} props.onSave - Async function that saves the form. Should return true on success.
 * @param {string} props.currentPath - The current route path (location.pathname).
 * @param {boolean} props.loading - Loading state for the save action.
 * @param {boolean} props.showPrevious - Whether to show the "Previous" button.
 */
const FormActions = ({ onSave, currentPath, loading, showPrevious = true, nextLabel = 'Save and Next', onSubmit }) => {
  const navigate = useNavigate();
  const nextPath = getNextPath(currentPath);
  const prevPath = getPreviousPath(currentPath);

  const handleSaveOnly = async () => {
    try {
      await onSave();
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleSaveAndNext = async () => {
    try {
      if (nextLabel === 'Submit for Review' && onSubmit) {
        await onSubmit();
        return;
      }

      const success = await onSave();
      // If onSave doesn't return anything, assume success unless it throws
      if (success !== false && (nextPath || nextLabel !== 'Save and Next')) {
        if (nextPath) {
          navigate(nextPath);
          window.scrollTo(0, 0);
        }
      }
    } catch (error) {
      console.error('Save and Next failed:', error);
    }
  };

  const handlePrevious = () => {
    if (prevPath) {
      navigate(prevPath);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '2rem',
      padding: '1.5rem',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
      position: 'sticky',
      bottom: '1rem',
      zIndex: 10,
      border: '1px solid #eee'
    }}>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {showPrevious && prevPath && (
          <button
            onClick={handlePrevious}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f8f9fa',
              color: '#495057',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            <ArrowLeft size={18} />
            Previous
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={handleSaveOnly}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Draft'}
        </button>

        {(nextPath || nextLabel !== 'Save and Next') && (
          <button
            onClick={handleSaveAndNext}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 2rem',
              backgroundColor: nextLabel === 'Submit for Review' ? '#28a745' : '#5cb85c',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              boxShadow: nextLabel === 'Submit for Review' ? '0 4px 6px rgba(40, 167, 69, 0.2)' : '0 4px 6px rgba(92, 184, 92, 0.2)',
              transition: 'all 0.2s',
              minWidth: '180px'
            }}
          >
            {loading ? 'Saving...' : nextLabel}
            {!loading && nextLabel === 'Save and Next' && <ArrowRight size={18} />}
            {!loading && nextLabel === 'Submit for Review' && <CheckCircle size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default FormActions;
