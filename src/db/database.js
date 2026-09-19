const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

class AppDatabase{
    constructor(){
        const dbPath = path.join(app.getPath('userData'), 'bibliotech.sqlite');
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.setUpDataBase();
    }
setUpDataBase(){
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS livros(
            id_livro INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            autor TEXT NOT NULL,
            genero TEXT,
            quantidade_livros_total INTEGER NOT NULL DEFAULT 1 CHECK (quantidade_livros_total >= 0),
            quantidade_livros_disponiveis INTEGER NOT NULL DEFAULT 1 CHECK (quantidade_livros_disponiveis >= 0),
            data_cadastro TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            observacao TEXT
        );

        CREATE TABLE IF NOT EXISTS emprestimos(
            id_emprestimo INTEGER PRIMARY KEY AUTOINCREMENT,
            id_livro INTEGER NOT NULL REFERENCES livros(id_livro) ON DELETE RESTRICT,
            turma_serie TEXT,
            nome_solicitante TEXT,
            tipo_solicitante TEXT NOT NULL DEFAULT 'aluno' CHECK (tipo_solicitante IN ('aluno', 'nao aluno')),
            data_emprestimo TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            data_devolucao_prevista TEXT NOT NULL,
            data_devolucao_efetiva TEXT,
            status_emprestimo TEXT NOT NULL DEFAULT 'emprestado' CHECK (status_emprestimo IN ('emprestado', 'devolvido', 'devolução pendente'))
        );
    `);
    this.migrarTabelaEmprestimos();
}


/**
 Migração leve para bancos criados antes da distinção aluno/professor. Renomeia nome_aluno -> nome_solicitante e adiciona tipo_solicitante, sem apagar nenhum empréstimo já registrado.
 */
migrarTabelaEmprestimos(){
    const colunas = this.db.prepare(`PRAGMA table_info(emprestimos)`).all().map((coluna) => coluna.name);

    if (colunas.includes('nome_aluno') && !colunas.includes('nome_solicitante')) {
        this.db.exec(`ALTER TABLE emprestimos RENAME COLUMN nome_aluno TO nome_solicitante`);
    }

    const colunasAtualizadas = this.db.prepare(`PRAGMA table_info(emprestimos)`).all().map((coluna) => coluna.name);

    if (!colunasAtualizadas.includes('tipo_solicitante')) {
        this.db.exec(`
            ALTER TABLE emprestimos
            ADD COLUMN tipo_solicitante TEXT NOT NULL DEFAULT 'aluno' CHECK (tipo_solicitante IN ('aluno', 'nao_aluno'))
        `);
    }
}
}


module.exports = AppDatabase;