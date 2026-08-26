const { app } = require('electron');
const path = require('node:path');
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
            nome_aluno TEXT,
            data_emprestimo TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            data_devolucao_prevista TEXT NOT NULL,
            data_devolucao_efetiva TEXT,
            status_emprestimo TEXT NOT NULL DEFAULT 'emprestado' CHECK (status_emprestimo IN ('emprestado', 'devolvido', 'devolução pendente'))
        );
    `);
}
}


module.exports = AppDatabase;