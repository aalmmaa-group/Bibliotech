# Guia da Épica 2 — empréstimos e devoluções

Este documento complementa o README original sem substituir as informações mantidas pela equipe.

## Estado atual do front-end

- navegação para empréstimos pelo menu lateral, pela Gestão e pelo acesso rápido;
- formulário com aluno, turma, livro e data de devolução;
- validação acessível dos campos obrigatórios;
- calendário próprio com seleção manual e atalhos de 7, 14 e 30 dias;
- aba e estrutura vazia para devoluções pendentes;
- indicadores e movimentações sem dados fictícios, preparados para receber consultas reais.

## Como iniciar no Electron

É necessário ter o Node.js instalado. Na pasta raiz do projeto, execute:

```powershell
npm install
npm start
```

Em uma instalação limpa, `npm ci` também pode ser usado no lugar de `npm install`.

O banco local é criado automaticamente no Windows em:

```text
%APPDATA%\Bibliotech\bibliotech.sqlite
```

## Como gerar o instalador

```powershell
npm run build
```

Os arquivos empacotados são gerados na pasta `dist`.

## Estrutura relacionada

```text
front-end/          Interface, estilos, scripts e recursos visuais
src/db/database.js  Estrutura e inicialização do SQLite
main.js             Processo principal e handlers IPC do Electron
preload.js          Ponte segura entre a interface e o processo principal
```

## Integração existente

O cadastro de livro já percorre o fluxo:

```text
front-end → window.bibliotech.books.create → books:create → SQLite
```

## Contrato preparado para empréstimos

O formulário produz os dados abaixo. O `bookId` ficará disponível quando a busca do acervo passar a consultar o banco:

```js
{
  bookId,
  bookName,
  studentName,
  classroom,
  expectedReturnDate
}
```
