const db = require('../config/database');

const toNumberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const resolveFacultyInfoId = async ({ facultyId, email }) => {
  const numericFacultyId = toNumberOrNull(facultyId);

  if (email) {
    const [fiByEmail] = await db.query('SELECT id FROM faculty_information WHERE email = ? LIMIT 1', [email]);
    if (fiByEmail.length > 0) {
      return fiByEmail[0].id;
    }
  }

  if (numericFacultyId !== null) {
    const [fiById] = await db.query('SELECT id FROM faculty_information WHERE id = ? LIMIT 1', [numericFacultyId]);
    if (fiById.length > 0) {
      return fiById[0].id;
    }

    const [usersById] = await db.query('SELECT email FROM users WHERE id = ? LIMIT 1', [numericFacultyId]);
    if (usersById.length > 0) {
      const [fiByUserEmail] = await db.query('SELECT id FROM faculty_information WHERE email = ? LIMIT 1', [usersById[0].email]);
      if (fiByUserEmail.length > 0) {
        return fiByUserEmail[0].id;
      }
    }
  }

  return null;
};

const parseJsonArrayField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  return [];
};

// Get all publications for a faculty (optimized with JOIN to avoid N+1 queries)
exports.getPublicationsByFaculty = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const facultyInfoId = await resolveFacultyInfoId({ facultyId: req.params.facultyId });

    if (!facultyInfoId) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }

    // Get publications with pagination
    const [publications] = await db.query(
      'SELECT * FROM research_publications WHERE faculty_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [facultyInfoId, parseInt(limit), parseInt(offset)]
    );

    // Get total count for pagination
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM research_publications WHERE faculty_id = ?',
      [facultyInfoId]
    );
    const total = countResult[0].total;

    // Get all authors for these publications in one query
    if (publications.length > 0) {
      const publicationIds = publications.map(p => p.id);
      const placeholders = publicationIds.map(() => '?').join(',');

      const [authors] = await db.query(
        `SELECT * FROM authors WHERE publication_id IN (${placeholders})`,
        publicationIds
      );

      // Get all editors for these publications in one query
      const [editors] = await db.query(
        `SELECT * FROM editors WHERE publication_id IN (${placeholders})`,
        publicationIds
      );

      // Group authors and editors by publication_id
      const authorsByPub = authors.reduce((acc, author) => {
        if (!acc[author.publication_id]) acc[author.publication_id] = [];
        acc[author.publication_id].push(author);
        return acc;
      }, {});

      const editorsByPub = editors.reduce((acc, editor) => {
        if (!acc[editor.publication_id]) acc[editor.publication_id] = [];
        acc[editor.publication_id].push(editor);
        return acc;
      }, {});

      // Attach authors and editors to publications
      publications.forEach(pub => {
        pub.authors = authorsByPub[pub.id] || [];
        pub.editors = editorsByPub[pub.id] || [];
      });
    }

    res.json({
      success: true,
      data: publications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create publication
exports.createPublication = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      faculty_id,
      publication_type,
      sub_type,
      title,
      year_of_publication,
      journal_name,
      conference_name,
      abbreviation,
      volume,
      number,
      pages_from,
      pages_to,
      date_from,
      date_to,
      type_of_conference,
      city,
      state,
      country,
      publication_agency,
      title_of_book,
      publication_id,
      details,
      existing_evidence_file,
      authors,
      editors,
      status = 'draft'
    } = req.body;

    const facultyInfoId = await resolveFacultyInfoId({
      facultyId: faculty_id || req.user?.id,
      email: req.user?.email
    });

    if (!facultyInfoId) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const parsedAuthors = parseJsonArrayField(authors);
    const parsedEditors = parseJsonArrayField(editors);
    const normalizedDateFrom = date_from && String(date_from).trim() !== '' ? date_from : null;
    const normalizedDateTo = date_to && String(date_to).trim() !== '' ? date_to : null;

    if (!publication_type) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Publication type is required.' });
    }

    if (publication_type === 'Conference' && (!normalizedDateFrom || !normalizedDateTo)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Date From and Date To are required for conference publications.' });
    }

    if (publication_type === 'Monographs' && !sub_type) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Monograph sub-type is required.' });
    }

    // Preserve previous file when no new upload is provided.
    const evidence_file = req.file ? req.file.filename : (existing_evidence_file || null);

    // Insert publication
    const [result] = await connection.query(
      `INSERT INTO research_publications 
      (faculty_id, publication_type, sub_type, title, year_of_publication, journal_name, 
       conference_name, abbreviation, volume, number, pages_from, pages_to, date_from, 
       date_to, type_of_conference, city, state, country, publication_agency, title_of_book, 
       publication_id, details, evidence_file, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [facultyInfoId, publication_type, sub_type, title, year_of_publication, journal_name,
        conference_name, abbreviation, volume, number, pages_from, pages_to, normalizedDateFrom,
        normalizedDateTo, type_of_conference, city, state, country, publication_agency, title_of_book,
        publication_id, details, evidence_file, status]
    );

    const publicationId = result.insertId;

    // Insert authors
    if (parsedAuthors.length > 0) {
      for (const author of parsedAuthors) {
        await connection.query(
          'INSERT INTO authors (publication_id, first_name, middle_name, last_name) VALUES (?, ?, ?, ?)',
          [publicationId, author.first || author.firstName, author.middle || author.middleName, author.last || author.lastName]
        );
      }
    }

    // Insert editors if book chapter
    if (parsedEditors.length > 0) {
      for (const editor of parsedEditors) {
        await connection.query(
          'INSERT INTO editors (publication_id, first_name, middle_name, last_name) VALUES (?, ?, ?, ?)',
          [publicationId, editor.first || editor.firstName, editor.middle || editor.middleName, editor.last || editor.lastName]
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Publication created successfully',
      data: { id: publicationId }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// Delete publication
exports.deletePublication = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM research_publications WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Publication not found' });
    }

    res.json({ success: true, message: 'Publication deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
