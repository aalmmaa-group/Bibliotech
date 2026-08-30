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
let pendingMessageTimer;
let formMessageTimer;

/**
 * Reinicia uma animação CSS aplicada por classe sem alterar o conteúdo da tela.
 * @param {HTMLElement} element Elemento que deve receber a animação.
 */
function replayEntranceAnimation(element) {
  element.classList.remove('is-entering');
  void element.offsetWidth;
  element.classList.add('is-entering');
}

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

  const visiblePage = document.querySelector(view === 'inicio'
    ? '#overviewPage'
    : view === 'gestao'
      ? '#managementPage'
      : '#registrationPage');
  replayEntranceAnimation(visiblePage);
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
  replayEntranceAnimation(panel);

  window.clearTimeout(pendingMessageTimer);
  pendingMessageTimer = window.setTimeout(() => {
    panel.hidden = true;
  }, 3500);
}

/**
 * Adiciona uma resposta breve de clique aos botões da interface.
 * A classe é removida automaticamente para não interferir no hover.
 */
function setupClickFeedback() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  document.querySelectorAll('button').forEach((button) => {
    button.addEventListener('pointerdown', () => {
      button.classList.remove('is-pressed');
      void button.offsetWidth;
      button.classList.add('is-pressed');
      window.setTimeout(() => button.classList.remove('is-pressed'), 160);
    });
  });
}

/**
 * Valida um campo do formulário e atualiza sua mensagem de erro.
 * @param {HTMLInputElement|HTMLTextAreaElement} input Campo que será validado.
 * @returns {boolean} true quando o campo está correto.
 */
function validateBookField(input) {
  const value = input.value.trim();
  const quantity = Number(value);
  let errorMessage = '';

  if (input.required && !value) {
    errorMessage = 'Este campo é obrigatório.';
  } else if (input.name === 'quantity' && (!Number.isInteger(quantity) || quantity < 1)) {
    errorMessage = 'Informe uma quantidade inteira igual ou maior que 1.';
  }

  const field = input.closest('label');
  field.classList.toggle('is-invalid', Boolean(errorMessage));
  field.querySelector('small').textContent = errorMessage;
  input.setAttribute('aria-invalid', String(Boolean(errorMessage)));
  return !errorMessage;
}

/**
 * Valida todos os campos obrigatórios antes do envio.
 * @returns {boolean} true quando o formulário pode ser encaminhado.
 */
function validateBookForm() {
  return [...bookForm.querySelectorAll('[required]')]
    .map(validateBookField)
    .every(Boolean);
}

/**
 * Mostra uma mensagem temporária de sucesso ou erro no formulário.
 * @param {string} message Texto exibido ao usuário.
 * @param {'error'|'success'} tone Tipo visual da mensagem.
 */
function setFormMessage(message, tone = 'error') {
  const messageElement = document.querySelector('#mensagem-alerta');
  window.clearTimeout(formMessageTimer);
  messageElement.textContent = message;
  messageElement.classList.remove('is-error', 'is-success');

  if (!message) return;
  messageElement.classList.add(tone === 'success' ? 'is-success' : 'is-error');
  formMessageTimer = window.setTimeout(() => {
    messageElement.textContent = '';
    messageElement.classList.remove('is-error', 'is-success');
  }, 5000);
}

/** Remove os avisos de validação após um cadastro concluído. */
function clearBookFormErrors() {
  bookForm.querySelectorAll('.is-invalid').forEach((field) => {
    field.classList.remove('is-invalid');
  });
  bookForm.querySelectorAll('[aria-invalid]').forEach((input) => {
    input.setAttribute('aria-invalid', 'false');
  });
  bookForm.querySelectorAll('label small').forEach((message) => {
    message.textContent = '';
  });
}

/** Revalida um campo destacado assim que o usuário começa a corrigi-lo. */
function setupBookFormValidation() {
  bookForm.querySelectorAll('[required]').forEach((input) => {
    input.addEventListener('blur', () => validateBookField(input));
    input.addEventListener('input', () => {
      if (input.closest('label').classList.contains('is-invalid')) validateBookField(input);
    });
  });
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
    button.addEventListener('click', () => {
      const targetView = button.dataset.openView;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // O atalho de cadastro exibe o livro por um instante antes da navegação.
      if (targetView === 'cadastro' && !reducedMotion) {
        if (button.dataset.navigating === 'true') return;

        button.dataset.navigating = 'true';
        button.setAttribute('aria-busy', 'true');
        button.classList.remove('is-book-launch');
        void button.offsetWidth;
        button.classList.add('is-book-launch');

        window.setTimeout(() => {
          button.classList.remove('is-book-launch');
          delete button.dataset.navigating;
          button.removeAttribute('aria-busy');
          openView(targetView);
        }, 520);
        return;
      }

      openView(targetView);
    });
  });

  document.querySelector('#brandHome').addEventListener('click', () => openView('inicio'));
}

/** Configura comportamentos dos módulos ainda fora do escopo atual. */
function setupPendingActions() {
  document.querySelectorAll('[data-pending]').forEach((button) => {
    button.addEventListener('click', () => showPending(`${button.dataset.pending} está em construção.`));
  });

  document.querySelector('#viewHistoryButton').addEventListener('click', () => {
    showPending('O histórico completo está em construção.');
  });
  document.querySelector('#helpButton').addEventListener('click', () => {
    showPending('A central de ajuda está em construção.');
  });
  document.querySelectorAll('.quick-action').forEach((button) => {
    button.addEventListener('click', () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Finaliza o efeito visual antes de abrir a tela ou mostrar o aviso.
      const openTarget = () => {
        delete button.dataset.navigating;
        button.removeAttribute('aria-busy');
        button.classList.remove('is-quick-launch');

        button.dataset.targetPage === 'Acervo'
          ? openView('cadastro')
          : showPending('Empréstimos está em construção.');
      };

      if (reducedMotion) {
        openTarget();
        return;
      }

      if (button.dataset.navigating === 'true') return;
      button.dataset.navigating = 'true';
      button.setAttribute('aria-busy', 'true');
      button.classList.remove('is-quick-launch');
      void button.offsetWidth;
      button.classList.add('is-quick-launch');
      window.setTimeout(openTarget, 440);
    });
  });
}

/** Valida e encaminha o livro pela API segura exposta em preload.js. */
async function handleBookSubmit(event) {
  event.preventDefault();

  if (!validateBookForm()) {
    setFormMessage('Preencha corretamente os campos obrigatórios destacados em vermelho.');
    bookForm.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  const bookData = getBookPayload();

  try {
    // A interface usa somente a API segura disponibilizada pelo preload.
    const resultado = await window.bibliotech?.books?.create(bookData);

    if (!resultado) {
      setFormMessage('Abra o projeto pelo Electron para concluir o cadastro.');
      return;
    }

    if (resultado.ok) {
      setFormMessage(resultado.message, 'success');
      bookForm.reset();
      clearBookFormErrors();
      bookForm.querySelector('[name="title"]').focus();
    } else {
      setFormMessage(`Erro ao cadastrar: ${resultado.message}`);
    }
  } catch (erro) {
    console.error('Erro na comunicação com o backend:', erro);
    setFormMessage('Ocorreu um erro inesperado ao tentar salvar o livro.');
  }
}

/** Inicializa os eventos após o carregamento do HTML. */
function initializeApp() {
  setupNavigation();
  setupPendingActions();
  setupClickFeedback();
  setupBookFormValidation();
  bookForm.addEventListener('submit', handleBookSubmit);
}

initializeApp();
