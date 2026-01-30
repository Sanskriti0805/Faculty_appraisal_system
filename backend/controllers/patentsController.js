const db = require('../config/database');

// Get all patents for a faculty
exports.getPatentsByFaculty = async (req, res) => {
  try {
    const [patents] = await db.query(
      'SELECT * FROM patents WHERE faculty_id = ? ORDER BY created_at DESC',
      [req.params.facultyId]
    );

    // Get authors for each patent
    for (let patent of patents) {
      const [authors] = await db.query(
        'SELECT * FROM authors WHERE patent_id = ?',
        [patent.id]
      );
      patent.authors = authors;
    }

    res.json({ success: true, data: patents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create patent
exports.createPatent = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      faculty_id,
      patent_type,
      title,
      agency,
      month,
      publication_id,
      authors
    } = req.body;

    const certificate_file = req.file ? req.file.filename : null;
    
    // Insert patent
    const [result] = await connection.query(
      `INSERT INTO patents 
      (faculty_id, patent_type, title, agency, month, certificate_file, publication_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [faculty_id, patent_type, title, agency, month, certificate_file, publication_id]
    );

    const patentId = result.insertId;

    // Insert authors
    if (authors && Array.isArray(authors)) {
      for (const author of authors) {
        await connection.query(
          'INSERT INTO authors (patent_id, first_name, last_name) VALUES (?, ?, ?)',
          [patentId, author.firstName, author.lastName]
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Patent created successfully',
      data: { id: patentId, file: certificate_file }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

// Delete patent
exports.deletePatent = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM patents WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Patent not found' });
    }

    res.json({ success: true, message: 'Patent deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
