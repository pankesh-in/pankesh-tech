(function () {
  'use strict';

  var PAGE_SIZE = 10;
  var FAVORITES_KEY = 'pankesh-tech:favorites:v1';
  var templates = [];
  var favorites = loadFavorites();
  var previewObserver = 'IntersectionObserver' in window ? new IntersectionObserver(loadVisiblePreviews, {
    rootMargin: '240px 0px'
  }) : null;
  var state = {
    view: 'all',
    filterKind: null,
    filterValue: null,
    search: '',
    page: 1
  };

  var grid = document.querySelector('#template-grid');
  var pagination = document.querySelector('#pagination');
  var resultCount = document.querySelector('#result-count');
  var resultsTitle = document.querySelector('#results-title');
  var emptyState = document.querySelector('#empty-state');
  var searchInput = document.querySelector('#template-search');
  var searchForm = document.querySelector('#search-form');
  var clearFiltersButton = document.querySelector('#clear-filters');
  var findTemplateButton = document.querySelector('#find-template');

  var labels = {
    'blank-templates': 'Blank templates',
    'coming-soon': 'Coming soon',
    'landing-page': 'Landing page',
    'popular-templates': 'Popular templates',
    modern: 'Modern',
    simple: 'Simple',
    ecommerce: 'Ecommerce',
    portfolio: 'Portfolio',
    blog: 'Blog',
    'link-in-bio': 'Link in bio',
    creative: 'Creative',
    education: 'Education',
    community: 'Community',
    events: 'Events',
    fashion: 'Fashion',
    photography: 'Photography',
    resume: 'Resume',
    business: 'Business',
    'consulting-coaching': 'Consulting & Coaching',
    law: 'Law',
    financial: 'Financial',
    mortgage: 'Mortgage',
    bank: 'Bank',
    accounting: 'Accounting',
    insurance: 'Insurance',
    'company-agency': 'Company & Agency',
    technology: 'Technology',
    marketing: 'Marketing',
    entertainment: 'Entertainment',
    restaurants: 'Restaurants',
    'food-drinks': 'Food & Drinks',
    catering: 'Catering',
    bakery: 'Bakery',
    'beauty-salon-hair': 'Beauty Salon & Hair',
    'barber-shop': 'Barber Shop',
    'makeup-cosmetics': 'Makeup & Cosmetics',
    travel: 'Travel',
    hotel: 'Hotel',
    services: 'Services',
    'real-estate': 'Real Estate',
    construction: 'Construction',
    industrial: 'Industrial',
    'car-automotive': 'Car & Automotive',
    cleaning: 'Cleaning',
    roofing: 'Roofing',
    plumbing: 'Plumbing',
    handyman: 'Handyman',
    electrician: 'Electrician',
    cargo: 'Cargo',
    florist: 'Florist',
    landscaping: 'Landscaping',
    artist: 'Artist',
    'art-gallery': 'Art Gallery',
    'art-graphic-design': 'Art & Graphic Design',
    music: 'Music',
    dj: 'DJ',
    band: 'Band',
    architecture: 'Architecture',
    'interior-design': 'Interior Design',
    school: 'School',
    college: 'College',
    'non-profit': 'Non-Profit',
    'church-religion': 'Church & Religion',
    wedding: 'Wedding',
    'health-beauty': 'Health & Beauty',
    'medical-health-care': 'Medical & Health Care',
    chiropractor: 'Chiropractor',
    dental: 'Dental',
    doctor: 'Doctor',
    hospital: 'Hospital',
    therapy: 'Therapy'
  };

  bindStaticEvents();
  bindMenus();
  loadTemplates();

  function loadFavorites() {
    try {
      var stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]');
      return new Set(Array.isArray(stored) ? stored : []);
    } catch (error) {
      return new Set();
    }
  }

  function saveFavorites() {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
    } catch (error) {
      // Favorites still work for the current page when storage is unavailable.
    }
  }

  async function loadTemplates() {
    try {
      var response = await fetch('./templates.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Template catalog could not be loaded.');
      }

      var data = await response.json();
      templates = data.map(normalizeTemplate);
      grid.setAttribute('aria-busy', 'false');
      render();
    } catch (error) {
      grid.setAttribute('aria-busy', 'false');
      grid.replaceChildren();
      emptyState.hidden = false;
      emptyState.querySelector('h3').textContent = 'Catalog unavailable';
      emptyState.querySelector('p').textContent = 'Please refresh the page to try again.';
      clearFiltersButton.hidden = true;
      resultCount.textContent = 'Unable to load templates';
    }
  }

  function normalizeTemplate(item) {
    return {
      id: String(item.id || ''),
      displayTitle: String(item.displayTitle || item.title || item.id || 'Template'),
      category: String(item.category || ''),
      subcategory: String(item.subcategory || ''),
      collections: Array.isArray(item.collections) ? item.collections : [],
      keywords: Array.isArray(item.keywords) ? item.keywords : [],
      url: String(item.url || './' + item.id + '/')
    };
  }

  function bindStaticEvents() {
    searchForm.addEventListener('submit', function (event) {
      event.preventDefault();
      applySearch();
    });

    searchInput.addEventListener('input', applySearch);

    document.querySelectorAll('[data-view]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.view = button.dataset.view;
        state.filterKind = null;
        state.filterValue = null;
        state.page = 1;
        closeMenus();
        render();
      });
    });

    document.querySelectorAll('[data-filter-kind]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.view = 'all';
        state.filterKind = button.dataset.filterKind;
        state.filterValue = button.dataset.filterValue;
        state.page = 1;
        closeMenus();
        render();
      });
    });

    clearFiltersButton.addEventListener('click', resetFilters);

    findTemplateButton.addEventListener('click', function () {
      searchInput.focus();
      searchInput.select();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    document.addEventListener('pointerdown', function (event) {
      if (!event.target.closest('[data-menu]')) {
        closeMenus();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        var openMenu = document.querySelector('[data-menu].is-open');
        if (openMenu) {
          var trigger = openMenu.querySelector('.menu-trigger');
          closeMenus();
          trigger.focus();
        }
      }
    });

    window.addEventListener('resize', closeMenus);
    window.addEventListener('scroll', function () {
      if (window.innerWidth <= 720) {
        closeMenus();
      }
    }, { passive: true });
  }

  function applySearch() {
    state.search = searchInput.value.trim().toLowerCase();
    state.page = 1;
    render();
  }

  function resetFilters() {
    state.view = 'all';
    state.filterKind = null;
    state.filterValue = null;
    state.search = '';
    state.page = 1;
    searchInput.value = '';
    render();
  }

  function bindMenus() {
    var supportsHover = window.matchMedia('(hover: hover)').matches;

    document.querySelectorAll('[data-menu]').forEach(function (menu) {
      var trigger = menu.querySelector('.menu-trigger');
      var panel = menu.querySelector('.menu-panel');
      var hoverTimer;

      trigger.addEventListener('click', function () {
        if (menu.classList.contains('is-open')) {
          closeMenus();
        } else {
          openMenu(menu, false);
        }
      });

      trigger.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          openMenu(menu, true);
        }
      });

      panel.addEventListener('keydown', function (event) {
        handleMenuKeyboard(event, menu);
      });

      if (supportsHover) {
        menu.addEventListener('mouseenter', function () {
          window.clearTimeout(hoverTimer);
          openMenu(menu, false);
        });

        menu.addEventListener('mouseleave', function () {
          hoverTimer = window.setTimeout(closeMenus, 130);
        });
      }
    });
  }

  function openMenu(menu, focusFirst) {
    closeMenus(menu);
    menu.classList.add('is-open');
    var trigger = menu.querySelector('.menu-trigger');
    trigger.setAttribute('aria-expanded', 'true');

    if (window.innerWidth <= 720) {
      var panel = menu.querySelector('.menu-panel');
      var top = Math.min(trigger.getBoundingClientRect().bottom + 8, window.innerHeight - 120);
      panel.style.setProperty('--mobile-menu-top', Math.max(12, top) + 'px');
    }

    if (focusFirst) {
      var firstItem = menu.querySelector('[role="menuitem"]');
      if (firstItem) {
        firstItem.focus();
      }
    }
  }

  function closeMenus(exceptMenu) {
    document.querySelectorAll('[data-menu].is-open').forEach(function (menu) {
      if (menu === exceptMenu) {
        return;
      }
      menu.classList.remove('is-open');
      menu.querySelector('.menu-trigger').setAttribute('aria-expanded', 'false');
    });
  }

  function handleMenuKeyboard(event, menu) {
    var items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
    var currentIndex = items.indexOf(document.activeElement);
    var targetIndex = currentIndex;

    if (event.key === 'ArrowDown') {
      targetIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    } else if (event.key === 'ArrowUp') {
      targetIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    } else if (event.key === 'Home') {
      targetIndex = 0;
    } else if (event.key === 'End') {
      targetIndex = items.length - 1;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      var trigger = menu.querySelector('.menu-trigger');
      closeMenus();
      trigger.focus();
      return;
    } else {
      return;
    }

    event.preventDefault();
    if (items[targetIndex]) {
      items[targetIndex].focus();
    }
  }

  function getFilteredTemplates() {
    return templates.filter(function (template) {
      if (state.view === 'favorites' && !favorites.has(template.id)) {
        return false;
      }

      if (state.filterKind === 'category' && template.category !== state.filterValue) {
        return false;
      }

      if (state.filterKind === 'subcategory' && template.subcategory !== state.filterValue) {
        return false;
      }

      if (state.filterKind === 'collection' && !template.collections.includes(state.filterValue)) {
        return false;
      }

      if (state.search) {
        var searchable = [
          template.id,
          template.displayTitle,
          template.category,
          template.subcategory
        ].concat(template.collections, template.keywords).join(' ').toLowerCase();

        if (!searchable.includes(state.search)) {
          return false;
        }
      }

      return true;
    });
  }

  function render() {
    if (!templates.length) {
      return;
    }

    var filtered = getFilteredTemplates();
    var pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.page = Math.min(state.page, pageCount);
    var start = (state.page - 1) * PAGE_SIZE;
    var pageItems = filtered.slice(start, start + PAGE_SIZE);

    if (previewObserver) {
      previewObserver.disconnect();
    }
    grid.replaceChildren();
    pageItems.forEach(function (template) {
      grid.appendChild(createTemplateCard(template));
    });

    emptyState.hidden = filtered.length > 0;
    clearFiltersButton.hidden = false;
    grid.hidden = filtered.length === 0;
    resultCount.textContent = filtered.length + (filtered.length === 1 ? ' template' : ' templates');
    resultsTitle.textContent = getResultsTitle();
    renderPagination(pageCount, filtered.length);
    updateActiveControls();
  }

  function getResultsTitle() {
    if (state.view === 'favorites') {
      return 'Favorite templates';
    }
    if (state.filterValue) {
      return labels[state.filterValue] || 'Filtered templates';
    }
    if (state.search) {
      return 'Search results';
    }
    return 'All templates';
  }

  function updateActiveControls() {
    document.querySelectorAll('[data-view]').forEach(function (button) {
      var isActive = state.view === button.dataset.view && !state.filterValue;
      button.classList.toggle('is-active', isActive);
    });

    document.querySelectorAll('[data-filter-kind]').forEach(function (button) {
      var isActive = state.filterKind === button.dataset.filterKind && state.filterValue === button.dataset.filterValue;
      button.classList.toggle('is-active', isActive);
    });

    document.querySelectorAll('[data-menu]').forEach(function (menu) {
      var hasActiveItem = Boolean(menu.querySelector('[data-filter-value].is-active'));
      menu.querySelector('.menu-trigger').classList.toggle('is-active', hasActiveItem);
    });
  }

  function createTemplateCard(template) {
    var article = document.createElement('article');
    article.className = 'template-card';
    article.dataset.templateId = template.id;

    var previewShell = document.createElement('div');
    previewShell.className = 'preview-shell';

    var browserBar = document.createElement('div');
    browserBar.className = 'browser-bar';
    browserBar.setAttribute('aria-hidden', 'true');
    browserBar.append(document.createElement('span'), document.createElement('span'), document.createElement('span'));

    var previewStage = document.createElement('div');
    previewStage.className = 'preview-stage';

    var iframe = document.createElement('iframe');
    iframe.dataset.src = './' + template.id + '/';
    iframe.title = template.displayTitle + ' live preview';
    iframe.loading = 'lazy';
    iframe.tabIndex = -1;
    previewStage.appendChild(iframe);
    queuePreview(iframe);

    var overlay = document.createElement('div');
    overlay.className = 'card-overlay';
    overlay.appendChild(createPreviewLink(template, 'Select template'));
    overlay.appendChild(createPreviewLink(template, 'Preview'));

    previewShell.append(browserBar, previewStage, overlay);

    var meta = document.createElement('div');
    meta.className = 'card-meta';

    var titleGroup = document.createElement('div');
    titleGroup.className = 'card-title';
    var title = document.createElement('h3');
    title.textContent = template.displayTitle;
    title.title = template.displayTitle;
    var id = document.createElement('p');
    id.textContent = template.id;
    titleGroup.append(title, id);

    var favoriteButton = document.createElement('button');
    favoriteButton.type = 'button';
    favoriteButton.className = 'favorite-button';
    favoriteButton.dataset.favoriteId = template.id;
    updateFavoriteButton(favoriteButton, template);
    favoriteButton.addEventListener('click', function () {
      toggleFavorite(template.id);
    });

    meta.append(titleGroup, favoriteButton);
    article.append(previewShell, meta);
    return article;
  }

  function createPreviewLink(template, label) {
    var link = document.createElement('a');
    link.href = './' + template.id + '/';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = label;
    link.setAttribute('aria-label', label + ': ' + template.displayTitle);
    return link;
  }

  function queuePreview(iframe) {
    if (previewObserver) {
      previewObserver.observe(iframe);
    } else {
      iframe.src = iframe.dataset.src;
    }
  }

  function loadVisiblePreviews(entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) {
        return;
      }
      var iframe = entry.target;
      if (!iframe.src) {
        iframe.src = iframe.dataset.src;
      }
      previewObserver.unobserve(iframe);
    });
  }

  function updateFavoriteButton(button, template) {
    var isFavorite = favorites.has(template.id);
    button.classList.toggle('is-favorite', isFavorite);
    button.textContent = isFavorite ? '\u2665' : '\u2661';
    button.setAttribute('aria-pressed', String(isFavorite));
    button.setAttribute('aria-label', (isFavorite ? 'Remove ' : 'Add ') + template.displayTitle + (isFavorite ? ' from favorites' : ' to favorites'));
    button.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
  }

  function toggleFavorite(id) {
    if (favorites.has(id)) {
      favorites.delete(id);
    } else {
      favorites.add(id);
    }
    saveFavorites();
    render();
  }

  function renderPagination(pageCount, resultTotal) {
    pagination.replaceChildren();
    pagination.hidden = resultTotal === 0 || pageCount <= 1;
    if (pagination.hidden) {
      return;
    }

    pagination.appendChild(createPageButton('\u2039', state.page - 1, 'Previous page', state.page === 1, true));
    getPageItems(pageCount, state.page).forEach(function (item) {
      if (item === 'ellipsis') {
        var ellipsis = document.createElement('span');
        ellipsis.textContent = '\u2026';
        ellipsis.setAttribute('aria-hidden', 'true');
        pagination.appendChild(ellipsis);
      } else {
        pagination.appendChild(createPageButton(String(item), item, 'Page ' + item, false, false, item === state.page));
      }
    });
    pagination.appendChild(createPageButton('\u203a', state.page + 1, 'Next page', state.page === pageCount, true));
  }

  function createPageButton(text, page, label, disabled, isArrow, isCurrent) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.disabled = disabled;
    button.setAttribute('aria-label', label);
    if (isArrow) {
      button.classList.add('page-arrow');
    }
    if (isCurrent) {
      button.classList.add('is-current');
      button.setAttribute('aria-current', 'page');
    }
    button.addEventListener('click', function () {
      state.page = page;
      render();
      document.querySelector('#templates').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return button;
  }

  function getPageItems(pageCount, currentPage) {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, function (_, index) {
        return index + 1;
      });
    }

    var pages = new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1]);
    var sorted = Array.from(pages).filter(function (page) {
      return page >= 1 && page <= pageCount;
    }).sort(function (a, b) {
      return a - b;
    });
    var output = [];

    sorted.forEach(function (page, index) {
      if (index > 0 && page - sorted[index - 1] > 1) {
        output.push('ellipsis');
      }
      output.push(page);
    });
    return output;
  }
})();
