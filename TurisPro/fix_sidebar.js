const fs = require('fs');
const path = require('path');
const glob = require('glob');

const sidebarPath = path.join(__dirname, 'src', 'components', 'sidebar.html');
const sidebarHtml = fs.readFileSync(sidebarPath, 'utf8');

const htmlFiles = glob.sync(path.join(__dirname, 'src', 'pages', '**', '*.html'));
htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const asideRegex = /<aside[\s\S]*?<\/aside>/i;
  if (asideRegex.test(content)) {
    const newContent = content.replace(asideRegex, sidebarHtml);
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated sidebar in ${file}`);
  } else {
    console.log(`No aside found in ${file}`);
  }
});

console.log('Sidebar replacement completed.');