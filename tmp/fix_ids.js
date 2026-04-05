import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, '../src/pages');
const files = [
  'AwardsHonours.jsx', 'ConferenceSessions.jsx', 
  'Consultancy.jsx', 'CoursesTaught.jsx', 
  'DynamicFormSection.jsx', 'InstitutionalContributions.jsx', 
  'KeynotesTalks.jsx', 'NewCourses.jsx', 
  'PaperReview.jsx', 'Patents.jsx', 
  'ResearchGrants.jsx', 'ResearchPublications.jsx', 
  'TeachingInnovation.jsx', 'TechnologyTransfer.jsx'
];

let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  if (!content.includes('import { useAuth }')) {
    content = content.replace(/(import React.*?)\n/m, "$1\nimport { useAuth } from '../context/AuthContext';\n");
  }

  if (!content.includes('const { user } = useAuth()') && !content.includes('const { user, token } = useAuth()')) {
    const compRegex = /(const \w+ = \([^)]*\) => \{\n)(.*)/m;
    content = content.replace(compRegex, "$1  const { user } = useAuth();\n$2");
  }

  // Handle both dynamic form mapping and other occurrences
  content = content.replace(/const facultyId\s*=\s*1\s*(?:\/\/.*)?/g, 'const facultyId = user?.id || 1;');
  content = content.replace(/faculty_id:\s*1\s*,?/g, 'faculty_id: user?.id || 1,');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
    console.log('Fixed', file);
  }
}

console.log('Total fixed:', fixedCount);
