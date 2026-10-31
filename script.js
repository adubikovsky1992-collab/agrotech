/* ============================================================
   АгроТех — інтерактив сайту
   Спершу завантажуємо контент із content.json (якщо він є),
   потім ініціалізуємо всю логіку.
   ============================================================ */

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el && value != null) el.textContent = value;
};

// Екранування для HTML (тексти й адреси фото вставляємо через innerHTML)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Блок із фотографією (порожній шлях — блок не показуємо)
const photoBox = (url, title, cls) => {
  if (!url) return '';
  return `<div class="${cls}"><img src="${esc(url)}" alt="${esc(title || '')}"></div>`;
};

/* --- Лічильники в hero: стійкі до перемальовування контенту --- */
let COUNTERS_DONE = false;       // анімація вже відбулась
let COUNTERS_OBSERVED = false;   // observer уже підключено

const counterFinalText = (el) => {
  const t = parseInt(el.dataset.count, 10) || 0;
  return t.toLocaleString('uk-UA') + (t >= 90 ? '+' : '');
};

function animateCounters() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const duration = 1200;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = value.toLocaleString('uk-UA') + (target >= 90 && progress === 1 ? '+' : '');
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
  COUNTERS_DONE = true;
}

function syncCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  // Після перемальовування сторінки — одразу показуємо фінальні числа,
  // щоб не було «0 років на ринку»
  if (COUNTERS_DONE) {
    counters.forEach((el) => { el.textContent = counterFinalText(el); });
    return;
  }

  if (COUNTERS_OBSERVED) return;      // уже чекаємо, коли блок з'явиться в екрані
  COUNTERS_OBSERVED = true;

  const box = counters[0].closest('.hero-stats') || counters[0];

  if (!('IntersectionObserver' in window)) {
    counters.forEach((el) => { el.textContent = counterFinalText(el); });
    COUNTERS_DONE = true;
    return;
  }

  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting) && !COUNTERS_DONE) {
      animateCounters();
      io.disconnect();
    }
  }, { threshold: 0.25 });

  io.observe(box);
}

/* ============ 1. Завантаження та рендер контенту ============ */

// Секцію без вмісту ховаємо — щоб на сайті не було пустих блоків.
// Заодно ховаємо посилання в меню/футері/хіро, що ведуть у цю порожню секцію,
// інакше клік по «Послуги»/«Запчастини» нікуди не прокручує.
function toggleSection(id, hasContent) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('is-empty', !hasContent);

  document.querySelectorAll('a[href="#' + id + '"]').forEach(function (link) {
    if (link.closest('header, footer, .hero')) link.hidden = !hasContent;
  });
}

function renderContent(c) {
  if (!c) return;

  // --- Шапка / SEO ---
  if (c.site) {
    if (c.site.title) document.title = c.site.title;
    setText('siteTitle', c.site.title);
    const desc = document.getElementById('siteDesc');
    if (desc && c.site.description) desc.setAttribute('content', c.site.description);

    setText('headerPhoneText', c.site.phone);
    const phoneLink = document.getElementById('headerPhoneLink');
    if (phoneLink && c.site.phoneHref) phoneLink.setAttribute('href', 'tel:' + c.site.phoneHref);

    document.querySelectorAll('.logo-text').forEach((el) => { el.textContent = c.site.name; });

    // Контакти
    setText('cPhone', c.site.phone);
    setText('cHours', c.site.hours);
    setText('cEmail', c.site.email);
    setText('cEmailNote', c.site.emailNote);
    setText('cAddress', c.site.address);
    setText('cAddressNote', c.site.addressNote);
    setText('footerCopy', c.site.copyright);

    // Порожні контакти не показуємо — щоб не було пустих рядків з іконками
    const contactList = document.querySelector('.contact-list');
    if (contactList) {
      contactList.querySelectorAll('li').forEach((li) => {
        const main = li.querySelector('strong');
        li.hidden = !main || !main.textContent.trim();
      });
    }
    const headerPhone = document.querySelector('.header-phone');
    if (headerPhone) headerPhone.hidden = !String(c.site.phone || '').trim();
  }

  // --- Меню ---
  if (Array.isArray(c.nav) && c.nav.length) {
    const nav = document.getElementById('nav');
    if (nav) {
      nav.innerHTML = c.nav
        .map((n) => `<a href="${n.href}" class="nav-link">${n.label}</a>`)
        .join('');
    }
  }
  setText('headerCta', c.headerCta);

  // --- Hero ---
  if (c.hero) {
    setText('heroBadge', c.hero.badge);
    setText('heroTitleBefore', c.hero.titleBefore);
    setText('heroTitleAccent', c.hero.titleAccent);
    setText('heroTitleAfter', c.hero.titleAfter);
    setText('heroSub', c.hero.subtitle);
    setText('heroCta1', c.hero.ctaPrimary);
    setText('heroCta2', c.hero.ctaSecondary);

    if (Array.isArray(c.hero.stats) && c.hero.stats.length) {
      const box = document.getElementById('heroStats');
      if (box) {
        box.innerHTML = c.hero.stats
          .map((s) => {
            const n = Number(s.num) || 0;
            // одразу показуємо реальне число, а не 0 —
            // навіть якщо анімація не запуститься
            const shown = n.toLocaleString('uk-UA') + (n >= 90 ? '+' : '');
            return `<div class="stat"><span class="stat-num" data-count="${n}">${shown}</span><span class="stat-label">${s.label}</span></div>`;
          })
          .join('');
        syncCounters();
      }
    }

    if (Array.isArray(c.hero.cards) && c.hero.cards.length) {
      c.hero.cards.slice(0, 2).forEach((card, i) => {
        const n = i + 1;
        setText(`heroCard${n}Icon`, card.icon);
        setText(`heroCard${n}Title`, card.title);
        setText(`heroCard${n}Text`, card.text);
      });
    }
  }

  // --- Послуги ---
  if (c.services) {
    setText('servicesTag', c.services.tag);
    setText('servicesTitle', c.services.title);
    setText('servicesSub', c.services.subtitle);

    if (Array.isArray(c.services.items) && c.services.items.length) {
      const grid = document.getElementById('servicesGrid');
      if (grid) {
        grid.innerHTML = c.services.items
          .map((s) => `
          <article class="card" data-reveal>
            ${photoBox(s.photo, s.title, 'card-photo')}
            <div class="card-icon">${s.icon || '🔧'}</div>
            <h3 class="card-title">${s.title || ''}</h3>
            <p class="card-text">${s.text || ''}</p>
            ${s.price ? `<div class="card-price">${s.price}</div>` : ''}
          </article>`)
          .join('');
      }
    }
  }

  // --- Запчастини ---
  if (c.parts) {
    setText('partsTag', c.parts.tag);
    setText('partsTitle', c.parts.title);
    setText('partsSub', c.parts.subtitle);

    if (Array.isArray(c.parts.categories) && c.parts.categories.length) {
      const filter = document.getElementById('partsFilter');
      if (filter) {
        filter.innerHTML = c.parts.categories
          .map((cat, i) => `<button class="filter-btn${i === 0 ? ' active' : ''}" data-filter="${cat.id}">${cat.label}</button>`)
          .join('');
      }
    }

    if (Array.isArray(c.parts.items) && c.parts.items.length) {
      const grid = document.getElementById('partsGrid');
      if (grid) {
        grid.innerHTML = c.parts.items
          .map((p) => `
          <article class="part" data-cat="${p.cat || 'all'}" data-reveal>
            ${photoBox(p.photo, p.title, 'part-photo')}
            <div class="part-top"><span class="part-tag">${p.tag || ''}</span><span class="stock ${p.stock === 'order' ? 'order' : 'in'}">${p.stockText || ''}</span></div>
            <h3 class="part-title">${p.title || ''}</h3>
            <p class="part-text">${p.text || ''}</p>
            <div class="part-bottom"><span class="part-price">${p.price || ''}</span><a href="#contacts" class="btn btn-sm">${p.order || 'Замовити'}</a></div>
          </article>`)
          .join('');
      }
    }
  }

  // --- Про нас ---
  if (c.about) {
    setText('aboutTag', c.about.tag);
    setText('aboutTitle', c.about.title);
    setText('aboutSub', c.about.subtitle);
    setText('promoTitle', c.about.promoTitle);
    setText('promoText', c.about.promoText);
    setText('promoBtn', c.about.promoBtn);
    setText('noteTitle', c.about.noteTitle);
    setText('noteText', c.about.noteText);

    if (Array.isArray(c.about.features) && c.about.features.length) {
      const list = document.getElementById('aboutFeatures');
      if (list) {
        list.innerHTML = c.about.features
          .map((f) => `<li class="feature"><span class="feature-ico">${f.icon || '✅'}</span><div><strong>${f.title || ''}</strong><p>${f.text || ''}</p></div></li>`)
          .join('');
      }
    }
  }

  // --- Відгуки ---
  if (c.reviews) {
    setText('reviewsTag', c.reviews.tag);
    setText('reviewsTitle', c.reviews.title);
    setText('reviewsSub', c.reviews.subtitle);

    if (Array.isArray(c.reviews.items) && c.reviews.items.length) {
      const grid = document.getElementById('reviewsGrid');
      if (grid) {
        grid.innerHTML = c.reviews.items
          .map((r) => `
          <article class="review" data-reveal>
            <div class="review-stars">${'★'.repeat(Math.max(0, Math.min(5, Number(r.stars) || 5)))}</div>
            <p class="review-text">${r.text || ''}</p>
            <div class="review-author"><span class="avatar">${r.avatar || ''}</span><div><strong>${r.name || ''}</strong><span>${r.role || ''}</span></div></div>
          </article>`)
          .join('');
      }
    }
  }

  // --- Форма заявки ---
  if (c.contacts) {
    setText('contactsTag', c.contacts.tag);
    setText('contactsTitle', c.contacts.title);
    setText('contactsSub', c.contacts.subtitle);

    const f = c.contacts.form;
    if (f) {
      setText('lblName', f.nameLabel);
      setText('lblPhone', f.phoneLabel);
      setText('lblType', f.typeLabel);
      setText('lblMsg', f.msgLabel);
      setText('formNote', f.note);
      setText('formSubmit', f.submit);
      setText('formSuccess', f.success);

      const submitEl = document.getElementById('formSubmit');
      if (submitEl && f.submitDone) submitEl.dataset.done = f.submitDone;

      const nameEl = document.getElementById('fName');
      const phoneEl = document.getElementById('fPhone');
      const msgEl = document.getElementById('fMsg');
      if (nameEl && f.namePlaceholder) nameEl.placeholder = f.namePlaceholder;
      if (phoneEl && f.phonePlaceholder) phoneEl.placeholder = f.phonePlaceholder;
      if (msgEl && f.msgPlaceholder) msgEl.placeholder = f.msgPlaceholder;

      const select = document.getElementById('fType');
      if (select && Array.isArray(f.typeOptions) && f.typeOptions.length) {
        select.innerHTML = f.typeOptions.map((o) => `<option>${o}</option>`).join('');
      }
    }
  }

  // --- Футер ---
  if (Array.isArray(c.footerLinks) && c.footerLinks.length) {
    const box = document.getElementById('footerLinks');
    if (box) {
      box.innerHTML = c.footerLinks.map((l) => `<a href="${l.href}">${l.label}</a>`).join('');
    }
  }

  // --- Порожні секції ховаємо (з'являться, щойно додаси вміст) ---
  toggleSection('services', c.services && Array.isArray(c.services.items) && c.services.items.length > 0);
  toggleSection('parts',    c.parts    && Array.isArray(c.parts.items)    && c.parts.items.length > 0);
  toggleSection('reviews',  c.reviews  && Array.isArray(c.reviews.items)  && c.reviews.items.length > 0);
}

let LAST_RENDERED = '';

function renderIfChanged(data) {
  const json = JSON.stringify(data);
  if (!data || json === LAST_RENDERED) return false;
  LAST_RENDERED = json;
  renderContent(data);
  return true;
}

/*
  Сайт сам перевіряє, чи не змінився контент (раз у 5 секунд).
  Тобто правки в адмінці з'являються тут самі — F5 не потрібен.
*/
function startLiveRefresh() {
  if (location.protocol === 'file:') return;   // у file:// сервера немає
  setInterval(async () => {
    try {
      const res = await fetch('content.json', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data === 'object' && Object.keys(data).length) {
        renderIfChanged(data);
      }
    } catch (err) {
      // сервер недоступний — просто чекаємо наступної спроби
    }
  }, 5000);
}

async function loadContent() {
  // Через сервер підтягуємо найсвіжіший вміст
  if (location.protocol !== 'file:') {
    try {
      const res = await fetch('content.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && Object.keys(data).length) {
          renderIfChanged(data);
          return;
        }
      }
    } catch (err) {
      // сервер недоступний — переходимо до вбудованої копії нижче
    }
  }

  // file:// або сервер недоступний — беремо копію з content.js
  if (window.SITE_CONTENT && typeof window.SITE_CONTENT === 'object') {
    renderIfChanged(window.SITE_CONTENT);
  }
}

/* ============ 2. Ініціалізація після контенту ============ */

function init() {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('agroteh-theme');

  if (savedTheme) root.setAttribute('data-theme', savedTheme);

  themeToggle?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('agroteh-theme', next);
  });

  // --- Шапка: тень при скроллі + кнопка "нагору" ---
  const header = document.getElementById('header');
  const toTop = document.getElementById('toTop');

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 8);
    toTop.classList.toggle('show', window.scrollY > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // --- Мобільне меню ---
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');

  burger?.addEventListener('click', () => nav.classList.toggle('open'));
  nav?.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-link')) nav.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') nav?.classList.remove('open');
  });

  // --- Поява блоків при прокрутці ---
  const revealItems = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach((el) => io.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add('visible'));
  }

  // --- Лічильники в hero (логіка у syncCounters вище) ---
  syncCounters();

  // --- Фільтр каталогу запчастин ---
  function bindFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const parts = document.querySelectorAll('.part');

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const cat = btn.dataset.filter;
        parts.forEach((part) => {
          const show = cat === 'all' || part.dataset.cat === cat;
          part.classList.toggle('hidden', !show);
          if (show) {
            part.classList.remove('visible');
            requestAnimationFrame(() => part.classList.add('visible'));
          }
        });
      });
    });
  }
  bindFilter();

  // --- Маска та відправка форми заявки ---
  const phoneInput = document.getElementById('fPhone');
  const form = document.getElementById('orderForm');
  const success = document.getElementById('formSuccess');
  const nameInput = document.getElementById('fName');
  const submitBtn = document.getElementById('formSubmit');

  const submitText = submitBtn?.textContent || 'Надіслати заявку';

  // Маска українського формату: +380 (XX) XXX-XX-XX
  phoneInput?.addEventListener('input', () => {
    let digits = phoneInput.value.replace(/\D/g, '');

    if (digits.startsWith('380')) digits = digits.slice(3);
    else if (digits.startsWith('80')) digits = digits.slice(2);
    else if (digits.startsWith('0')) digits = digits.slice(1);

    digits = digits.slice(0, 9);

    let out = '+380';
    if (digits.length > 0) out += ' (' + digits.slice(0, 2);
    if (digits.length >= 2) out += ')';
    if (digits.length > 2) out += ' ' + digits.slice(2, 5);
    if (digits.length > 5) out += '-' + digits.slice(5, 7);
    if (digits.length > 7) out += '-' + digits.slice(7, 9);

    phoneInput.value = out;
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    let valid = true;
    [nameInput, phoneInput].forEach((input) => {
      const isFilled = input === phoneInput
        ? input.value.replace(/\D/g, '').length >= 12
        : input.value.trim().length > 1;
      input.parentElement.classList.toggle('error', !isFilled);
      if (!isFilled) valid = false;
    });

    if (!valid) return;

    success.hidden = false;
    submitBtn.textContent = submitBtn.dataset.done || 'Заявку надіслано';
    form.reset();

    setTimeout(() => {
      success.hidden = true;
      submitBtn.textContent = submitText;
    }, 6000);
  });

  // --- Підсвітка активного пункту меню ---
  const sections = document.querySelectorAll('section[id]');

  if ('IntersectionObserver' in window) {
    const navIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          document.querySelectorAll('.nav-link').forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach((s) => navIO.observe(s));
  }
}

/* ============ Старт ============ */

loadContent().then(() => {
  init();
  startLiveRefresh();
});
