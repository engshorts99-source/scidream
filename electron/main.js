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
const git = simpleGit(vaultPath);

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
    mainWindow.webContents.openDevTools();
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
        
        // Ensure actions are parsed properly if they are in frontmatter
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

  // Handle get-vault-data IPC call
  ipcMain.handle('get-vault-data', () => {
    return parseVault();
  });

  // Handle git-sync IPC call
  ipcMain.handle('git-sync', async () => {
    try {
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        await git.init();
      }
      // Simple sync: add, commit, pull, push
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
