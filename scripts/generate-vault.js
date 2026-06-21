import fs from 'fs';
import path from 'path';
import sampleData from '../src/data/sample-data.js';

const vaultDir = path.join(process.cwd(), 'vault');

if (!fs.existsSync(vaultDir)) {
  fs.mkdirSync(vaultDir, { recursive: true });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

['dreams', 'projects', 'manuscripts', 'figures', 'experiments', 'protocols', 'inventory'].forEach(tier => {
  ensureDir(path.join(vaultDir, tier));
  if (sampleData[tier]) {
    sampleData[tier].forEach(item => {
      const { id, title, description, name, ...rest } = item;
      
      let content = `---\n`;
      content += `id: ${id}\n`;
      if (title) content += `title: "${title.replace(/"/g, '\\"')}"\n`;
      if (name) content += `name: "${name.replace(/"/g, '\\"')}"\n`;
      
      for (const [key, value] of Object.entries(rest)) {
        if (typeof value === 'object') {
          content += `${key}:\n${JSON.stringify(value, null, 2).split('\n').map(l => '  ' + l).join('\n')}\n`;
        } else {
          content += `${key}: ${value}\n`;
        }
      }
      content += `---\n\n`;
      if (description) {
        content += `${description}\n`;
      }
      
      fs.writeFileSync(path.join(vaultDir, tier, `${id}.md`), content);
    });
  }
});

console.log('Vault generated from sample-data.js');
