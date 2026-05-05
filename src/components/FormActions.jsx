import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { FORM_SEQUENCE, getNextPath, getPreviousPath } from '../constants/navigation';
import { useAuth } from '../context/AuthContext';
import { showConfirm } from '../utils/appDialogs';

const SECTION_GROUP_MEMBERS = {
  teaching_learning: ['courses_taught', 'new_courses', 'courseware', 'teaching_innovation'],
  research_development: ['research_publications', 'research_grants', 'patents', 'technology_transfer', 'paper_review', 'talks_and_conferences', 'awards_honours', 'consultancy', 'continuing_education'],
  other_institutional_activities: ['institutional_contributions', 'other_activities', 'research_plan', 'teaching_plan']
};

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
  const { user, token } = useAuth();
  const [submissionStatus, setSubmissionStatus] = React.useState(null);
  const [approvedSections, setApprovedSections] = React.useState([]);
  const [hasSectionRestrictions, setHasSectionRestrictions] = React.useState(false);
  const [sessionAccessMessage, setSessionAccessMessage] = React.useState('');
  const [toast, setToast] = React.useState(null);

  const validateMandatoryFields = React.useCallback(() => {
    const formRoot = document.querySelector('.form-page form') || document.querySelector('form');
    if (!formRoot) return true;

    const getFieldFromLabel = (label) => {
      const container = label.closest('.form-group, .form-field, .venue-row, .section-fieldset, .form-row, li, .dynamic-section-card, .section-card, .added-sessions-list') || label.parentElement;
      if (!container) return null;
      return container.querySelector('input, select, textarea');
    };

    const markInvalid = (field) => {
      if (field && typeof field.focus === 'function') {
        field.focus();
      }
    };

    const requiredNativeFields = Array.from(formRoot.querySelectorAll('[required]')).filter((field) => {
      if (field.type === 'hidden') return false;
      if (field.type === 'file') return !(field.files && field.files.length > 0);
      return !String(field.value || '').trim();
    });

    if (requiredNativeFields.length > 0) {
      markInvalid(requiredNativeFields[0]);
      setToast('Please fill out all compulsory fields.');
      return false;
    }

    const requiredLabels = Array.from(formRoot.querySelectorAll('label')).filter((label) => label.querySelector('.required-star'));
    for (const label of requiredLabels) {
      const field = getFieldFromLabel(label);
      if (!field) continue;

      const hasValue = field.type === 'file'
        ? Boolean(field.files && field.files.length > 0)
        : Boolean(String(field.value || '').trim());

      if (!hasValue) {
        markInvalid(field);
        setToast('Please fill out all compulsory fields.');
        return false;
      }
    }

    return true;
  }, []);

  const pathToSectionKey = React.useMemo(() => ({
    '/faculty-information': 'faculty_info',
    '/courses-taught': 'courses_taught',
    '/new-courses': 'new_courses',
    '/courseware': 'courseware',
    '/teaching-innovation': 'teaching_innovation',
    '/research-publications': 'research_publications',
    '/research-grants': 'research_grants',
    '/patents': 'patents',
    '/technology-transfer': 'technology_transfer',
    '/paper-review': 'paper_review',
    '/talks-and-conferences': 'talks_and_conferences',
    '/conference-sessions': 'conference_sessions',
    '/keynotes-talks': 'keynotes_talks',
    '/conferences-outside': 'conference_sessions',
    '/other-activities': 'other_activities',
    '/awards-honours': 'awards_honours',
    '/consultancy': 'consultancy',
    '/continuing-education': 'continuing_education',
    '/institutional-contributions': 'institutional_contributions',
    '/other-important-activities': 'other_activities',
    '/research-plan': 'research_plan',
    '/teaching-plan': 'teaching_plan',
    '/part-b': 'part_b',
  }), []);

  const effectiveApprovedSections = React.useMemo(() => {
    const allowed = new Set();
    approvedSections.forEach((key) => {
      allowed.add(key);
      const groupMembers = SECTION_GROUP_MEMBERS[key];
      if (Array.isArray(groupMembers)) {
        groupMembers.forEach((memberKey) => allowed.add(memberKey));
      }
    });
    return allowed;
  }, [approvedSections]);

  React.useEffect(() => {
    const isFaculty = user?.role === 'faculty';
    const isDofaPath = currentPath?.startsWith('/Dofa');
    if (!isFaculty || isDofaPath || !token) return;

    const loadAccess = async () => {
      try {
        const sessionRes = await fetch(`http://${window.location.hostname}:5001/api/sessions/active`);
        const sessionData = await sessionRes.json();
        if (!sessionData.success || !sessionData.data || sessionData.pastDeadline || !sessionData.released) {
          setSessionAccessMessage(sessionData.message || 'Forms are not currently open for changes.');
        } else {
          setSessionAccessMessage('');
        }

        const subRes = await fetch(`http://${window.location.hostname}:5001/api/submissions/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const subData = await subRes.json();

        if (!subData.success || !subData.data) {
          setSubmissionStatus(null);
          setApprovedSections([]);
          setHasSectionRestrictions(false);
          return;
        }

        setSubmissionStatus(subData.data.status);

        if (subData.data.status !== 'sent_back') {
          setApprovedSections([]);
          setHasSectionRestrictions(false);
          return;
        }

        const reqRes = await fetch(`http://${window.location.hostname}:5001/api/edit-requests/my-submission/${subData.data.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const reqData = await reqRes.json();
        const unlockedSections = Array.isArray(reqData.unlockedSections) ? reqData.unlockedSections : [];
        setApprovedSections(unlockedSections);
        setHasSectionRestrictions(unlockedSections.length > 0);
      } catch (error) {
        console.error('Failed to load form action access:', error);
      }
    };

    loadAccess();
  }, [currentPath, token, user]);

  const isPathEditable = React.useCallback((path) => {
    if (user?.role !== 'faculty') return true;
    if (sessionAccessMessage) return false;
    if (path === '/faculty-information') return true;
    if (!submissionStatus || submissionStatus === 'draft') return true;
    if (['submitted', 'submitted_hod', 'under_review', 'under_review_hod', 'approved', 'hod_approved'].includes(submissionStatus)) return false;

    if (submissionStatus === 'sent_back') {
      if (!hasSectionRestrictions) return true;
      if (path === '/part-b') return true;
      if (path.startsWith('/faculty/dynamic/')) {
        const idMatch = path.match(/^\/faculty\/dynamic\/(\d+)$/);
        if (!idMatch) return false;
        return effectiveApprovedSections.has(`dynamic_section_${idMatch[1]}`);
      }
      const sectionKey = pathToSectionKey[path];
      return !!sectionKey && effectiveApprovedSections.has(sectionKey);
    }

    return true;
  }, [effectiveApprovedSections, hasSectionRestrictions, pathToSectionKey, sessionAccessMessage, submissionStatus, user]);

  const getNextEditablePath = React.useCallback((path) => {
    const currentIndex = FORM_SEQUENCE.findIndex(item => item.path === path);
    if (currentIndex === -1) return getNextPath(path);

    for (let i = currentIndex + 1; i < FORM_SEQUENCE.length; i += 1) {
      const candidate = FORM_SEQUENCE[i].path;
      if (isPathEditable(candidate)) {
        return candidate;
      }
    }
    return null;
  }, [isPathEditable]);

  const getPreviousEditablePath = React.useCallback((path) => {
    const currentIndex = FORM_SEQUENCE.findIndex(item => item.path === path);
    if (currentIndex === -1) return getPreviousPath(path);

    for (let i = currentIndex - 1; i >= 0; i -= 1) {
      const candidate = FORM_SEQUENCE[i].path;
      if (isPathEditable(candidate)) {
        return candidate;
      }
    }
    return null;
  }, [isPathEditable]);

  const effectiveNextPath = getNextEditablePath(currentPath);
  const effectivePrevPath = getPreviousEditablePath(currentPath);
  const currentPathEditable = isPathEditable(currentPath);
  const currentPathLocked = user?.role === 'faculty' && !currentPathEditable;
  const lockedMessage = sessionAccessMessage || (submissionStatus === 'sent_back'
    ? 'This section is locked for the current edit cycle.'
    : 'This section is locked after submission. Request edits or wait for Dofa to send it back.');

  const handleSaveOnly = async () => {
    try {
      if (currentPathLocked) {
        setToast(lockedMessage);
        return;
      }
      if (!validateMandatoryFields()) return;
      await onSave();
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleSaveAndNext = async () => {
    try {
      if (currentPathLocked) {
        setToast(lockedMessage);
        if (effectiveNextPath) {
          navigate(effectiveNextPath);
          window.scrollTo(0, 0);
        }
        return;
      }
      if (!validateMandatoryFields()) return;

      // Custom confirmation for specific sections before moving ahead.
      if (typeof onSubmit !== 'function' && currentPath === '/courses-taught') {
        const proceed = await showConfirm({
          title: 'Confirm Before Proceeding',
          message: 'Before you continue, please confirm that you have completed both sections: 4.1 Courses Taught and 4.2 Projects Guided (for all applicable semesters). Do you want to save and proceed?',
          confirmText: 'Yes, Save and Next',
          cancelText: 'Review Again'
        });
        if (!proceed) return;
      }

      if (nextLabel === 'Submit for Review' && onSubmit) {
        await onSubmit();
        return;
      }

      const success = await onSave();
      // If onSave doesn't return anything, assume success unless it throws
      if (success !== false && (effectiveNextPath || nextLabel !== 'Save and Next')) {
        if (effectiveNextPath) {
          navigate(effectiveNextPath);
          window.scrollTo(0, 0);
        } else if (submissionStatus === 'sent_back' && hasSectionRestrictions) {
          window.appToast('No more editable sections are available in this cycle.');
        }
      }
    } catch (error) {
      console.error('Save and Next failed:', error);
    }
  };

  const handlePrevious = () => {
    if (effectivePrevPath) {
      navigate(effectivePrevPath);
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
      {toast && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            right: '1.25rem',
            bottom: '6.25rem',
            zIndex: 9999,
            backgroundColor: '#c53030',
            color: '#fff',
            padding: '0.9rem 1.1rem',
            borderRadius: '10px',
            boxShadow: '0 12px 24px rgba(0,0,0,0.18)',
            minWidth: '280px',
            maxWidth: '420px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#fff',
              fontSize: '1.1rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
            aria-label="Dismiss validation message"
          >
            x
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '1rem' }}>
        {showPrevious && effectivePrevPath && (
          <button
            type="button"
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
          type="button"
          onClick={handleSaveOnly}
          disabled={loading || currentPathLocked}
          title={currentPathLocked ? lockedMessage : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: currentPathLocked ? '#adb5bd' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (loading || currentPathLocked) ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Draft'}
        </button>

        {(effectiveNextPath || nextLabel !== 'Save and Next') && (
          <button
            type="button"
            onClick={handleSaveAndNext}
            disabled={loading || (currentPathLocked && !effectiveNextPath)}
            title={currentPathLocked ? lockedMessage : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 2rem',
              backgroundColor: currentPathLocked ? '#adb5bd' : (nextLabel === 'Submit for Review' ? '#28a745' : '#5cb85c'),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (loading || (currentPathLocked && !effectiveNextPath)) ? 'not-allowed' : 'pointer',
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

