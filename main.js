/** Processo principal: cria a janela e recebe chamadas seguras da interface. */
const { app, BrowserWindow, ipcMain } = require('electron/main');
const path = require('node:path');

let db;



/** Cria a janela desktop e carrega a interface local do projeto. */
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 680,
    autoHideMenuBar: true,
    webPreferences: {
      // A interface não recebe Node.js diretamente; usa somente o preload.
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.loadFile('front-end/index.html')
}

/**
 * Contrato inicial da tela de cadastro com o processo principal.
 * A camada de persistência pode substituir este retorno pela gravação real.
 */
ipcMain.handle('books:create', async (_event, book) => ({
  ok: false,
  code: 'DATABASE_METHOD_PENDING',
  message: 'Cadastro validado e pronto para conexão com o banco de dados.',
  payload: book
}));

/** Inicializa dependências locais e abre a primeira janela do aplicativo. */
app.whenReady().then(() => {
  // O banco é opcional durante a montagem do front-end. Se a dependência
  // nativa ainda não estiver compilada, a janela Electron continua abrindo.
  try {
    const AppDatabase = require('./src/db/database');
    db = new AppDatabase();
  } catch (error) {
    console.warn('Banco de dados indisponível nesta máquina:', error.message);
  }
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
