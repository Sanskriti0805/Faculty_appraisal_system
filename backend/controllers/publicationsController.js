const db = require('../config/database');

// Get all publications for a faculty (optimized with JOIN to avoid N+1 queries)
exports.getPublicationsByFaculty = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get publications with pagination
    const [publications] = await db.query(
      'SELECT * FROM research_publications WHERE faculty_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.params.facultyId, parseInt(limit), parseInt(offset)]
    );

    // Get total count for pagination
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM research_publications WHERE faculty_id = ?',
      [req.params.facultyId]
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
      authors,
      editors,
      status = 'draft'
    } = req.body;

    // Get uploaded file if exists
    const evidence_file = req.file ? req.file.filename : null;

    // Insert publication
    const [result] = await connection.query(
      `INSERT INTO research_publications 
      (faculty_id, publication_type, sub_type, title, year_of_publication, journal_name, 
       conference_name, abbreviation, volume, number, pages_from, pages_to, date_from, 
       date_to, type_of_conference, city, state, country, publication_agency, title_of_book, 
       publication_id, details, evidence_file, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [faculty_id, publication_type, sub_type, title, year_of_publication, journal_name,
        conference_name, abbreviation, volume, number, pages_from, pages_to, date_from,
        date_to, type_of_conference, city, state, country, publication_agency, title_of_book,
        publication_id, details, evidence_file, status]
    );

    const publicationId = result.insertId;

    // Insert authors
    if (authors && Array.isArray(authors)) {
      for (const author of authors) {
        await connection.query(
          'INSERT INTO authors (publication_id, first_name, middle_name, last_name) VALUES (?, ?, ?, ?)',
          [publicationId, author.first || author.firstName, author.middle || author.middleName, author.last || author.lastName]
        );
      }
    }

    // Insert editors if book chapter
    if (editors && Array.isArray(editors)) {
      for (const editor of editors) {
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
