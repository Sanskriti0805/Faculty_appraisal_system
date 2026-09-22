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
  
  // To handle \`http://${window.location.hostname}:5001/api/some/path\`
  // We'll replace just the inner string part: http://${window.location.hostname}:5001/api
  // But wait, if we do that inside a template literal, we can do:
  // ${import.meta.env.VITE_API_URL || \`http://\${window.location.hostname}:5001/api\`}
  
  // Replace: http://${window.location.hostname}:5001/api
  // With: ${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}
  // But doing so inside an existing template literal might be tricky.
  
  // Simpler approach: import API_BASE_URL everywhere it's needed? No, that's complex to automate.
  // Let's just do a regex replace for the string: http://${window.location.hostname}:5001/api
  // If it's inside backticks, e.g., \`http://${window.location.hostname}:5001/api/foo\`
  // We can replace it with \`${import.meta.env.VITE_API_URL || 'http://' + window.location.hostname + ':5001/api'}/foo\`
  
  let newContent = content.split('http://${window.location.hostname}:5001/api').join("${import.meta.env.VITE_API_URL || 'http://' + window.location.hostname + ':5001/api'}");
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    changed++;
    console.log('Updated', f);
  }
});
console.log('Total files updated:', changed);
