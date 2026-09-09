const fs = require('fs');
const path = require('path');

const replacements = [
  // Backgrounds
  { regex: /bg-\[\#0B0D13\]/g, replacement: 'bg-canvas' },
  { regex: /bg-\[\#161B26\]/g, replacement: 'bg-surface' },
  { regex: /bg-\[\#0E121A\]/g, replacement: 'bg-inset' },
  { regex: /bg-\[\#232B3E\]/g, replacement: 'bg-subtle' }, // Let's use subtle for #232B3E background
  
  // Borders
  { regex: /border-\[\#232B3E\]/g, replacement: 'border-subtle' },
  { regex: /border-\[\#06B6D4\]/g, replacement: 'border-brand-cyan' },
  { regex: /border-\[\#10B981\]/g, replacement: 'border-brand-emerald' },
  
  // Text
  { regex: /text-\[\#0B0D13\]/g, replacement: 'text-canvas' },
  { regex: /text-\[\#161B26\]/g, replacement: 'text-surface' },
  { regex: /text-\[\#8F9CAE\]/g, replacement: 'text-secondary' },
  { regex: /text-\[\#06B6D4\]/g, replacement: 'text-brand-cyan' },
  { regex: /text-\[\#10B981\]/g, replacement: 'text-brand-emerald' },
  
  // Custom Cyan
  { regex: /bg-\[\#06B6D4\]/g, replacement: 'bg-brand-cyan' },
  { regex: /from-\[\#06B6D4\]/g, replacement: 'from-brand-cyan' },
  { regex: /to-\[\#06B6D4\]/g, replacement: 'to-brand-cyan' },
  
  // Emerald
  { regex: /bg-\[\#10B981\]/g, replacement: 'bg-brand-emerald' },

  // Replace text-white with text-primary when it's not a button or badge that should stay white
  // This is tricky, let's keep text-white as is, but in index.css we can map text-white to text-primary? No, white should be white.
  // The prompt says: Primary Typography: #FFFFFF (Pure White) ... #0F172A (Slate Dark Navy) for light mode.
  // So we should replace text-white with text-primary. Let's do a targeted replace for text-white.
  // But wait, what if it's on a cyan button? bg-brand-cyan text-white. In light mode bg-brand-cyan is #0284C7, text-white is still good.
  // We'll replace text-white with text-primary manually where it makes sense, or just replace all text-white with text-primary and fix the buttons.
  // Actually, wait, text-white is used everywhere. Let's do text-white -> text-primary.
  // Let's hold off on text-white for a moment.
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory('./src');
console.log('Migration complete.');
