const fs = require('fs');
const path = require('path');

function collectHtmlFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results = results.concat(collectHtmlFiles(full));
    } else if (e.isFile() && e.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const pagesDir = path.join(__dirname, 'src', 'pages');
const htmlFiles = collectHtmlFiles(pagesDir);

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Ensure there is only one <aside> and it stays untouched
  const asideMatch = content.match(/<aside[\s\S]*?<\/aside>/i);
  if (!asideMatch) {
    console.log(`No <aside> found in ${file}`);
    return;
  }
  // Split content after </aside>
  const parts = content.split(/<aside[\s\S]*?<\/aside>/i);
  const beforeAside = parts[0];
  const afterAside = parts.slice(1).join('<aside></aside>'); // remaining after the first aside
  // If already contains <main>, skip (assume it's already SPA ready)
  if (/\<main[\s>]/i.test(afterAside)) {
    console.log(`Already has <main> in ${file}`);
    return;
  }
  // Build new content: before aside (including doctype/head etc) + aside + main wrapper + script
  const newContent = `${beforeAside}${asideMatch[0]}\n<main class="flex-1 overflow-y-auto p-4">${afterAside.trim()}</main>\n<script src="../../assets/js/spa.js"></script>\n</body>`;
  // Replace closing body if exists
  const finalContent = content.replace(/<\/body>/i, newContent);
  fs.writeFileSync(file, finalContent, 'utf8');
  console.log(`Updated SPA structure in ${file}`);
});

console.log('SPA fix completed.');