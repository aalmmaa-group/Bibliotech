/** Ponte segura entre a interface e o processo principal do Electron. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bibliotech', {
  books: {
    /** Encaminha ao processo principal os dados validados do livro. */
    create: (book) => ipcRenderer.invoke('books:create', book),

    list: () => ipcRenderer.invoke('books:list'),
    search: (termo) => ipcRenderer.invoke('books:search', termo),
    update: (data) => ipcRenderer.invoke('books:update', data)
  },
  loans: {
    /** Encaminha ao processo principal os emprestimo. */
    create: (data) => ipcRenderer.invoke('loans:create', data),
    return: (idEmprestimo) => ipcRenderer.invoke('loans:return', idEmprestimo),
    updateDate: (idEmprestimo, novaData) => ipcRenderer.invoke('loans:updateDate', idEmprestimo, novaData),
    listActive: () =>  ipcRenderer.invoke('loans:listActive'),
    getReturnedThisMonth: () => ipcRenderer.invoke('loans:getReturnedThisMonth'),
    getLoanedThisMonth: () => ipcRenderer.invoke('loans:getLoanedThisMonth'),
    getTopBooksAllTime: () => ipcRenderer.invoke('loans:getTopBooksAllTime')
  },
  reports: {
  getDashboard: (filtros) => ipcRenderer.invoke('reports:getDashboard', filtros),
  generatePDF: (dados) => ipcRenderer.invoke('reports:generatePDF', dados)
  }
  
});
