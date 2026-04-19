function getCurrentAcademicYear() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month >= 7) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }

  return `${year - 1}-${String(year).slice(-2)}`;
}

async function getTargetAcademicYear(db) {
  const [sessionRows] = await db.query(
    `SELECT academic_year
     FROM appraisal_sessions
     WHERE status = 'open'
     ORDER BY is_released DESC, created_at DESC, id DESC
     LIMIT 1`
  );

  if (sessionRows.length > 0 && sessionRows[0].academic_year) {
    return sessionRows[0].academic_year;
  }

  return getCurrentAcademicYear();
}

async function getSessionWindowByAcademicYear(db, academicYear) {
  if (!academicYear) return null;

  const [rows] = await db.query(
    `SELECT start_date, COALESCE(deadline, end_date) AS effective_end_date
     FROM appraisal_sessions
     WHERE academic_year = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [academicYear]
  );

  if (rows.length === 0) return null;

  const startDate = rows[0].start_date ? new Date(rows[0].start_date) : null;
  const endDate = rows[0].effective_end_date ? new Date(rows[0].effective_end_date) : null;

  if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const endExclusive = new Date(endDate);
  endExclusive.setDate(endExclusive.getDate() + 1);
  endExclusive.setHours(0, 0, 0, 0);

  return { startDate, endExclusive };
}

async function getCurrentSessionWindow(db) {
  const academicYear = await getTargetAcademicYear(db);
  return getSessionWindowByAcademicYear(db, academicYear);
}

function appendCreatedAtWindow(sql, params, sessionWindow, column = 'created_at') {
  if (!sessionWindow) {
    return { sql, params };
  }

  return {
    sql: `${sql} AND ${column} >= ? AND ${column} < ?`,
    params: [...params, sessionWindow.startDate, sessionWindow.endExclusive]
  };
}

module.exports = {
  getCurrentSessionWindow,
  appendCreatedAtWindow
};
