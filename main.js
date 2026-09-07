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
ipcMain.handle('loans:create', async (event, loanData) => {
  return realizarEmprestimo(loanData);
});
ipcMain.handle('books:search', async (event, termo) => {
  return buscarLivrosPorNome(termo);
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

// Função para registrar o empréstimo de um livro
function realizarEmprestimo(loanData) {
  // Verifica se o banco está conectado
  if (!db || !db.db) {
    return {
      ok: false,
      code: 'DB_UNAVAILABLE',
      message: 'O banco de dados está indisponível nesta máquina.'
    };
  }

  // Extrai as variáveis que vêm do Front-end
  const { bookId, studentName, classroom, expectedReturnDate } = loanData;

  // Barreira de segurança
  if (!bookId || !studentName || !classroom || !expectedReturnDate) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Todos os campos do empréstimo são obrigatórios.'
    };
  }

  try {
    const processarEmprestimo = db.db.transaction(() => {
      
      // Atualiza o estoque da tabela livros 
      const stmtAtualizarLivro = db.db.prepare(`
        UPDATE livros 
        SET quantidade_livros_disponiveis = quantidade_livros_disponiveis - 1 
        WHERE id_livro = ? AND quantidade_livros_disponiveis > 0
      `);
      
      const updateInfo = stmtAtualizarLivro.run(bookId);

      // Cancela tudo se não tiver estoque
      if (updateInfo.changes === 0) {
        throw new Error("Estoque indisponível para este livro.");
      }

      // Insere na tabela de empréstimos

      const stmtEmprestimo = db.db.prepare(`
        INSERT INTO emprestimos (
          id_livro, 
          turma_serie, 
          nome_aluno, 
          data_devolucao_prevista
        ) VALUES (?, ?, ?, ?)
      `);
      
      const info = stmtEmprestimo.run(bookId, classroom, studentName, expectedReturnDate);

      return info.lastInsertRowid; // Retorna o id_emprestimo gerado
    });

    // Executa as duas ações juntas
    const novoEmprestimoId = processarEmprestimo();

    return {
      ok: true,
      code: 'SUCCESS',
      message: "Empréstimo registrado com sucesso!",
      payload: { id_emprestimo: novoEmprestimoId, ...loanData }
    };

  } catch (erro) {
    console.error("Erro ao registrar empréstimo no SQLite:", erro);
    
    if (erro.message === "Estoque indisponível para este livro.") {
       return { ok: false, code: 'STOCK_ERROR', message: erro.message };
    }

    return {
      ok: false,
      code: 'INSERT_ERROR',
      message: "Ocorreu um erro interno ao registrar o empréstimo."
    };
  }
}

function buscarLivrosPorNome(termoBusca) {
  try {
    // Usamos LIKE %termo% para achar o livro mesmo se o usuário digitar só uma parte do nome
    const stmt = db.db.prepare(`
      SELECT id_livro, nome, quantidade_livros_disponiveis 
      FROM livros 
      WHERE nome LIKE ? AND quantidade_livros_disponiveis > 0
      LIMIT 5
    `);
    
    const livrosEncontrados = stmt.all(`%${termoBusca}%`);
    return { ok: true, data: livrosEncontrados };

  } catch (erro) {
    console.error("Erro ao buscar livros:", erro);
    return { ok: false, message: "Erro ao realizar a busca." };
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

