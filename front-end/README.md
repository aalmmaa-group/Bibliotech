# Front-end — integração Electron

Este diretório contém a interface do Bibliotech.

## Executar localmente

Na raiz do projeto:

```bash
npm install
npm start
```

Na maioria dos computadores, somente esses dois comandos são necessários.
O Electron e as demais dependências serão baixados automaticamente.

### Windows: erro ao instalar `better-sqlite3`

O banco SQLite usa um módulo nativo. Caso o `npm install` informe erro de
`node-gyp`, `Visual Studio` ou compilação C++, instale as **Visual Studio
Build Tools 2022** com o workload **Desktop development with C++**. Depois,
na raiz do projeto, execute:

```bash
npm install
npm rebuild better-sqlite3 --build-from-source
npm start
```

Essa preparação extra só é necessária em máquinas que não recebem um binário
compatível pronto para o Node.js instalado.

## Estrutura adicionada na integração

- `main.js`: cria a janela Electron e centraliza a comunicação com o processo principal.
- `preload.js`: expõe apenas a API segura necessária para a interface.
- `front-end/index.html`: mantém a interface base e inclui Gestão e Cadastro de livro.
- `front-end/script.js`: controla a navegação, mensagens de módulos em construção e validação do formulário.

## Cadastro de livro

O formulário valida título, autor, gênero, quantidade e data de cadastro. Depois,
envia este objeto pelo canal Electron `books:create`:

```js
{
  title,
  author,
  genre,
  quantity,
  registeredAt,
  notes
}
```

O schema SQLite existente permanece em `src/db/database.js`. A persistência
definitiva poderá ser ligada pelo back-end sem necessidade de refazer esta tela.
