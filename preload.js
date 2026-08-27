/** Ponte segura entre a interface e o processo principal do Electron. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bibliotech', {
  books: {
    /** Encaminha ao processo principal os dados validados do livro. */
    create: (book) => ipcRenderer.invoke('books:create', book)
  }
});
