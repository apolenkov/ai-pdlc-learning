(() => {
  const nav = document.querySelector('[data-global-nav]');
  if (!nav) return;
  const reserve = () => {
    const inset = parseFloat(getComputedStyle(nav).top) || 0;
    document.documentElement.style.setProperty(
      '--site-nav-reserve',
      `${nav.offsetHeight + inset * 2}px`,
    );
  };
  reserve();
  new ResizeObserver(reserve).observe(nav);
  const navItems = [...nav.querySelectorAll('[data-nav-item]')];
  const sections = ['sdlc', 'help']
    .map((id) => document.getElementById(id))
    .filter((section) => section instanceof HTMLElement);
  if (!navItems.length || !sections.length) return;

  const setActive = (sectionId) => {
    const activeItem = navItems.find((item) =>
      sectionId === 'sdlc'
        ? item.getAttribute('data-nav-item') === 'home'
        : item.getAttribute('href') === `#${sectionId}`,
    );
    navItems.forEach((item) => {
      if (item === activeItem) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  };

  const sectionFromHash = () => {
    const fragment = location.hash.slice(1);
    if (fragment === 'analysis' || fragment === 'intent' || !fragment) return 'sdlc';
    return sections.some((section) => section.id === fragment) ? fragment : null;
  };

  const updateFromScroll = () => {
    /* Section anchors intentionally stop a little below the fixed frame.
       Use the same visual clearance when deciding which catalog area is
       current; otherwise a section aligned at 108px can remain assigned
       to the preceding area beneath a 76px-high frame. */
    const threshold = nav.getBoundingClientRect().bottom + 64;
    /* The final section may not be able to align exactly beneath the
       fixed frame because the browser clamps the last scroll position.
       At the document end it is still the reader's current area. */
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      setActive(sections.at(-1).id);
      return;
    }
    let current = sections[0];
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= threshold) current = section;
    });
    setActive(current.id);
  };

  let frame = 0;
  const scheduleUpdate = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      updateFromScroll();
    });
  };
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  const initializeNavigation = () => {
    const sectionId = sectionFromHash();
    if (sectionId) {
      setActive(sectionId);
      return;
    }
    scheduleUpdate();
  };
  window.addEventListener('hashchange', initializeNavigation);
  initializeNavigation();
  window.addEventListener('load', initializeNavigation, { once: true });
})();
(() => {
  const route = document.getElementById('sdlc');
  if (!(route instanceof HTMLElement)) return;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const playRelay = () => {
    if (reduced()) {
      route.classList.remove('is-ready', 'is-live');
      return;
    }
    route.classList.remove('is-live');
    route.classList.add('is-ready');
    void route.offsetWidth;
    route.classList.remove('is-ready');
    route.classList.add('is-live');
  };
  if (reduced() || !('IntersectionObserver' in window)) return;
  route.classList.add('is-ready');
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      playRelay();
    },
    { threshold: 0.25 },
  );
  observer.observe(route);
})();
