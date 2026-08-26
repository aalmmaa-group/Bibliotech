const AppDatabase = require('./src/db/database');

const { app, BrowserWindow } = require('electron/main');
const path = require('node:path');

let db;



function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('front-end/index.html')
}

app.whenReady().then(() => {
    db = new AppDatabase();
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

//Quando todas as janelas estão fechadas o app fecha
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})