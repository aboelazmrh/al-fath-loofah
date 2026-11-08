/* Shared interactions for all five pages. No framework or build step required. */
(() => {
  'use strict';
  const PHONE = '201210270868';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const products = JSON.parse($('#product-data').textContent);
  const destinations = JSON.parse($('#destination-data')?.textContent || '[]');
  const urlParams = new URLSearchParams(location.search);
  const language = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const assetsBase = document.body.dataset.assetsBase || 'assets/';
  const languageLink = $('.language');
  const requestedLanguage = urlParams.get('lang');
  urlParams.delete('lang');
  if (languageLink) {
    const counterpart = new URL(languageLink.getAttribute('href'), document.baseURI);
    counterpart.search = urlParams.toString();
    counterpart.hash = location.hash;
    languageLink.href = counterpart.href;
    if (['ar', 'en'].includes(requestedLanguage) && requestedLanguage !== language) {
      location.replace(counterpart.href);
      return;
    }
  }
  if (requestedLanguage) {
    const clean = new URL(location.href);
    clean.searchParams.delete('lang');
    history.replaceState(null, '', clean);
  }
  const nav = $('#main-nav');
  const menu = $('.menu-toggle');
  const dialog = $('.modal');
  const regions = {
    all: ['من مصر إلى إيطاليا وفرنسا وبلجيكا وهولندا وأمريكا والسعودية والإمارات والبحرين والأردن، مع مكتبنا في اليونان.', 'From Egypt to Italy, France, Belgium, the Netherlands, the United States, Saudi Arabia, UAE, Bahrain and Jordan, with our office in Greece.'],
    europe: ['مسارات إلى إيطاليا وفرنسا وبلجيكا وهولندا.', 'Routes to Italy, France, Belgium and the Netherlands.'],
    america: ['رحلة اللوف المصري من أرض مصر إلى الولايات المتحدة الأمريكية.', 'The journey of Egyptian loofah from our land to the United States.'],
    middleeast: ['مسارات إلى السعودية والإمارات والبحرين والأردن.', 'Routes to Saudi Arabia, UAE, Bahrain and Jordan.'],
    greece: ['مكتبنا في اليونان يدعم التواصل مع شركائنا الأوروبيين.', 'Our Greece office supports communication with our European partners.']
  };
  let activeRegion = 'all';
  let activeCountry = null;
  let activeModal = null;
  let modalOpener = null;
  let carouselController = null;
  const word = (ar, en) => language === 'ar' ? ar : en;
  function translatedText(element, ar, en) {
    element.dataset.ar = ar;
    element.dataset.en = en;
    element.textContent = word(ar, en);
  }
  function applyLanguage() {
    if ($('#region-description')) updateRegion(activeRegion, activeCountry);
    if (activeModal) renderModal();
    if (carouselController) carouselController.translate();
  }
  function closeMenu() {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  $$('.main-nav a').forEach(link => link.addEventListener('click', closeMenu));
  const desktop = window.matchMedia('(min-width: 801px)');
  desktop.addEventListener('change', event => { if (event.matches) closeMenu(); });

  // Product filters preserve the same accessible card and enquiry links.
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    let count = 0;
    $$('.catalog-grid .product').forEach(card => {
      card.hidden = filter !== 'all' && card.dataset.category !== filter;
      if (!card.hidden) count++;
    });
    if ($('.empty-state')) $('.empty-state').hidden = count > 0;
  }));
  $$('[data-gallery-filter]').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.galleryFilter;
    $$('[data-gallery-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    let count = 0;
    $$('[data-gallery-category]').forEach(card => {
      card.hidden = filter !== 'all' && card.dataset.galleryCategory !== filter;
      if (!card.hidden) count++;
    });
    $('[data-gallery-count]').textContent = count;
  }));
  function updateRegion(region, countryId = null) {
    activeRegion = region;
    activeCountry = countryId;
    $$('[data-select-region]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.selectRegion === region)));
    $$('[data-select-country]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.selectCountry === countryId)));
    $$('.route, .map-country').forEach(route => {
      const active = countryId ? route.dataset.country === countryId : region === 'all' || route.dataset.region === region;
      route.classList.toggle('active', active);
    });
    const country = destinations.find(c => c.id === countryId);
    if (country) {
      translatedText($('#region-description'), country.id === 'greece' ? 'مكتبنا الأوروبي في اليونان.' : 'من مصر إلى ' + country.ar + ' — تواصل معنا لترتيب تفاصيل التوريد والتصدير.',
        country.id === 'greece' ? 'Our European office in Greece.' : 'From Egypt to ' + country.en + ' — contact us to discuss supply and export.');
    } else translatedText($('#region-description'), ...regions[region]);
  }
  $$('[data-select-region]').forEach(button => button.addEventListener('click', () => updateRegion(button.dataset.selectRegion)));
  $$('[data-select-country]').forEach(button => button.addEventListener('click', () => {
    const country = destinations.find(c => c.id === button.dataset.selectCountry);
    if (country) updateRegion(country.region, country.id);
  }));

  // Native dialog handles focus trapping and Escape; restore the triggering button.
  const modalThumbnails = $('.modal-thumbnails', dialog);
  const modalSpecs = $('.modal-specs', dialog);
  function renderModal() {
    const { product, items, index } = activeModal;
    const photo = items[index];
    const image = $('.modal-image', dialog);
    const title = $('#modal-title', dialog);
    const description = $('.modal-description', dialog);
    const kicker = $('.modal-kicker', dialog);
    const enquiry = $('.modal-enquiry', dialog);
    image.src = photo.source;
    image.alt = word(photo.ar, photo.en);
    enquiry.hidden = !product;
    kicker.hidden = !product;
    $$('[data-gallery-prev], [data-gallery-next], [data-gallery-counter]', dialog).forEach(el => {
      el.hidden = items.length < 2;
    });
    $('[data-gallery-counter]', dialog).textContent = `${index + 1} / ${items.length}`;
    if (product) {
      title.textContent = word(product.ar, product.en);
      description.textContent = word(product.desc_ar, product.desc_en);
      kicker.textContent = word('كود المنتج ', 'Product code ') + product.id;
      enquiry.href = 'contact.html?product=' + encodeURIComponent(product.id);
    } else {
      title.textContent = word(photo.ar, photo.en);
      description.textContent = word(photo.detailAr || 'رحلة اللوف من الزراعة إلى المنتج النهائي.', photo.detailEn || 'The loofah journey from field to finished product.');
    }
    $$('.modal-thumbnail', modalThumbnails).forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
    });
  }
  function openModal(items, index, opener, product = null) {
    if (!items[index] || dialog.open) return;
    activeModal = { items, index, product };
    modalOpener = opener;
    dialog.classList.toggle('gallery-modal', !product);
    dialog.classList.toggle('product-modal', !!product);
    if (modalSpecs) {
      const specs = product && opener.closest('.product')?.querySelector('.product-specs');
      modalSpecs.replaceChildren();
      if (specs) modalSpecs.append(specs.cloneNode(true));
      modalSpecs.hidden = !specs;
    }
    modalThumbnails.replaceChildren();
    modalThumbnails.hidden = !product || items.length < 2;
    if (!modalThumbnails.hidden) {
      items.forEach((photo, photoIndex) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'modal-thumbnail';
        button.setAttribute('aria-label', word(`اعرض الصورة ${photoIndex + 1}: ${photo.ar}`, `Show photo ${photoIndex + 1}: ${photo.en}`));
        const preview = document.createElement('img');
        preview.src = photo.source;
        preview.alt = '';
        preview.decoding = 'async';
        button.append(preview);
        button.addEventListener('click', () => {
          activeModal.index = photoIndex;
          renderModal();
        });
        modalThumbnails.append(button);
      });
    }
    renderModal();
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }
  function closeModal() { dialog.close(); }
  function galleryData(button) {
    return { source: button.dataset.gallerySrc, ar: button.dataset.titleAr, en: button.dataset.titleEn,
      detailAr: button.dataset.descriptionAr, detailEn: button.dataset.descriptionEn };
  }
  function moveModal(step) {
    if (!activeModal || activeModal.items.length < 2) return;
    const count = activeModal.items.length;
    activeModal.index = (activeModal.index + step + count) % count;
    renderModal();
  }
  $('[data-gallery-prev]', dialog).addEventListener('click', () => moveModal(-1));
  $('[data-gallery-next]', dialog).addEventListener('click', () => moveModal(1));
  dialog.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || !activeModal || activeModal.items.length < 2) return;
    event.preventDefault();
    const forward = event.key === (language === 'ar' ? 'ArrowLeft' : 'ArrowRight');
    moveModal(forward ? 1 : -1);
  });
  $$('[data-product]').forEach(button => button.addEventListener('click', () => {
    const product = products.find(p => p.id === button.dataset.product);
    if (!product) return;
    const items = product.photos.map(photo => ({ ...photo, source: assetsBase + photo.image }));
    openModal(items, 0, button, product);
  }));
  $$('[data-gallery-src]').forEach(button => button.addEventListener('click', () => {
    const visible = $$('[data-gallery-src]').filter(item => !item.hidden);
    openModal(visible.map(galleryData), visible.indexOf(button), button);
  }));
  $('.modal-close', dialog).addEventListener('click', closeModal);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal();
    }
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    activeModal = null;
    modalOpener?.focus({ preventScroll: true });
    modalOpener = null;
  });

  // The form prepares an enquiry. Nothing is stored or silently sent.
  $$('.contact-form').forEach(form => {
    const phone = form.elements.phone;
    const message = form.elements.message;
    const requestedProduct = urlParams.get('product');
    const prefilled = products.find(p => p.id === requestedProduct || p.previous_codes?.includes(requestedProduct));
    if (requestedProduct) form.elements.subject.value = 'product';
    if (prefilled) {
      message.value = word(
        `أرغب في الاستفسار عن ${prefilled.ar} (كود ${prefilled.id})، والمقاسات والكميات المتاحة.`,
        `I would like to enquire about ${prefilled.en} (code ${prefilled.id}), available sizes and quantities.`
      );
    }
    if (urlParams.get('subject') === 'export') form.elements.subject.value = 'export';
    form.addEventListener('input', event => {
      event.target.setCustomValidity('');
      $('.success-actions', form).hidden = true;
      $('.form-status', form).textContent = '';
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = form.elements.name.value.trim();
      const digits = phone.value.replace(/\D/g, '');
      const text = message.value.trim();
      if (!name) {
        form.elements.name.setCustomValidity(word('من فضلك أدخل اسمك.', 'Please enter your name.'));
        form.elements.name.reportValidity(); return;
      }
      if (digits.length < 7) {
        phone.setCustomValidity(word('من فضلك أدخل رقم هاتف صحيحًا.', 'Please enter a valid phone number.'));
        phone.reportValidity(); return;
      }
      if (!text) {
        message.setCustomValidity(word('من فضلك اكتب رسالتك.', 'Please enter your message.'));
        message.reportValidity(); return;
      }
      const fields = [
        word('استفسار من موقع مصنع الفتح', 'Enquiry from the Al Fath website'),
        word('الاسم: ', 'Name: ') + name,
        word('الشركة: ', 'Company: ') + form.elements.company.value.trim(),
        word('الهاتف: ', 'Phone: ') + phone.value.trim(),
        word('البريد: ', 'Email: ') + form.elements.email.value.trim(),
        word('الدولة: ', 'Country: ') + form.elements.country.value.trim(),
        word('نوع الطلب: ', 'Enquiry type: ') + form.elements.subject.selectedOptions[0].text,
        '', text
      ];
      const link = $('.prepared-link', form);
      link.href = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(fields.join('\n'));
      $('.success-actions', form).hidden = false;
      translatedText($('.form-status', form), 'رسالتك جاهزة. اضغط الزر التالي لمراجعتها وإرسالها عبر واتساب.', 'Your message is ready. Use the button below to review and send it in WhatsApp.');
      link.focus({ preventScroll: true });
    });
  });
  function createCarousel() {
    const root = $('.hero-carousel');
    if (!root) return null;
    const slides = $$('.carousel-slide', root);
    const dots = $$('[data-carousel-slide]', root);
    const toggle = $('[data-carousel-toggle]', root);
    const announcement = $('.carousel-announcement', root);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const interval = Number(root.dataset.interval) || 5000;
    let current = 0;
    let playing = !reducedMotion.matches;
    let hovered = false;
    let timer = 0;
    let pointerStart = null;
    function hydrate(slide) {
      const image = $('img', slide);
      if (image.dataset.src) {
        if (image.dataset.srcset) image.srcset = image.dataset.srcset;
        image.src = image.dataset.src;
        delete image.dataset.src;
        delete image.dataset.srcset;
      }
      image.loading = 'eager';
    }
    function translate() {
      root.setAttribute('aria-roledescription', word('عرض شرائح', 'carousel'));
      slides.forEach(slide => slide.setAttribute('aria-roledescription', word('شريحة', 'slide')));
      const label = playing
        ? word('إيقاف الحركة التلقائية', 'Pause automatic slideshow')
        : word('تشغيل الحركة التلقائية', 'Start automatic slideshow');
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
      toggle.setAttribute('aria-pressed', String(playing));
      $('[data-carousel-pause]', toggle).toggleAttribute('hidden', !playing);
      $('[data-carousel-play]', toggle).toggleAttribute('hidden', playing);
      root.dataset.playing = String(playing);
      if (announcement.textContent) announcement.textContent = word(
        'الصورة ' + (current + 1) + ' من ' + slides.length + ': ' + $('strong', slides[current]).textContent,
        'Image ' + (current + 1) + ' of ' + slides.length + ': ' + $('strong', slides[current]).textContent
      );
    }
    function schedule() {
      window.clearTimeout(timer);
      if (playing && !hovered && !document.hidden) {
        timer = window.setTimeout(() => { show(current + 1); schedule(); }, interval);
      }
    }
    function setPlaying(value) {
      playing = value;
      translate();
      schedule();
    }
    function show(index, manual = false) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === current);
        slide.setAttribute('aria-hidden', String(i !== current));
      });
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
      $('[data-carousel-current]', root).textContent = String(current + 1).padStart(2, '0');
      root.dataset.activeSlide = String(current);
      hydrate(slides[current]);
      hydrate(slides[(current + 1) % slides.length]);
      if (manual) announcement.textContent = word(
        'الصورة ' + (current + 1) + ' من ' + slides.length + ': ' + $('strong', slides[current]).textContent,
        'Image ' + (current + 1) + ' of ' + slides.length + ': ' + $('strong', slides[current]).textContent
      );
    }
    function manualMove(index) { setPlaying(false); show(index, true); }
    $('[data-carousel-prev]', root).addEventListener('click', () => manualMove(current - 1));
    $('[data-carousel-next]', root).addEventListener('click', () => manualMove(current + 1));
    dots.forEach(dot => dot.addEventListener('click', () => manualMove(Number(dot.dataset.carouselSlide))));
    toggle.addEventListener('click', () => setPlaying(!playing));
    root.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') { hovered = true; schedule(); }
    });
    root.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse') { hovered = false; schedule(); }
    });
    root.addEventListener('focusin', event => {
      if (!event.target.closest('[data-carousel-toggle]')) setPlaying(false);
    });
    root.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const forward = event.key === (language === 'ar' ? 'ArrowLeft' : 'ArrowRight');
      manualMove(current + (forward ? 1 : -1));
    });
    const stage = $('.carousel-stage', root);
    stage.addEventListener('pointerdown', event => {
      if (event.isPrimary && event.pointerType !== 'mouse') pointerStart = { x: event.clientX, y: event.clientY };
    });
    stage.addEventListener('pointerup', event => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;
      const forward = language === 'ar' ? dx > 0 : dx < 0;
      manualMove(current + (forward ? 1 : -1));
    });
    stage.addEventListener('pointercancel', () => { pointerStart = null; });
    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', event => { if (event.matches) setPlaying(false); });
    show(0);
    translate();
    schedule();
    return { translate };
  }
  carouselController = createCarousel();
  applyLanguage();
})();
