const menuItems = document.querySelectorAll(".menu__item");
const pageTitle = document.querySelector("#pageTitle");
const pageEyebrow = document.querySelector("#pageEyebrow");
const pageDescription = document.querySelector("#pageDescription");
const breadcrumbCurrent = document.querySelector("#breadcrumbCurrent");
const pageContent = document.querySelector("#pageContent");
const sidebar = document.querySelector("#sidebar");
const mobileMenu = document.querySelector("#mobileMenu");
const sidebarOverlay = document.querySelector("#sidebarOverlay");
const notificationButton = document.querySelector("#notificationButton");
const notificationPanel = document.querySelector("#notificationPanel");
const registerLoanButton = document.querySelector("#registerLoanButton");
const statsGrid = document.querySelector(".stats-grid");
const collectionSearch = document.querySelector(".collection-search");
const collectionSearchForm = document.querySelector(".collection-search__form");
const overviewLower = document.querySelector(".overview-lower");
const quickActions = document.querySelectorAll(".quick-action");
const viewHistoryButton = document.querySelector("#viewHistoryButton");
const profileMenuButton = document.querySelector("#profileMenuButton");
const profileMenu = document.querySelector("#profileMenu");
const logoutButton = document.querySelector("#logoutButton");

const pageInformation = {
    "Visão geral": {
        eyebrow: "Painel da sala de leitura",
        description: "Acompanhe o que acontece no acervo hoje."
    },
    "Empréstimos": {
        eyebrow: "Gestão de empréstimos",
        description: "Registre e acompanhe os empréstimos, devoluções e prazos."
    },
    "Acervo": {
        eyebrow: "Gestão do acervo",
        description: "Cadastre livros e consulte a disponibilidade dos exemplares."
    },
    "Relatórios": {
        eyebrow: "Indicadores da biblioteca",
        description: "Acompanhe os livros mais lidos e a movimentação da sala."
    }
};

function setActivePage(selectedItem) {
    menuItems.forEach((item) => {
        const isSelected = item === selectedItem;
        item.classList.toggle("is-active", isSelected);

        if (isSelected) {
            item.setAttribute("aria-current", "page");
        } else {
            item.removeAttribute("aria-current");
        }
    });

    const selectedPage = selectedItem.dataset.page;
    const selectedInformation = pageInformation[selectedPage];

    pageTitle.textContent = selectedPage;
    breadcrumbCurrent.textContent = selectedPage;
    pageEyebrow.textContent = selectedInformation.eyebrow;
    pageDescription.textContent = selectedInformation.description;
    const isOverview = selectedPage === "Visão geral";
    statsGrid.hidden = !isOverview;
    collectionSearch.hidden = !isOverview;
    overviewLower.hidden = !isOverview;
    registerLoanButton.hidden = !isOverview;
    document.title = `${selectedPage} | Bibliotech`;
    pageContent.focus({ preventScroll: true });
    closeSidebar();
}

function openSidebar() {
    sidebar.classList.add("is-open");
    sidebarOverlay.classList.add("is-visible");
    sidebarOverlay.setAttribute("aria-hidden", "false");
    mobileMenu.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
    sidebar.classList.remove("is-open");
    sidebarOverlay.classList.remove("is-visible");
    sidebarOverlay.setAttribute("aria-hidden", "true");
    mobileMenu.setAttribute("aria-expanded", "false");
}

menuItems.forEach((item) => {
    item.addEventListener("click", () => setActivePage(item));
});

mobileMenu.addEventListener("click", () => {
    const isOpen = sidebar.classList.contains("is-open");
    isOpen ? closeSidebar() : openSidebar();
});

sidebarOverlay.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeSidebar();
        closeNotificationPanel();
        closeProfileMenu();
    }
});

function closeNotificationPanel() {
    notificationPanel.hidden = true;
    notificationButton.setAttribute("aria-expanded", "false");
    notificationButton.setAttribute("aria-label", "Abrir notificações");
}

notificationButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = notificationPanel.hidden;

    notificationButton.querySelector(".notification__dot")?.remove();
    notificationPanel.hidden = !willOpen;
    notificationButton.setAttribute("aria-expanded", String(willOpen));
    notificationButton.setAttribute("aria-label", willOpen ? "Fechar notificações" : "Abrir notificações");
});

notificationPanel.addEventListener("click", (event) => {
    event.stopPropagation();
});

document.addEventListener("click", closeNotificationPanel);

function closeProfileMenu() {
    profileMenu.hidden = true;
    profileMenuButton.setAttribute("aria-expanded", "false");
    profileMenuButton.setAttribute("aria-label", "Abrir opções do usuário");
}

profileMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = profileMenu.hidden;

    profileMenu.hidden = !willOpen;
    profileMenuButton.setAttribute("aria-expanded", String(willOpen));
    profileMenuButton.setAttribute("aria-label", willOpen ? "Fechar opções do usuário" : "Abrir opções do usuário");
});

profileMenu.addEventListener("click", (event) => {
    event.stopPropagation();
});

logoutButton.addEventListener("click", closeProfileMenu);
document.addEventListener("click", closeProfileMenu);

registerLoanButton.addEventListener("click", () => {
    const loansMenuItem = [...menuItems].find((item) => item.dataset.page === "Empréstimos");

    if (loansMenuItem) {
        setActivePage(loansMenuItem);
    }
});

collectionSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
});

quickActions.forEach((action) => {
    action.addEventListener("click", () => {
        const targetMenuItem = [...menuItems].find((item) => item.dataset.page === action.dataset.targetPage);

        if (targetMenuItem) {
            setActivePage(targetMenuItem);
        }
    });
});

viewHistoryButton.addEventListener("click", () => {
    const loansMenuItem = [...menuItems].find((item) => item.dataset.page === "Empréstimos");

    if (loansMenuItem) {
        setActivePage(loansMenuItem);
    }
});
