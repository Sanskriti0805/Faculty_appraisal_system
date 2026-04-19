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

async function getSessionFromSettings(db) {
  try {
    const [rows] = await db.query(
      'SELECT value FROM settings WHERE `key` = ? LIMIT 1',
      ['current_session']
    );

    if (rows.length > 0 && rows[0].value) {
      return String(rows[0].value).trim();
    }
  } catch (error) {
    // settings table may not exist in older deployments; fallback handled below.
  }

  return null;
}

async function getCurrentSessionWindow(db) {
  const fromSettings = await getSessionFromSettings(db);
  const fromActiveSession = await getTargetAcademicYear(db);

  if (fromSettings && fromActiveSession && fromSettings !== fromActiveSession) {
    try {
      await db.query(
        `UPDATE settings
         SET value = ?
         WHERE \`key\` = 'current_session'`,
        [fromActiveSession]
      );
    } catch (error) {
      // Keep request resilient even if settings write fails.
    }
  }

  return fromActiveSession || fromSettings || null;
}

function appendCreatedAtWindow(sql, params, sessionWindow, column = 'created_at') {
  if (!sessionWindow) {
    return { sql, params };
  }

  return {
    sql: `${sql} AND session_id = ?`,
    params: [...params, sessionWindow]
  };
}

module.exports = {
  getCurrentSessionWindow,
  appendCreatedAtWindow
};
