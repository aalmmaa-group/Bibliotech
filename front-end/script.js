/**
 * Controlador da interface.
 * Centraliza a navegação entre telas, os avisos de módulos futuros e o
 * formulário de cadastro, sem acessar Node.js ou o banco diretamente.
 */

// --- Referências reutilizadas pela interface. ---
const menuItems = document.querySelectorAll('.menu__item');
const overviewPage = document.querySelector('#overviewPage');
const managementPage = document.querySelector('#managementPage');
const loanPage = document.querySelector('#loanPage');
const registrationPage = document.querySelector('#registrationPage');
const pageTitle = document.querySelector('#pageTitle');
const breadcrumbCurrent = document.querySelector('#breadcrumbCurrent');
const bookForm = document.querySelector('#bookForm');
const loanForm = document.querySelector('#loanForm');
const notificationButton = document.querySelector('#notificationButton');
const notificationPanel = document.querySelector('#notificationPanel');
let pendingMessageTimer;
let formMessageTimer;
let loanMessageTimer;
let collectionSearchTimer;
const sessionCollectionBooks = [];

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
 * @param {'inicio'|'gestao'|'emprestimos'|'cadastro'} view Tela que deve ser exibida.
 */
function openView(view) {
  overviewPage.hidden = view !== 'inicio';
  managementPage.hidden = view !== 'gestao';
  loanPage.hidden = view !== 'emprestimos';
  registrationPage.hidden = view !== 'cadastro';

  const titleByView = {
    inicio: 'Visão geral',
    gestao: 'Gestão',
    emprestimos: 'Empréstimos',
    cadastro: 'Cadastro de livro'
  };
  const title = titleByView[view];

  pageTitle.textContent = title;
  breadcrumbCurrent.textContent = title;
  document.title = `${title} | Bibliotech`;

  // As telas filhas mantêm destacado o ponto de entrada correspondente no menu.
  const activePage = view === 'inicio'
    ? 'Visão geral'
    : view === 'emprestimos'
      ? 'Empréstimos'
      : 'Gestão';
  menuItems.forEach((item) => {
    item.classList.toggle('is-active', item.dataset.page === activePage);
  });

  const pageByView = {
    inicio: overviewPage,
    gestao: managementPage,
    emprestimos: loanPage,
    cadastro: registrationPage
  };
  const visiblePage = pageByView[view];
  replayEntranceAnimation(visiblePage);
}

/**
 * Mostra um aviso temporário sem interferir no painel de notificações.
 * @param {string} message Texto explicativo para o usuário.
 */
function showPending(message) {
  let notice = document.querySelector('#pendingNotice');

  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'pendingNotice';
    notice.className = 'pending-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    document.body.append(notice);
  }

  notice.textContent = message;
  notice.hidden = false;
  replayEntranceAnimation(notice);

  window.clearTimeout(pendingMessageTimer);
  pendingMessageTimer = window.setTimeout(() => {
    notice.hidden = true;
  }, 3500);
}

/** Remove acentos para tornar a busca mais flexível. */
function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

/** Mostra os resultados retornados pela busca sem inserir conteúdo como HTML. */
function renderCollectionResults(resultsElement, books, message = '') {
  resultsElement.replaceChildren();
  resultsElement.hidden = false;

  if (message || books.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'collection-search__empty';
    empty.textContent = message || 'Nenhum livro encontrado.';
    resultsElement.append(empty);
    return;
  }

  books.forEach((book) => {
    const result = document.createElement('article');
    result.className = 'collection-search__result';

    const title = document.createElement('strong');
    title.textContent = book.title;
    const details = document.createElement('small');
    details.textContent = `${book.author} · ${book.genre} · ${book.available}/${book.total} disponível(is)`;

    result.append(title, details);
    resultsElement.append(result);
  });
}

/** Mantém na interface os livros cadastrados durante a sessão atual. */
function addBookToCollectionSearch(book) {
  sessionCollectionBooks.push({
    title: book.title,
    author: book.author,
    genre: book.genre,
    available: book.quantity,
    total: book.quantity
  });
}

/** Configura busca por título, autor ou gênero dos livros cadastrados. */
function setupCollectionSearch() {
  const form = document.querySelector('.collection-search__form');
  const input = document.querySelector('#collectionSearchInput');
  const filterButton = document.querySelector('#collectionSearchFilter');
  const filterMenu = document.querySelector('#collectionSearchFilterMenu');
  const filterOptions = [...filterMenu.querySelectorAll('[data-filter]')];
  const results = document.querySelector('#collectionSearchResults');
  let activeFilter = 'title';
  const placeholderByFilter = {
    title: 'Buscar por título',
    author: 'Buscar por autor',
    genre: 'Buscar por gênero'
  };
  const fieldByFilter = {
    title: 'title',
    author: 'author',
    genre: 'genre'
  };

  const closeResults = () => {
    results.hidden = true;
    results.replaceChildren();
  };

  const setFilterMenuOpen = (isOpen) => {
    filterMenu.hidden = !isOpen;
    filterButton.setAttribute('aria-expanded', String(isOpen));
  };

  const searchBooks = async () => {
    const term = normalizeSearchText(input.value.trim());
    if (!term) {
      closeResults();
      return;
    }

    const field = fieldByFilter[activeFilter];
    const filteredBooks = sessionCollectionBooks.filter((book) => normalizeSearchText(book[field]).includes(term));
    const emptyMessage = sessionCollectionBooks.length === 0
      ? 'Nenhum livro cadastrado nesta sessão.'
      : '';
    renderCollectionResults(results, filteredBooks, emptyMessage);
  };

  form.addEventListener('submit', (event) => event.preventDefault());
  input.addEventListener('input', () => {
    window.clearTimeout(collectionSearchTimer);
    collectionSearchTimer = window.setTimeout(searchBooks, 180);
  });
  filterButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setFilterMenuOpen(filterMenu.hidden);
  });
  filterOptions.forEach((option) => {
    option.addEventListener('click', () => {
      activeFilter = option.dataset.filter;
      filterOptions.forEach((item) => {
        item.setAttribute('aria-checked', String(item === option));
      });
      input.placeholder = placeholderByFilter[activeFilter];
      setFilterMenuOpen(false);
      if (input.value.trim()) searchBooks();
      input.focus();
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setFilterMenuOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.collection-search__controls')) {
      setFilterMenuOpen(false);
      closeResults();
    }
  });
}

/** Abre e fecha exclusivamente o painel acionado pelo botão de notificações. */
function setupNotifications() {
  const setPanelOpen = (isOpen) => {
    notificationPanel.hidden = !isOpen;
    notificationButton.setAttribute('aria-expanded', String(isOpen));

    if (isOpen) replayEntranceAnimation(notificationPanel);
  };

  notificationButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setPanelOpen(notificationPanel.hidden);
  });

  notificationPanel.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', () => setPanelOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || notificationPanel.hidden) return;
    setPanelOpen(false);
    notificationButton.focus();
  });
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

  const field = input.closest('label, .form-field');
  const validationControl = input.name === 'genre'
    ? document.querySelector('#genreSelectButton')
    : input;
  field.classList.toggle('is-invalid', Boolean(errorMessage));
  field.querySelector('small').textContent = errorMessage;
  validationControl.setAttribute('aria-invalid', String(Boolean(errorMessage)));
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
  bookForm.querySelectorAll('label small, .form-field small').forEach((message) => {
    message.textContent = '';
  });
}

/** Revalida um campo destacado assim que o usuário começa a corrigi-lo. */
function setupBookFormValidation() {
  bookForm.querySelectorAll('[required]').forEach((input) => {
    input.addEventListener('blur', () => validateBookField(input));
    input.addEventListener('input', () => {
      if (input.closest('label, .form-field').classList.contains('is-invalid')) validateBookField(input);
    });
  });
}

/** Configura o seletor personalizado e mantém seu valor sincronizado com o formulário. */
function setupGenreSelect() {
  const genreSelect = document.querySelector('#genreSelect');
  const genreInput = document.querySelector('#genreInput');
  const trigger = document.querySelector('#genreSelectButton');
  const triggerText = trigger.querySelector('span');
  const optionsPanel = document.querySelector('#genreOptions');
  const options = [...optionsPanel.querySelectorAll('[role="option"]')];
  const otherField = document.querySelector('#genreOtherField');
  const otherInput = document.querySelector('#genreOtherInput');

  const setOpen = (isOpen) => {
    genreSelect.classList.toggle('is-open', isOpen);
    optionsPanel.hidden = !isOpen;
    trigger.setAttribute('aria-expanded', String(isOpen));
  };

  const selectGenre = (option) => {
    options.forEach((item) => {
      item.setAttribute('aria-selected', String(item === option));
    });
    genreInput.value = option.dataset.value;
    triggerText.textContent = option.textContent;
    genreSelect.classList.add('has-value');
    const isOtherGenre = option.dataset.value === 'Outro';
    otherField.hidden = !isOtherGenre;
    otherInput.required = isOtherGenre;

    if (!isOtherGenre) {
      otherInput.value = '';
      otherInput.closest('label').classList.remove('is-invalid');
      otherInput.closest('label').querySelector('small').textContent = '';
      otherInput.setAttribute('aria-invalid', 'false');
    }

    genreInput.dispatchEvent(new Event('input', { bubbles: true }));
    setOpen(false);
    (isOtherGenre ? otherInput : trigger).focus();
  };

  const resetGenre = () => {
    genreInput.value = '';
    triggerText.textContent = 'Selecione um gênero';
    trigger.setAttribute('aria-invalid', 'false');
    genreSelect.classList.remove('has-value');
    options.forEach((option) => option.setAttribute('aria-selected', 'false'));
    otherField.hidden = true;
    otherInput.required = false;
    otherInput.value = '';
    otherInput.setAttribute('aria-invalid', 'false');
    otherInput.closest('label').classList.remove('is-invalid');
    otherInput.closest('label').querySelector('small').textContent = '';
    setOpen(false);
  };

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(optionsPanel.hidden);
  });

  trigger.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    setOpen(true);
    const selectedOption = options.find((option) => option.getAttribute('aria-selected') === 'true');
    (selectedOption || options[0]).focus();
  });

  options.forEach((option, index) => {
    option.addEventListener('click', () => selectGenre(option));
    option.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.focus();
        return;
      }

      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      options[nextIndex].focus();
    });
  });

  optionsPanel.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', () => setOpen(false));
  otherInput.addEventListener('blur', () => {
    if (otherInput.required) validateBookField(otherInput);
  });
  otherInput.addEventListener('input', () => {
    if (otherInput.closest('label').classList.contains('is-invalid')) validateBookField(otherInput);
  });
  bookForm.addEventListener('reset', resetGenre);
}

/**
 * Converte os valores do formulário no objeto enviado pela ponte Electron.
 * @returns {{title:string, author:string, genre:string, quantity:number, notes:string}}
 */
function getBookPayload() {
  const formData = new FormData(bookForm);
  const genre = formData.get('genre').trim();
  const otherGenre = formData.get('genreOther').trim();
  return {
    title: formData.get('title').trim(),
    author: formData.get('author').trim(),
    genre: genre === 'Outro' ? `Outro: ${otherGenre}` : genre,
    quantity: Number(formData.get('quantity')),
    notes: formData.get('notes').trim()
  };
}

/** Retorna a data local no formato aceito por campos HTML do tipo date. */
function getLocalDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Valida os campos do empréstimo e mantém a indicação de erro acessível. */
function validateLoanField(input) {
  const value = input.value.trim();
  let errorMessage = '';

  if (input.required && !value) {
    errorMessage = 'Este campo é obrigatório.';
  } else if (input.name === 'returnDate' && value < getLocalDateValue()) {
    errorMessage = 'A devolução não pode ser anterior à data de hoje.';
  }

  const field = input.closest('label, .form-field');
  const validationControl = input.name === 'returnDate'
    ? document.querySelector('#returnDateButton')
    : input;
  field.classList.toggle('is-invalid', Boolean(errorMessage));
  field.querySelector('small').textContent = errorMessage;
  validationControl.setAttribute('aria-invalid', String(Boolean(errorMessage)));
  return !errorMessage;
}

/** Valida a estrutura completa exigida para um novo empréstimo. */
function validateLoanForm() {
  return [...loanForm.querySelectorAll('[required]')]
    .map(validateLoanField)
    .every(Boolean);
}

/** Mostra o retorno da validação sem simular uma gravação no banco. */
function setLoanMessage(message, tone = 'error') {
  const messageElement = document.querySelector('#loanFormMessage');
  window.clearTimeout(loanMessageTimer);
  messageElement.textContent = message;
  messageElement.classList.remove('is-error', 'is-success');

  if (!message) return;
  messageElement.classList.add(tone === 'success' ? 'is-success' : 'is-error');
  loanMessageTimer = window.setTimeout(() => {
    messageElement.textContent = '';
    messageElement.classList.remove('is-error', 'is-success');
  }, 6000);
}

/**
 * Converte os dados digitados no contrato esperado pela futura integração.
 * O identificador do livro será preenchido quando a busca do acervo vier do banco.
 * @returns {{bookId:number|null, bookName:string, studentName:string, classroom:string, expectedReturnDate:string}}
 */
function getLoanPayload() {
  const formData = new FormData(loanForm);
  const bookInput = loanForm.querySelector('[name="bookName"]');
  const bookId = Number(bookInput.dataset.bookId);
  return {
    bookId: Number.isInteger(bookId) && bookId > 0 ? bookId : null,
    bookName: formData.get('bookName').trim(),
    studentName: formData.get('studentName').trim(),
    classroom: formData.get('classroom').trim(),
    expectedReturnDate: formData.get('returnDate')
  };
}

/** Configura a seleção manual e os atalhos da data de devolução. */
function setupLoanCalendar() {
  const returnDate = loanForm.querySelector('[name="returnDate"]');
  const datePicker = document.querySelector('.loan-date-picker');
  const dateButton = document.querySelector('#returnDateButton');
  const dateDisplay = document.querySelector('#returnDateDisplay');
  const calendar = document.querySelector('#returnDateCalendar');
  const calendarLabel = document.querySelector('#calendarMonthLabel');
  const calendarDays = document.querySelector('#calendarDays');
  const previousMonthButton = calendar.querySelector('[data-calendar-action="previous"]');
  const dateHelp = document.querySelector('#returnDateHelp');
  const dateShortcutButtons = [...loanForm.querySelectorAll('[data-return-days]')];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);

  const formatLongDate = (date) => new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);

  const setCalendarOpen = (isOpen) => {
    calendar.hidden = !isOpen;
    dateButton.setAttribute('aria-expanded', String(isOpen));
    datePicker.classList.toggle('is-open', isOpen);
    if (isOpen) replayEntranceAnimation(calendar);
  };

  const selectReturnDate = (date) => {
    returnDate.value = getLocalDateValue(date);
    returnDate.dispatchEvent(new Event('change', { bubbles: true }));
    setCalendarOpen(false);
    dateButton.focus();
  };

  const renderCalendar = () => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const numberOfDays = new Date(year, month + 1, 0).getDate();
    const selectedValue = returnDate.value;
    const monthText = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric'
    }).format(calendarCursor);

    calendarLabel.textContent = monthText.charAt(0).toLocaleUpperCase('pt-BR') + monthText.slice(1);
    previousMonthButton.disabled = year === today.getFullYear() && month === today.getMonth();
    calendarDays.replaceChildren();

    for (let blank = 0; blank < firstWeekday; blank += 1) {
      const spacer = document.createElement('span');
      spacer.className = 'loan-calendar__blank';
      spacer.setAttribute('aria-hidden', 'true');
      calendarDays.append(spacer);
    }

    for (let day = 1; day <= numberOfDays; day += 1) {
      const date = new Date(year, month, day);
      const dateValue = getLocalDateValue(date);
      const dayButton = document.createElement('button');
      dayButton.type = 'button';
      dayButton.textContent = String(day);
      dayButton.dataset.date = dateValue;
      dayButton.setAttribute('aria-label', formatLongDate(date));
      dayButton.disabled = date < today;

      if (dateValue === getLocalDateValue(today)) {
        dayButton.classList.add('is-today');
        dayButton.setAttribute('aria-current', 'date');
      }

      if (dateValue === selectedValue) {
        dayButton.classList.add('is-selected');
        dayButton.setAttribute('aria-pressed', 'true');
      }

      dayButton.addEventListener('click', () => selectReturnDate(date));
      calendarDays.append(dayButton);
    }
  };

  const updateDateShortcuts = () => {
    const selectedDate = returnDate.value
      ? new Date(`${returnDate.value}T00:00:00`)
      : null;

    dateShortcutButtons.forEach((button) => {
      const shortcutDate = new Date();
      shortcutDate.setHours(0, 0, 0, 0);
      shortcutDate.setDate(shortcutDate.getDate() + Number(button.dataset.returnDays));
      const isSelected = returnDate.value === getLocalDateValue(shortcutDate);
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });

    dateHelp.textContent = selectedDate
      ? `Devolução escolhida: ${formatLongDate(selectedDate)}.`
      : 'Use um prazo rápido ou escolha uma data no calendário.';
    dateDisplay.textContent = selectedDate
      ? new Intl.DateTimeFormat('pt-BR').format(selectedDate)
      : 'Selecione uma data';
    dateButton.classList.toggle('has-value', Boolean(selectedDate));
    renderCalendar();
  };

  dateButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const selectedDate = returnDate.value
      ? new Date(`${returnDate.value}T00:00:00`)
      : today;
    calendarCursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    renderCalendar();
    setCalendarOpen(calendar.hidden);
  });

  calendar.querySelectorAll('[data-calendar-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.calendarAction;
      if (action === 'previous') {
        calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
        renderCalendar();
      } else if (action === 'next') {
        calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
        renderCalendar();
      } else if (action === 'today') {
        selectReturnDate(today);
      } else {
        setCalendarOpen(false);
        dateButton.focus();
      }
    });
  });

  calendar.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.loan-date-picker')) setCalendarOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || calendar.hidden) return;
    setCalendarOpen(false);
    dateButton.focus();
  });

  dateShortcutButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const shortcutDate = new Date();
      shortcutDate.setHours(0, 0, 0, 0);
      shortcutDate.setDate(shortcutDate.getDate() + Number(button.dataset.returnDays));
      selectReturnDate(shortcutDate);
    });
  });

  returnDate.addEventListener('change', updateDateShortcuts);
}

/** Prepara a validação progressiva e o resumo do novo empréstimo. */
function setupLoanForm() {
  loanForm.querySelectorAll('[required]').forEach((input) => {
    if (input.type !== 'hidden') input.addEventListener('blur', () => validateLoanField(input));
    const validationEvent = input.name === 'returnDate' ? 'change' : 'input';
    input.addEventListener(validationEvent, () => {
      if (input.closest('label, .form-field').classList.contains('is-invalid')) validateLoanField(input);
    });
  });

  loanForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const preview = document.querySelector('#loanPreview');
    preview.hidden = true;

    if (!validateLoanForm()) {
      setLoanMessage('Preencha corretamente os campos obrigatórios destacados em vermelho.');
      loanForm.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const loanData = getLoanPayload();
    const returnDateText = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
      .format(new Date(`${loanData.expectedReturnDate}T00:00:00Z`));
    document.querySelector('#loanPreviewSummary').textContent =
      `${loanData.bookName} para ${loanData.studentName} (${loanData.classroom}), devolução em ${returnDateText}.`;
    preview.hidden = false;
    replayEntranceAnimation(preview);
    setLoanMessage('Dados do empréstimo validados com sucesso.', 'success');
  });
}

/** Alterna entre o cadastro de empréstimo e o acompanhamento de devoluções. */
function setupLoanTabs() {
  const tabs = [...document.querySelectorAll('[data-loan-tab]')];
  const panels = {
    new: document.querySelector('#newLoanPanel'),
    returns: document.querySelector('#returnsPanel')
  };

  const activateTab = (activeTab) => {
    tabs.forEach((tab) => {
      const isActive = tab === activeTab;
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      panels[tab.dataset.loanTab].hidden = !isActive;
    });
    replayEntranceAnimation(panels[activeTab.dataset.loanTab]);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextTab = tabs[(index + direction + tabs.length) % tabs.length];
      activateTab(nextTab);
      nextTab.focus();
    });
  });
}

/** Conecta botões do menu às telas disponíveis ou aos avisos de planejamento. */
function setupNavigation() {
  menuItems.forEach((item) => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page === 'Visão geral') return openView('inicio');
      if (page === 'Gestão') return openView('gestao');
      if (page === 'Empréstimos') return openView('emprestimos');
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

      // O atalho de empréstimos reforça visualmente a mudança de módulo.
      if (targetView === 'emprestimos' && button.classList.contains('loan-launch-button') && !reducedMotion) {
        if (button.dataset.navigating === 'true') return;

        button.dataset.navigating = 'true';
        button.setAttribute('aria-busy', 'true');
        button.classList.remove('is-loan-launch');
        void button.offsetWidth;
        button.classList.add('is-loan-launch');

        window.setTimeout(() => {
          button.classList.remove('is-loan-launch');
          delete button.dataset.navigating;
          button.removeAttribute('aria-busy');
          openView(targetView);
        }, 420);
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
          : openView('emprestimos');
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
      addBookToCollectionSearch(bookData);
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
  setupCollectionSearch();
  setupNotifications();
  setupPendingActions();
  setupGenreSelect();
  setupClickFeedback();
  setupBookFormValidation();
  setupLoanCalendar();
  setupLoanForm();
  setupLoanTabs();
  bookForm.addEventListener('submit', handleBookSubmit);
}

initializeApp();
