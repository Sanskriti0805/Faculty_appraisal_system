export const generateHTMLForSubmission = (sub, facultyInfo, publications, courses, grants, patents, awards, proposals, newCourses, goals) => {
  const getSubTableHTML = (dataArray, columns, keys) => {
    if (!dataArray || dataArray.length === 0) return '<p style="text-align:center; color:#888;">No entries found for this section.</p>';
    const headerRow = columns.map(col => `<th>${col}</th>`).join('');
    const rows = dataArray.map(item => {
      const cells = keys.map(key => `<td>${item[key] || 'â€”'}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headerRow}</tr></thead><tbody>${rows}</tbody></table>`;
  };

  return `
    <html>
      <head>
        <title>Appraisal Form - ${sub.faculty_name.replace(/\s+/g, '_')}_${sub.academic_year}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
          @page { margin: 15mm 15mm 20mm 15mm; size: A4 portrait; }
          body {
            font-family: 'Roboto', sans-serif;
            color: #333;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .container { max-width: 190mm; margin: 0 auto; padding: 20px; }
          .header {
            display: flex;
            align-items: center;
            justify-content: center;
            border-bottom: 3px solid #800000;
            padding-bottom: 15px;
            margin-bottom: 25px;
            gap: 20px;
          }
          .logo { width: 90px; height: auto; }
          .title-area { text-align: center; }
          .univ-name { font-size: 24px; font-weight: 700; color: #800000; margin: 0; letter-spacing: 0.5px; }
          .doc-title { font-size: 18px; font-weight: 500; color: #444; margin: 5px 0; }
          .ay-badge {
            display: inline-block;
            background: #800000;
            color: #fff;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
          }
          .section-title {
            background-color: #f4f6f9;
            color: #1a365d;
            padding: 10px 15px;
            font-size: 16px;
            font-weight: 600;
            border-left: 4px solid #1a365d;
            margin: 30px 0 15px 0;
            border-radius: 0 4px 4px 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 25px;
          }
          .info-item {
            background: #fdfdfd;
            border: 1px solid #eee;
            padding: 12px;
            border-radius: 6px;
          }
          .info-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .info-value { font-size: 14px; font-weight: 500; color: #222; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
          }
          th {
            background-color: #1a365d;
            color: white;
            font-weight: 500;
            text-align: left;
            padding: 10px;
            border: 1px solid #1a365d;
          }
          td {
            padding: 8px 10px;
            border: 1px solid #ddd;
            color: #444;
          }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .submission-meta {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px dashed #ccc;
            font-size: 11px;
            color: #777;
            text-align: left;
          }
          .goals-section {
            background: #fafafa;
            border: 1px solid #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .goal-item {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
          }
          .goal-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
          .goal-title { font-weight: 600; color: #333; font-size: 14px; margin-bottom: 5px; }
          .goal-desc { color: #555; font-size: 13px; line-height: 1.4; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/LNMIIT_logo.png/220px-LNMIIT_logo.png" class="logo" alt="LNMIIT Logo" onerror="this.style.display='none'" />
            <div class="title-area">
              <h1 class="univ-name">The LNM Institute of Information Technology</h1>
              <h2 class="doc-title">Faculty Annual Appraisal Report</h2>
              <div class="ay-badge">Academic Year: ${sub.academic_year}</div>
            </div>
          </div>

          <h2 class="section-title">Part A: Faculty Data Sheet</h2>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Faculty Name</div>
              <div class="info-value">${sub.faculty_name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Department</div>
              <div class="info-value">${sub.department || 'â€”'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Designation</div>
              <div class="info-value">${facultyInfo?.designation || 'â€”'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Evaluation Status</div>
              <div class="info-value" style="color: ${sub.status === 'approved' ? '#2e7d32' : '#ed6c02'}">${sub.status.toUpperCase()}</div>
            </div>
          </div>

          <h2 class="section-title">1. Teaching and Learning</h2>
          <h3 style="font-size: 14px; color: #555;">1.1 Courses Taught</h3>
          ${getSubTableHTML(courses, 
            ['Course Name', 'Code', 'Semester', 'Program', 'Enrollment'], 
            ['course_name', 'course_code', 'semester', 'program', 'enrollment']
          )}
          
          <h3 style="font-size: 14px; color: #555;">1.2 New Courses Developed</h3>
          ${getSubTableHTML(newCourses, 
            ['Course Name', 'Code', 'Level', 'Program'], 
            ['course_name', 'course_code', 'level', 'program']
          )}

          <h2 class="section-title">2. Research and Development</h2>
          <h3 style="font-size: 14px; color: #555;">2.1 Publications</h3>
          ${getSubTableHTML(publications, 
            ['Type', 'Title', 'Year', 'Journal/Conf'], 
            ['publication_type', 'title', 'year_of_publication', 'journal_name']
          )}

          <h3 style="font-size: 14px; color: #555;">2.2 Research Grants</h3>
          ${getSubTableHTML(grants, 
            ['Project Name', 'Agency', 'Amount (L)', 'Role', 'Status'], 
            ['project_name', 'funding_agency', 'amount_in_lakhs', 'role', 'status']
          )}

          <h3 style="font-size: 14px; color: #555;">2.3 Patents</h3>
          ${getSubTableHTML(patents, 
            ['Title', 'Type', 'Status', 'Filing Date'], 
            ['title', 'patent_type', 'status', 'filing_date']
          )}

          <div class="page-break"></div>
          <div class="header">
            <img src="https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/LNMIIT_logo.png/220px-LNMIIT_logo.png" class="logo" alt="LNMIIT Logo" onerror="this.style.display='none'" />
            <div class="title-area">
              <h1 class="univ-name">The LNM Institute of Information Technology</h1>
              <h2 class="doc-title">Faculty Annual Appraisal Report</h2>
              <div class="ay-badge">Academic Year: ${sub.academic_year}</div>
            </div>
          </div>

          <h2 class="section-title">Part B: Goal Setting</h2>
          <div class="goals-section">
            ${goals && goals.length > 0 ? goals.map((g, i) => \`
              <div class="goal-item">
                <div class="goal-title">\${i + 1}. \${g.goal_type || 'General Goal'}</div>
                <div class="goal-desc"><strong>Target:</strong> \${g.goal_description || 'â€”'}</div>
                <div class="goal-desc" style="margin-top: 5px;"><strong>Achievement Status:</strong> \${g.achievement_status || 'In Progress'}</div>
                <div class="goal-desc" style="margin-top: 5px;"><strong>Self Appraisal Marks:</strong> \${g.self_appraisal_marks || 'â€”'}</div>
              </div>
            \`).join('') : '<p style="text-align:center; color:#888;">No goals set for this session.</p>'}
          </div>

          <div class="submission-meta">
            <strong>Document Identifier:</strong> SUB-\${sub.id}-\${sub.academic_year}<br/>
            <strong>Generated By:</strong> LNMIIT Faculty Appraisal System<br/>
            <strong>Timestamp:</strong> \${new Date().toLocaleString()}<br/>
            *This is an automatically generated document.
          </div>
          
          <div style="margin-top: 60px; display: flex; justify-content: space-between;">
            <div style="text-align: center; width: 200px;">
              <div style="height: 100px; border-bottom: 1px solid #333;"></div>
              <p style="margin-top: 5px; font-weight: 500;">Signature of Faculty</p>
            </div>
            <div style="text-align: center; width: 200px;">
              <div style="height: 100px; border-bottom: 1px solid #333;"></div>
              <p style="margin-top: 5px; font-weight: 500;">Signature of Reviewer</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  \`;
};
