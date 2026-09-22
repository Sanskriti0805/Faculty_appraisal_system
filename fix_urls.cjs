const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // The string we are looking for is exactly: `http://${window.location.hostname}:5001/api`
  // We want to replace it with: (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001/api`)
  
  const searchStr = '`http://${window.location.hostname}:5001/api`';
  const replaceStr = '(import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001/api`)';
  
  // Use simple string split/join to replace all occurrences
  let newContent = content.split(searchStr).join(replaceStr);
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    changed++;
    console.log('Updated', f);
  }
});
console.log('Total files updated:', changed);
