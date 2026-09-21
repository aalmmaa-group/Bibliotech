const { app } = require('electron');
const path = require('node:path');
const { google } = require('googleapis');
const cron = require('node-cron');
const fs = require('node:fs');

const CREDENTIALS_PATH = path.join(__dirname, '..', '..', 'credentials.json');

const SPREADSHEET_ID  = '1BpSLby5M854H07frnRL3kF83Q2PdhfjSXSjYw9dlz04';

const LAST_BACKUP_PATH = () => path.join(app.getPath('userData'), 'last-backup.json');

let dbRef = null;

function getSheetsClient() {
    // Authenticate with Google and get an authorized client.
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });

}

 
async function escreverAba(sheets, aba, cabecalho, linhas) {
  const valores = [cabecalho, ...linhas];
 
  // Limpa a aba inteira antes de reescrever, assim registros excluídos
  // localmente também somem do backup 
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${aba}!A:Z`,
  });
 
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${aba}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: valores },
  });
}
 
function lerTabelaComoLinhas(nomeTabela) {
  const linhas = dbRef.db.prepare(`SELECT * FROM ${nomeTabela}`).all();
  if (linhas.length === 0) return { cabecalho: [], linhas: [] };
  const cabecalho = Object.keys(linhas[0]);
  const corpo = linhas.map((row) => cabecalho.map((col) => row[col] ?? ''));
  return { cabecalho, linhas: corpo };
}
 
async function executarBackup() {
  if (!dbRef || !dbRef.db) {
    console.warn('[backup] Banco de dados indisponível, backup cancelado.');
    return;
  }
 
  try {
    const sheets = getSheetsClient();
 
    const livros = lerTabelaComoLinhas('livros');
    if (livros.linhas.length > 0) {
      await escreverAba(sheets, 'Livros', livros.cabecalho, livros.linhas);
    }
 
    const emprestimos = lerTabelaComoLinhas('emprestimos');
    if (emprestimos.linhas.length > 0) {
      await escreverAba(sheets, 'Emprestimos', emprestimos.cabecalho, emprestimos.linhas);
    }
 
    salvarDataUltimoBackup();
    console.log(`[backup] Backup concluído com sucesso em ${new Date().toLocaleString('pt-BR')}`);
  } catch (erro) {
    console.error('[backup] Falha ao executar backup:', erro.message);
  }
}
 
function salvarDataUltimoBackup() {
  const hoje = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(LAST_BACKUP_PATH(), JSON.stringify({ data: hoje }));
}
 

function iniciarBackupAutomatico(db) {
  dbRef = db;
}
 
module.exports = { iniciarBackupAutomatico, executarBackup };
