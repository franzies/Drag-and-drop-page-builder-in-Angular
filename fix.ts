import { execSync } from 'child_process';
import * as fs from 'fs';

try {
  execSync('git checkout src/app/builder/sidebar/sidebar.component.ts');
  console.log('Restored file');
  
  let content = fs.readFileSync('src/app/builder/sidebar/sidebar.component.ts', 'utf8');
  content = content.replace(/html:\s*'<([a-zA-Z0-9]+)([\s>])/g, 'html: \'<$1 data-dcat-map=""$2');
  fs.writeFileSync('src/app/builder/sidebar/sidebar.component.ts', content);
  console.log('Updated file correctly');
} catch (e) {
  console.error(e);
}
