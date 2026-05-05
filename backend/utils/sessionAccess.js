function getCurrentAcademicYear() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month >= 7) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }

  return `${year - 1}-${String(year).slice(-2)}`;
}

function parseDeadlineEndOfDay(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const end = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    end.setHours(23, 59, 59, 999);
    return end;
  }

  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    const [, yyyy, mm, dd] = dateOnly;
    const end = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    end.setHours(23, 59, 59, 999);
    return Number.isNaN(end.getTime()) ? null : end;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(23, 59, 59, 999);
  return parsed;
}

function getSessionState(session, now = new Date()) {
  if (!session) {
    return {
      canWrite: false,
      code: 'NO_ACTIVE_SESSION',
      httpStatus: 403,
      message: 'There is no active appraisal session. Form changes are disabled.'
    };
  }

  const academicYear = session.academic_year || 'current session';
  const isOpen = String(session.status || '').toLowerCase() === 'open';
  const isReleased = Number(session.is_released || 0) === 1;
  const finalLocked = Number(session.final_locked || 0) === 1;
  const deadline = parseDeadlineEndOfDay(session.deadline || session.end_date);
  const pastDeadline = !!deadline && now > deadline;

  if (finalLocked) {
    return {
      canWrite: false,
      code: 'SESSION_FINAL_LOCKED',
      httpStatus: 423,
      message: `Session ${academicYear} is final-locked by DoFA. Form changes are disabled.`
    };
  }

  if (!isOpen) {
    return {
      canWrite: false,
      code: 'SESSION_CLOSED',
      httpStatus: 403,
      message: `Session ${academicYear} is closed. Form submissions are no longer accepted.`
    };
  }

  if (pastDeadline) {
    const deadlineText = deadline.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    return {
      canWrite: false,
      code: 'SUBMISSION_DEADLINE_PASSED',
      httpStatus: 403,
      message: `The submission deadline for ${academicYear} was ${deadlineText}. Form submissions are no longer accepted.`
    };
  }

  if (!isReleased) {
    return {
      canWrite: false,
      code: 'SESSION_NOT_RELEASED',
      httpStatus: 403,
      message: `Forms for ${academicYear} are not currently released. Form changes are disabled.`
    };
  }

  return {
    canWrite: true,
    code: 'SESSION_WRITABLE',
    httpStatus: 200,
    message: 'Forms are open for changes.'
  };
}

async function getLatestOpenSession(db) {
  const [rows] = await db.query(
    `SELECT *
     FROM appraisal_sessions
     WHERE status = 'open'
     ORDER BY is_released DESC, created_at DESC, id DESC
     LIMIT 1`
  );

  return rows[0] || null;
}

async function getLatestSessionForAcademicYear(db, academicYear) {
  if (!academicYear) return null;

  const [rows] = await db.query(
    `SELECT *
     FROM appraisal_sessions
     WHERE academic_year = ?
     ORDER BY
       CASE WHEN status = 'open' THEN 0 ELSE 1 END,
       is_released DESC,
       created_at DESC,
       id DESC
     LIMIT 1`,
    [academicYear]
  );

  return rows[0] || null;
}

async function getSessionWriteAccess(db, academicYear = null) {
  const session = academicYear
    ? await getLatestSessionForAcademicYear(db, academicYear)
    : await getLatestOpenSession(db);
  const state = getSessionState(session);

  return {
    session,
    ...state
  };
}

module.exports = {
  getCurrentAcademicYear,
  getLatestOpenSession,
  getLatestSessionForAcademicYear,
  getSessionState,
  getSessionWriteAccess,
  parseDeadlineEndOfDay
};
