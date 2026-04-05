const db = require('../config/database');
const { resolveFacultyInfoId } = require('../utils/facultyResolver');

const parseJsonArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Get all patents for a faculty
exports.getPatentsByFaculty = async (req, res) => {
  try {
    const facultyInfoId = await resolveFacultyInfoId({ facultyId: req.params.facultyId });
    if (!facultyInfoId) {
      return res.json({ success: true, data: [] });
    }

    const [patents] = await db.query(
      'SELECT * FROM patents WHERE faculty_id = ? ORDER BY created_at DESC',
      [facultyInfoId]
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

    const facultyInfoId = await resolveFacultyInfoId({
      facultyId: faculty_id || req.user?.id,
      email: req.user?.email
    });

    if (!facultyInfoId) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const parsedAuthors = parseJsonArrayField(authors);

    const certificate_file = req.file ? req.file.filename : null;
    
    // Insert patent
    const [result] = await connection.query(
      `INSERT INTO patents 
      (faculty_id, patent_type, title, agency, month, certificate_file, publication_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [facultyInfoId, patent_type, title, agency, month, certificate_file, publication_id]
    );

    const patentId = result.insertId;

    // Insert authors
    if (parsedAuthors.length > 0) {
      for (const author of parsedAuthors) {
        await connection.query(
          'INSERT INTO authors (patent_id, first_name, last_name) VALUES (?, ?, ?)',
          [patentId, author.firstName || '', author.lastName || '']
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
