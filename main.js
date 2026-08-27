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
//Substituito pela gravação real -Arthur
ipcMain.handle('books:create', async (_event, book) => {
  // Agora ele chama a função real em vez de retornar o texto pendente
  return cadastrarLivro(book);
});


// função de cadastrar os livros 
function cadastrarLivro(bookData) {
  // Prevenção: verifica se o banco de dados carregou corretamente
  if (!db || !db.db) {
    return {
      ok: false,
      code: 'DB_UNAVAILABLE',
      message: 'O banco de dados está indisponível nesta máquina.'
    };
  }

  const { title, author, genre, quantity, notes = "" } = bookData;
  
  // Não permite que o título, autor, genero ou quantidade estaja vazia.
  if (!title || !author || !genre || quantity === undefined || quantity === "") {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Campos obrigatórios não podem estar vazios.'
    };
  }

  try {
    const stmt = db.db.prepare(`
      INSERT INTO livros (
        nome, 
        autor, 
        genero,   
        quantidade_livros_total, 
        quantidade_livros_disponiveis, 
        observacao
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(title, author, genre, quantity, quantity, notes);

      // Mensagem de retorno
    return {
      ok: true,
      code: 'SUCCESS',
      message: "Livro cadastrado no acervo com sucesso!",
      payload: { id: info.lastInsertRowid, ...bookData } 
    };
      // Mensagem de erro
  } catch (erro) {
    console.error("Erro ao cadastrar livro no SQLite:", erro);
    return { 
      ok: false, 
      code: 'INSERT_ERROR',
      message: "Ocorreu um erro interno ao salvar o livro." 
    };
  }
}


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

