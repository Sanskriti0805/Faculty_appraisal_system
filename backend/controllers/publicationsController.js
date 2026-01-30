const db = require('../config/database');

// Get all publications for a faculty
exports.getPublicationsByFaculty = async (req, res) => {
  try {
    const [publications] = await db.query(
      'SELECT * FROM research_publications WHERE faculty_id = ? ORDER BY created_at DESC',
      [req.params.facultyId]
    );

    // Get authors for each publication
    for (let pub of publications) {
      const [authors] = await db.query(
        'SELECT * FROM authors WHERE publication_id = ?',
        [pub.id]
      );
      pub.authors = authors;

      // Get editors if it's a book chapter
      if (pub.sub_type === 'Book Chapter') {
        const [editors] = await db.query(
          'SELECT * FROM editors WHERE publication_id = ?',
          [pub.id]
        );
        pub.editors = editors;
      }
    }

    res.json({ success: true, data: publications });
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
      editors
    } = req.body;

    // Insert publication
    const [result] = await connection.query(
      `INSERT INTO research_publications 
      (faculty_id, publication_type, sub_type, title, year_of_publication, journal_name, 
       conference_name, abbreviation, volume, number, pages_from, pages_to, date_from, 
       date_to, type_of_conference, city, state, country, publication_agency, title_of_book, 
       publication_id, details) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [faculty_id, publication_type, sub_type, title, year_of_publication, journal_name,
       conference_name, abbreviation, volume, number, pages_from, pages_to, date_from,
       date_to, type_of_conference, city, state, country, publication_agency, title_of_book,
       publication_id, details]
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
