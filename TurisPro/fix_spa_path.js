const fs = require('fs');
const path = require('path');

function updateScriptRefs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      updateScriptRefs(full);
    } else if (e.isFile() && e.name.endsWith('.html')) {
      let content = fs.readFileSync(full, 'utf8');
      const oldPattern = /<script\s+src\s*=\s*["']\.\.\/\.\.\/assets\/js\/spa\.js["']\s*><\/script>/g;
      if (oldPattern.test(content)) {
        content = content.replace(oldPattern, '<script src="/TurisPro/assets/js/spa.js"></script>');
        fs.writeFileSync(full, content, 'utf8');
        console.log(`Updated script path in ${full}`);
      }
    }
  }
}

const pagesDir = path.join(__dirname, 'src', 'pages');
updateScriptRefs(pagesDir);
console.log('All pages updated.');