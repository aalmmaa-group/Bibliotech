/** Ponte segura entre a interface e o processo principal do Electron. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bibliotech', {
  books: {
    /** Encaminha ao processo principal os dados validados do livro. */
    create: (book) => ipcRenderer.invoke('books:create', book),
    search: (termo) => ipcRenderer.invoke('books:search', termo)
  },
  loans: {
    /** Encaminha ao processo principal os emprestimo. */
    create: (data) => ipcRenderer.invoke('loans:create', data),
    return: (idEmprestimo) => ipcRenderer.invoke('loans:return', idEmprestimo),
    updateDate: (idEmprestimo, novaData) => ipcRenderer.invoke('loans:updateDate', idEmprestimo, novaData)
  }
});
