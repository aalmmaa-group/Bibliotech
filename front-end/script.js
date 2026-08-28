/**
 * Controlador da interface.
 * Centraliza a navegação entre telas, os avisos de módulos futuros e o
 * formulário de cadastro, sem acessar Node.js ou o banco diretamente.
 */

// --- Referências reutilizadas pela interface. ---
const menuItems = document.querySelectorAll('.menu__item');
const overviewPage = document.querySelector('#overviewPage');
const managementPage = document.querySelector('#managementPage');
const registrationPage = document.querySelector('#registrationPage');
const pageTitle = document.querySelector('#pageTitle');
const breadcrumbCurrent = document.querySelector('#breadcrumbCurrent');
const bookForm = document.querySelector('#bookForm');

/**
 * Alterna a tela visível da aplicação.
 * @param {'inicio'|'gestao'|'cadastro'} view Tela que deve ser exibida.
 */
function openView(view) {
  overviewPage.hidden = view !== 'inicio';
  managementPage.hidden = view !== 'gestao';
  registrationPage.hidden = view !== 'cadastro';

  const titleByView = {
    inicio: 'Visão geral',
    gestao: 'Gestão',
    cadastro: 'Cadastro de livro'
  };
  const title = titleByView[view];

  pageTitle.textContent = title;
  breadcrumbCurrent.textContent = title;
  document.title = `${title} | Bibliotech`;

  // Gestão permanece destacado enquanto o formulário de cadastro estiver aberto.
  const activePage = view === 'inicio' ? 'Visão geral' : 'Gestão';
  menuItems.forEach((item) => {
    item.classList.toggle('is-active', item.dataset.page === activePage);
  });
}

/**
 * Mostra uma mensagem temporária no painel de notificações.
 * @param {string} message Texto explicativo para o usuário.
 */
function showPending(message) {
  const panel = document.querySelector('#notificationPanel');
  panel.querySelector('.notification-panel__empty strong').textContent = 'Em construção';
  panel.querySelector('.notification-panel__empty p').textContent = message;
  panel.hidden = false;
  window.setTimeout(() => { panel.hidden = true; }, 3500);
}

/**
 * Valida os campos obrigatórios previstos para um livro.
 * @returns {boolean} true quando todos os campos estão corretos.
 */
function validateBookForm() {
  let isValid = true;

  bookForm.querySelectorAll('input[required]').forEach((input) => {
    const isQuantityInvalid = input.name === 'quantity' && Number(input.value) < 1;
    const hasError = !input.value.trim() || isQuantityInvalid;
    const field = input.closest('label');

    field.classList.toggle('is-invalid', hasError);
    field.querySelector('small').textContent = hasError
      ? 'Preencha este campo corretamente.'
      : '';
    isValid &&= !hasError;
  });

  return isValid;
}

/**
 * Converte os valores do formulário no objeto enviado pela ponte Electron.
 * @returns {{title:string, author:string, genre:string, quantity:number, notes:string}}
 */
function getBookPayload() {
  const formData = new FormData(bookForm);
  return {
    title: formData.get('title').trim(),
    author: formData.get('author').trim(),
    genre: formData.get('genre').trim(),
    quantity: Number(formData.get('quantity')),
    notes: formData.get('notes').trim()
  };
}

/** Conecta botões do menu às telas disponíveis ou aos avisos de planejamento. */
function setupNavigation() {
  menuItems.forEach((item) => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page === 'Visão geral') return openView('inicio');
      if (page === 'Gestão') return openView('gestao');
      showPending(`${page} será disponibilizado nas próximas etapas.`);
    });
  });

  document.querySelectorAll('[data-open-view]').forEach((button) => {
    button.addEventListener('click', () => openView(button.dataset.openView));
  });

  document.querySelector('#brandHome').addEventListener('click', () => openView('inicio'));
}

/** Configura comportamentos dos módulos ainda fora do escopo atual. */
function setupPendingActions() {
  document.querySelectorAll('[data-pending]').forEach((button) => {
    button.addEventListener('click', () => showPending(`${button.dataset.pending} está em construção.`));
  });

  document.querySelector('#registerLoanButton').addEventListener('click', () => {
    showPending('Empréstimos será disponibilizado nas próximas etapas.');
  });
  document.querySelector('#viewHistoryButton').addEventListener('click', () => {
    showPending('O histórico completo está em construção.');
  });
  document.querySelector('#helpButton').addEventListener('click', () => {
    showPending('A central de ajuda está em construção.');
  });
  document.querySelectorAll('.quick-action').forEach((button) => {
    button.addEventListener('click', () => {
      button.dataset.targetPage === 'Acervo'
        ? openView('cadastro')
        : showPending('Empréstimos está em construção.');
    });
  });
}

/** Valida e encaminha o livro pela API segura exposta em preload.js. */
async function handleBookSubmit(event) {
  event.preventDefault();
  if (!validateBookForm()) {
    showPending('Revise os campos destacados antes de enviar.');
    return;
  }

  const result = await window.bibliotech?.books?.create(getBookPayload());
  showPending(result?.message || 'Abra pelo Electron para enviar o cadastro.');
}

// Selecionamos o formulário pelo ID do html
const form = document.getElementById('bookForm');

// Escuta o evento de submit
form.addEventListener('submit', async (event) => {
  
  //Evita que a página recarregue quando o formulário é enviado
  event.preventDefault();

  //Captura todos os dados do formulário automaticamente usando os "names" do HTML
  const formData = new FormData(form);
  const bookData = {
    title: formData.get('title'),
    author: formData.get('author'),
    genre: formData.get('genre'),
    quantity: Number(formData.get('quantity')),
    notes: formData.get('notes')
  }
  // faz o aviso na tela sem alert
  if (!bookData.title || !bookData.author || !bookData.quantity) {
      const mensagemAlerta = document.getElementById('mensagem-alerta');
      mensagemAlerta.textContent = "Por favor, preencha todos os campos obrigatórios.";
      mensagemAlerta.style.color = "red";
      
      // Apaga o aviso após 4 segundos
      setTimeout(() => {
          mensagemAlerta.textContent = "";
      }, 4000);
      
      return;
    }

  try {
    // Envia os dados para o Electron (via preload.js)
    const resultado = await window.bibliotech.books.create(bookData);

    // Verifica se deu certo
   const mensagemAlerta = document.getElementById('mensagem-alerta');

  // Verifica se deu certo
  if (resultado.ok) {
      mensagemAlerta.textContent = resultado.message;
      mensagemAlerta.style.color = "green"; 
      form.reset(); 
      form.querySelector('[name="title"]').focus(); 
  } else {
      mensagemAlerta.textContent = "Erro ao cadastrar: " + resultado.message;
      mensagemAlerta.style.color = "red"; 
  }

  // Faz a mensagem sumir sozinha após 4 segundos para limpar a tela
  setTimeout(() => {
      mensagemAlerta.textContent = "";
  }, 4000);

  } catch (erro) {
    console.error("Erro na comunicação com o backend:", erro);
    alert("Ocorreu um erro inesperado ao tentar salvar o livro.");
  }
});

/** Inicializa os eventos após o carregamento do HTML. */
function initializeApp() {
  setupNavigation();
  setupPendingActions();
  /** tirei essa parte pq eu criei outra ali em baixo que ta salvando o livro tbm (por isso tava salvando duas) -Arthur
  bookForm.addEventListener('submit', handleBookSubmit);*/
  
}

initializeApp();