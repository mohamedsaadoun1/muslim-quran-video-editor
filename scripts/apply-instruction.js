const fs = require('fs');
const path = require('path');

const instr = process.argv[2] || '';

switch (true) {
  case /fix config path/.test(instr):
    const filesToFix = [
      'js/main.js',
      // لو في ملفات تانية ضيفها هِنا
    ];
    filesToFix.forEach(rel => {
      const fullPath = path.join(process.cwd(), rel);
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/from '\.\/config\//g, "from './features/config/");
      fs.writeFileSync(fullPath, content, 'utf8');
    });
    console.log('✔ Import paths fixed!');
    break;

  default:
    console.log('❌ Unknown instruction:', instr);
}
