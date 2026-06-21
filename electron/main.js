import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import chokidar from 'chokidar';
import matter from 'gray-matter';
import simpleGit from 'simple-git';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vaultPath = path.join(process.cwd(), 'vault');
const git = simpleGit(process.cwd());

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(process.cwd(), 'dist/index.html'));
  }
}

function parseVault() {
  const data = {
    dreams: [],
    projects: [],
    manuscripts: [],
    figures: [],
    experiments: [],
    protocols: [],
    inventory: []
  };

  const tiers = Object.keys(data);

  tiers.forEach(tier => {
    const tierDir = path.join(vaultPath, tier);
    if (fs.existsSync(tierDir)) {
      const files = fs.readdirSync(tierDir).filter(f => f.endsWith('.md'));
      files.forEach(file => {
        const filePath = path.join(tierDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data: frontmatter, content } = matter(fileContent);
        
        let parsedFrontmatter = frontmatter;
        
        data[tier].push({
          ...parsedFrontmatter,
          description: content.trim() || frontmatter.description
        });
      });
    }
  });

  return data;
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('get-vault-data', () => {
    return parseVault();
  });

  ipcMain.handle('update-vault-data', async (event, { tier, id, updates }) => {
    const filePath = path.join(vaultPath, tier, `${id}.md`);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data: frontmatter, content } = matter(fileContent);
      
      const newFrontmatter = { ...frontmatter, ...updates };
      // Description is often stored as markdown body, handle it specially
      let newContent = content;
      if (updates.description !== undefined) {
        newContent = updates.description + '\n';
        delete newFrontmatter.description; // Don't save it twice
      }
      
      const newFileContent = matter.stringify(newContent, newFrontmatter);
      fs.writeFileSync(filePath, newFileContent);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  });

  ipcMain.handle('create-vault-data', async (event, { tier, id, data }) => {
    const tierDir = path.join(vaultPath, tier);
    if (!fs.existsSync(tierDir)) {
      fs.mkdirSync(tierDir, { recursive: true });
    }
    const filePath = path.join(tierDir, `${id}.md`);
    
    // Default empty content if not provided
    const newFileContent = matter.stringify('', data);
    fs.writeFileSync(filePath, newFileContent);
    return { success: true, id };
  });

  ipcMain.handle('git-sync', async () => {
    try {
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        await git.init();
      }
      await git.add('./*');
      const status = await git.status();
      if (status.staged.length > 0) {
        await git.commit('Auto-sync from Scidream Desktop');
      }
      
      const remotes = await git.getRemotes();
      if (remotes.length > 0) {
        await git.pull('origin', 'main', {'--rebase': 'true'});
        await git.push('origin', 'main');
      }
      return { success: true };
    } catch (err) {
      console.error('Git sync error:', err);
      return { success: false, error: err.message };
    }
  });

  // Setup File Watcher
  const watcher = chokidar.watch(vaultPath, { ignored: /(^|[\/\\])\../, persistent: true });
  
  const notifyFrontend = () => {
    if (mainWindow) {
      mainWindow.webContents.send('data-updated', parseVault());
    }
  };

  watcher
    .on('add', notifyFrontend)
    .on('change', notifyFrontend)
    .on('unlink', notifyFrontend);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
