const fs = require('fs');
const path = require('path');

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      content = content.replace(/hover:bg-\[\#0891B2\]/g, 'hover:opacity-90');
      content = content.replace(/hover:bg-\[\#059669\]/g, 'hover:opacity-90');
      content = content.replace(/hover:bg-\[\#323D56\]/g, 'hover:opacity-90');
      content = content.replace(/hover:bg-\[\#3E4A61\]/g, 'hover:opacity-90');
      content = content.replace(/hover:bg-\[\#2A344A\]/g, 'hover:opacity-90');
      
      if (content !== fs.readFileSync(fullPath, 'utf8')) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDirectory('./src');
