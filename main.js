/** Processo principal: cria a janela e recebe chamadas seguras da interface. */
const { app, BrowserWindow, ipcMain, dialog } = require('electron/main');
const fs = require('fs');
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
    icon: path.join(__dirname, 'build', 'icon.png'),
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
ipcMain.handle('books:update', async (event, dadosLivro) => {
  return atualizarLivro(dadosLivro);
});
ipcMain.handle('loans:create', async (event, loanData) => {
  return realizarEmprestimo(loanData);
});
ipcMain.handle('books:search', async (event, termo) => {
  return buscarLivrosPorNome(termo);
});

ipcMain.handle('loans:listActive', async() => {
  return listarEmprestimosAtivos(); 
})

ipcMain.handle('loans:updateStatus', async() => {
  return atualizarStatusDevolução();
})

ipcMain.handle('loans:getReturnedThisMonth', async () => {
  return buscarDevolucoesDoMes();
});

ipcMain.handle('loans:getLoanedThisMonth', async () => {
  return buscarEmprestimosDoMes();
});

ipcMain.handle('loans:getTopBooksAllTime', () => {
  return buscarRankingHistorico();
});

ipcMain.handle('reports:generatePDF', async (event, dados) => {
  return geradorPDF(event, dados);
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

// Função para atualizar todos os dados de um livro
function atualizarLivro(dadosLivro) {
  if (!db || !db.db) {
    return { ok: false, message: 'O banco de dados está indisponível.' };
  }

  try {
    const stmt = db.db.prepare(`
      UPDATE livros 
      SET 
        nome = ?, 
        autor = ?, 
        genero = ?, 
        quantidade_livros_total = ?, 
        quantidade_livros_disponiveis = ?, 
        observacao = ?
      WHERE id_livro = ?
    `);
    
    // Executa a query injetando os dados exatos
    const info = stmt.run(
      dadosLivro.nome, 
      dadosLivro.autor, 
      dadosLivro.genero, 
      dadosLivro.quantidade_livros_total,
      dadosLivro.quantidade_livros_disponiveis,
      dadosLivro.observacao, 
      dadosLivro.id_livro
    );

    if (info.changes === 0) {
      return { ok: false, message: 'Não foi possível alterar. O livro não existe.' };
    }

    return { ok: true, message: 'Todas as informações do livro foram atualizadas!' };

  } catch (erro) {
    console.error("Erro ao atualizar o livro:", erro);
    return { ok: false, message: "Erro interno ao processar a edição." };
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
  const { bookId, studentName, classroom, expectedReturnDate, borrowerType } = loanData;

  // Converte o valor recebido para corresponder à regra da base de dados ('aluno' ou 'nao aluno')
  let tipoSolicitanteFormatado = 'aluno';

  if (borrowerType === 'student' || borrowerType === 'aluno') {
    tipoSolicitanteFormatado = 'aluno';
  } else {
    tipoSolicitanteFormatado = 'nao aluno';
  }
  // Barreira de segurança
  if (!bookId || !studentName || !classroom || !expectedReturnDate || !borrowerType) {
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
          nome_solicitante, 
          data_devolucao_prevista,
          tipo_solicitante
        ) VALUES (?, ?, ?, ?, ?)
      `);
      
      const info = stmtEmprestimo.run(bookId, classroom, studentName, expectedReturnDate, tipoSolicitanteFormatado);

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

// Função para registrar a devolução de um livro
function realizarDevolucao(idEmprestimo) {
  if (!db || !db.db) {
    return { ok: false, message: 'O banco de dados está indisponível.' };
  }

  try {
    const processarDevolucao = db.db.transaction(() => {
      
      // Busca qual é o livro que está amarrado a este empréstimo
      const stmtBusca = db.db.prepare(`
        SELECT id_livro, status_emprestimo 
        FROM emprestimos 
        WHERE id_emprestimo = ?
      `);
      const emprestimo = stmtBusca.get(idEmprestimo);

      // Barreiras de segurança
      if (!emprestimo) {
        throw new Error("Empréstimo não encontrado no sistema.");
      }
      if (emprestimo.status_emprestimo === 'devolvido') {
        throw new Error("Este livro já consta como devolvido.");
      }

      // Devolve o livro para o estoque (Soma +1)
      const stmtEstoque = db.db.prepare(`
        UPDATE livros 
        SET quantidade_livros_disponiveis = quantidade_livros_disponiveis + 1 
        WHERE id_livro = ?
      `);
      stmtEstoque.run(emprestimo.id_livro);

      //  Atualiza o status para 'devolvido' e coloca a data de devolução
      const stmtAtualizarEmprestimo = db.db.prepare(`
        UPDATE emprestimos
        SET status_emprestimo = 'devolvido',
            data_devolucao_efetiva = datetime('now', 'localtime')
        WHERE id_emprestimo = ?
      `);
      stmtAtualizarEmprestimo.run(idEmprestimo);
      
    });

    // Executa a transação completa
    processarDevolucao();

    return { ok: true, message: "Livro devolvido com sucesso ao acervo!" };

  } catch (erro) {
    console.error("Erro ao registrar devolução:", erro);
    return { ok: false, message: erro.message || "Erro interno ao processar a devolução." };
  }
}

ipcMain.handle('loans:return', async (event, idEmprestimo) => {
  return realizarDevolucao(idEmprestimo);
});

// Função para alterar a data de devolução de um empréstimo ativo
function alterarDataDevolucao(idEmprestimo, novaData) {
  if (!db || !db.db) {
    return { ok: false, message: 'O banco de dados está indisponível.' };
  }

  try {
    const stmt = db.db.prepare(`
      UPDATE emprestimos 
      SET data_devolucao_prevista = ? 
      WHERE id_emprestimo = ? AND status_emprestimo = 'emprestado'
    `);
    
    const info = stmt.run(novaData, idEmprestimo);

    // Se nenhuma linha foi alterada (changes === 0), o ID não existe ou o livro já foi devolvido
    if (info.changes === 0) {
      return { 
        ok: false, 
        message: 'Não foi possível alterar. O empréstimo não existe ou o livro já foi devolvido.' 
      };
    }

    return { ok: true, message: 'Data de devolução atualizada com sucesso!' };

  } catch (erro) {
    console.error("Erro ao alterar data de devolução:", erro);
    return { ok: false, message: "Erro interno ao processar a renovação." };
  }
}

// Crie o ouvinte para o front-end acessar
ipcMain.handle('loans:updateDate', async (event, idEmprestimo, novaData) => {
  return alterarDataDevolucao(idEmprestimo, novaData);
});

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



//Retorna livros cadastrados
ipcMain.handle('books:list', async () => {
  return listarLivros();
});

// função de listar os livros cadastrados no acervo
function listarLivros() {
  if (!db || !db.db) {
    return {
      ok: false,
      code: 'DB_UNAVAILABLE',
      message: 'O banco de dados está indisponível nesta máquina.'
    };
  }

  try {
    const linhas = db.db.prepare(`
      SELECT
        id_livro,
        nome,
        autor,
        genero,
        quantidade_livros_total,
        quantidade_livros_disponiveis,
        data_cadastro,
        observacao
      FROM livros
      ORDER BY nome COLLATE NOCASE
    `).all();

    return {
      ok: true,
      code: 'SUCCESS',
      message: 'Acervo carregado com sucesso!',
      payload: linhas
    };
  } catch (erro) {
    console.error("Erro ao listar livros no SQLite:", erro);
    return {
      ok: false,
      code: 'SELECT_ERROR',
      message: "Ocorreu um erro interno ao carregar o acervo."
    };
  }
}


// função de buscar os empréstimos 
function listarEmprestimosAtivos() {
  if (!db || !db.db) {
    return {
      ok: false,
      code: 'DB_UNAVAILABLE',
      message: 'O banco de dados está indisponível nesta máquina.'
    };
  }

  try {

    db.db.prepare(`
        UPDATE emprestimos
        SET status_emprestimo = 'devolução pendente'
        WHERE status_emprestimo = 'emprestado' AND date('now', 'localtime') > date(data_devolucao_prevista);
        `).run(); 

    const linhas = db.db.prepare(`
      SELECT
        e.id_emprestimo,
        e.id_livro,
        l.nome AS nome_livro,
        e.nome_solicitante,
        e.turma_serie,
        tipo_solicitante,
        e.data_emprestimo,
        e.data_devolucao_prevista,
        e.data_devolucao_efetiva,
        e.status_emprestimo
      FROM emprestimos e
      JOIN livros l ON l.id_livro = e.id_livro
      WHERE e.status_emprestimo IN ('emprestado', 'devolução pendente')
      ORDER BY e.data_devolucao_prevista ASC
    `).all();
    
    return {
      ok: true,
      code: 'SUCCESS',
      message: 'Devoluções pendentes carregadas com sucesso!',
      payload: linhas
    };
  } catch (erro) {
    console.error("Erro ao listar empréstimos ativos no SQLite:", erro);
    return {
      ok: false,
      code: 'SELECT_ERROR',
      message: "Ocorreu um erro interno ao carregar as devoluções pendentes."
    };
  }
}


//Relatorio
ipcMain.handle('reports:getDashboard', async (event, filtros = {}) => {
  return montarRelatorio(filtros);
});

//A seguinte função tem como objetivo agrupar as principais queries para a tela de relatorio. 
// Obs.: Alguns filtros foram usados na visão geral.
function montarRelatorio(filtros) {
  if (!db || !db.db) {
    return {
      ok: false,
      code: 'DB_UNAVAILABLE',
      message: 'O banco de dados está indisponível nesta máquina.'
    };
  }

  try {
    // Os big numbers iniciais 
    const acervoTotal = db.db.prepare(`
      SELECT SUM(quantidade_livros_total) AS acervoTotal
      FROM livros
    `).get();

    const disponiveis = db.db.prepare(`
      SELECT SUM(quantidade_livros_disponiveis) AS disponiveis
      FROM livros
    `).get();


    const emprestimos = db.db.prepare(`
      SELECT count(status_emprestimo) AS emprestimos
      FROM emprestimos
      WHERE status_emprestimo IN ('emprestado', 'devolução pendente')
     
    `).get();

    const atrasados = db.db.prepare(`
      SELECT count(status_emprestimo) AS atrasados
      FROM emprestimos
      WHERE status_emprestimo IN ('emprestado', 'devolução pendente') AND date('now', 'localtime') > date(data_devolucao_prevista);
      `).get();

      //Empréstimos que exigem atenção = Emprestimos com o prazo de devolução pendente ou prazo está para vencer
      const emprestimosGrafico = db.db.prepare(`
        SELECT e.id_emprestimo, l.nome AS nome_livro, e.turma_serie, e.nome_solicitante, e.data_devolucao_prevista, e.tipo_solicitante, e.status_emprestimo
        FROM emprestimos e
        JOIN livros l on l.id_livro = e.id_livro
        WHERE e.status_emprestimo IN ('emprestado', 'devolução pendente') 
        AND (date(e.data_devolucao_prevista) = date('now', 'localtime', '+3 days') OR  date(e.data_devolucao_prevista) < date('now', 'localtime')) 
        LIMIT 10`).get()

    return {
      ok: true,
      code: 'SUCCESS',
      message: 'Relatório carregado com sucesso!',
      payload: { acervoTotal, disponiveis, emprestimos, atrasados,emprestimosGrafico}
    };
  } catch (erro) {
    console.error('Erro ao montar o relatório:', erro);
    return { ok: false, code: 'SELECT_ERROR', message: 'Erro interno ao montar o relatório.' };
  }
}

function buscarDevolucoesDoMes() {
  try {
    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const anoMesAtual = `${ano}-${mes}`; 

    const stmt = db.db.prepare(`
      SELECT 
        e.id_emprestimo,
        e.nome_solicitante,
        e.data_emprestimo,
        e.data_devolucao_prevista, 
        e.data_devolucao_efetiva,
        l.nome AS nome_livro
      FROM emprestimos e
      JOIN livros l ON e.id_livro = l.id_livro
      WHERE e.status_emprestimo = 'devolvido' 
        AND strftime('%Y-%m', e.data_devolucao_efetiva) = ?
      ORDER BY e.data_devolucao_efetiva DESC
    `);

    const devolvidos = stmt.all(anoMesAtual);
    return { ok: true, data: devolvidos };
  } catch (erro) {
    console.error("Erro ao buscar devoluções do mês:", erro);
    return { ok: false, message: "Erro na base de dados: " + erro.message };
  }
}

function buscarEmprestimosDoMes() {
  try {
    // Pega o ano e mês atuais
    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const anoMesAtual = `${ano}-${mes}`; 

    const stmt = db.db.prepare(`
      SELECT 
        e.id_emprestimo,
        e.nome_solicitante,
        e.turma_serie,
        e.data_emprestimo,
        e.data_devolucao_prevista,
        e.status_emprestimo,
        l.nome AS nome_livro
      FROM emprestimos e
      JOIN livros l ON e.id_livro = l.id_livro
      WHERE strftime('%Y-%m', e.data_emprestimo) = ?
      ORDER BY e.data_emprestimo DESC
    `);
    const emprestados = stmt.all(anoMesAtual);
    return { ok: true, data: emprestados };
  } catch (erro) {
    console.error("Erro ao buscar empréstimos do mês:", erro);
    return { ok: false, message: "Erro na base de dados: " + erro.message };
  }
}

function buscarRankingHistorico(){
  try {
    // Busca os 10 livros mais lidos
    const stmtRanking = db.db.prepare(`
      SELECT 
        l.nome AS nome_livro,
        l.autor,
        COUNT(e.id_emprestimo) AS total_leituras
      FROM livros l
      JOIN emprestimos e ON l.id_livro = e.id_livro
      GROUP BY l.id_livro
      ORDER BY total_leituras DESC
      LIMIT 10
    `);
    const ranking = stmtRanking.all();

    // Busca o total geral de leituras da biblioteca inteira
    const stmtTotal = db.db.prepare(`SELECT COUNT(id_emprestimo) AS total FROM emprestimos`);
    const totalGeral = stmtTotal.get().total;

    return { ok: true, data: ranking, totalGeral: totalGeral };
  } catch (erro) {
    console.error("Erro ao buscar ranking histórico:", erro);
    return { ok: false, message: erro.message };
  }
}

async function geradorPDF(ipcEvent, dados){
  try {
    const titulo = dados?.titulo || 'Relatório';
    const htmlConteudo = dados?.htmlConteudo || '';
    // Abre a caixa de diálogo para o utilizador escolher onde salvar
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: `Salvar Relatório - ${titulo}`,
      defaultPath: path.join(app.getPath('downloads'), `${titulo.toLowerCase().replace(/\s+/g, '_')}.pdf`),
      filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }]
    });

    if (canceled || !filePath) {
      return { ok: false, message: 'Operação cancelada pelo utilizador.' };
    }

    // Cria uma janela oculta para renderizar o layout do PDF
    const winPDF = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false }
    });

    // Estrutura HTML/CSS limpa para impressão em folha A4
    const htmlCompleto = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${titulo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #1a1a1a; }
          h1 { font-size: 22px; margin-bottom: 5px; color: #0d1b2a; }
          .meta-info { font-size: 11px; color: #666; margin-bottom: 25px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
          .summary { display: flex; gap: 15px; margin-bottom: 25px; }
          .card { border: 1px solid #e0e0e0; padding: 12px 16px; border-radius: 6px; flex: 1; background-color: #f9fbfd; }
          .card span { font-size: 11px; color: #555; text-transform: uppercase; display: block; margin-bottom: 4px; }
          .card strong { font-size: 18px; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 12px; }
          th { background-color: #f1f5f9; font-weight: bold; color: #334155; text-transform: uppercase; font-size: 10px; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>${titulo}</h1>
        <div class="meta-info">Relatório emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
        ${htmlConteudo}
      </body>
      </html>
    `;

    await winPDF.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlCompleto)}`);

    // Converte a janela em PDF A4
    const pdfBuffer = await winPDF.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
    });

    // Grava o ficheiro no disco e fecha a janela oculta
    fs.writeFileSync(filePath, pdfBuffer);
    winPDF.close();

    return { ok: true, filePath };
  } catch (erro) {
    console.error("Erro ao gerar PDF:", erro);
    return { ok: false, message: erro.message };
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

