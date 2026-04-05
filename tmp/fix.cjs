const fs = require('fs');
const path = require('path');
const dir = path.join('c:/Users/Sanskriti/projects/faculty_appraisal_system/src/pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
let changedFiles = [];
for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let oldContent = content;
  content = content.replace(/const user = JSON\.parse\(localStorage\.getItem\('auth_user'\) \|\| '\{\{\}\}'\);\\n\s*const facultyId = user\?\.id \|\| 1;/g, "const user = JSON.parse(localStorage.getItem('auth_user') || '{}');\n      const facultyId = user?.id || 1;");
  
  if (content !== oldContent) {
    fs.writeFileSync(filePath, content);
    changedFiles.push(file);
  }
}
console.log('Modified files:', changedFiles);
