const slugPart = (value, fallback = 'unknown') => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return encodeURIComponent(
    text
      .replace(/\s+/g, '-')
      .replace(/[^\w@.+-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  );
};

export const buildReviewPath = (basePath, submission = {}) => {
  const id = submission?.id;
  if (!id) return basePath;

  const employeeOrFacultyId = submission.employee_id || `faculty-${submission.faculty_id || 'unknown'}`;
  const academicYear = submission.academic_year || 'session-unknown';
  const formType = submission.form_type ? `form-${String(submission.form_type).toUpperCase()}` : 'form-A';

  return `${basePath}/review/${id}/${slugPart(employeeOrFacultyId)}/${slugPart(academicYear)}/${slugPart(formType)}`;
};
