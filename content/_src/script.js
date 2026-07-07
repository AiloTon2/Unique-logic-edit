/* ============================================
   UNIQUE LOGIC - Animation & Interactions
   Shared across all design concepts
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  initCursorGlow();
  initParticles();
  initNavigation();
  initScrollReveal();
  initFAQ();
  initSmoothScroll();
  initFormHandling();
  initFloatingCTA();
  initTrustCounters();
  initProcessTimeline();
});

/* ============================================
   CUSTOM CURSOR
   ============================================ */
function initCursorGlow() {
  const cursorGlow = document.querySelector('.cursor-glow');
  const cursorDot = document.querySelector('.cursor-dot');
  if (!cursorGlow || !cursorDot) return;

  let mouseX = 0;
  let mouseY = 0;
  let glowX = 0;
  let glowY = 0;
  let dotX = 0;
  let dotY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Scale up cursor on interactive elements
  const interactiveElements = document.querySelectorAll('a, button, input, textarea, select, [role="button"]');
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursorDot.style.transform = 'translate(-50%, -50%) scale(1.5)';
      cursorDot.style.background = 'var(--accent-amber)';
      cursorDot.style.boxShadow = '0 0 20px var(--accent-amber), 0 0 40px rgba(245, 166, 35, 0.5)';
    });
    el.addEventListener('mouseleave', () => {
      cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
      cursorDot.style.background = 'var(--accent-cyan)';
      cursorDot.style.boxShadow = '0 0 20px var(--accent-cyan), 0 0 40px rgba(0, 212, 232, 0.5)';
  });
});

  function animate() {
    // Smooth lerp for glow (slower)
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    
    // Faster lerp for dot (more responsive)
    dotX += (mouseX - dotX) * 0.2;
    dotY += (mouseY - dotY) * 0.2;

    cursorGlow.style.left = glowX + 'px';
    cursorGlow.style.top = glowY + 'px';
    
    cursorDot.style.left = dotX + 'px';
    cursorDot.style.top = dotY + 'px';

    requestAnimationFrame(animate);
  }

  animate();
}

/* ============================================
   PARTICLES EFFECT (Hero Section)
   ============================================ */
function initParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;

  const particleCount = 40; // Increased particle count for more visual impact

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random position
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    
    // NO animation delay - particles move immediately when page loads
    particle.style.animationDelay = '0s';
    // Gentle animation duration for smooth floating effect
    particle.style.animationDuration = (Math.random() * 4 + 7) + 's';
    
    // Random size - slightly larger for visibility
    const size = Math.random() * 5 + 3;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';

    particlesContainer.appendChild(particle);
  }
}

/* ============================================
   NAVIGATION
   ============================================ */
function initNavigation() {
  const nav = document.querySelector('.nav');
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  // Scroll behavior for nav
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // Add/remove background opacity based on scroll
    if (currentScroll > 50) {
      nav.style.background = 'rgba(10, 10, 10, 0.95)';
    } else {
      nav.style.background = 'rgba(10, 10, 10, 0.8)';
    }
    
    lastScroll = currentScroll;
  });

  // Mobile menu toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
      
      // Animate hamburger
      const spans = hamburger.querySelectorAll('span');
      if (hamburger.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      }
    });

    // Close mobile menu when clicking a link (exclude dropdown toggles)
    mobileLinks.forEach(link => {
      if (!link.classList.contains('mobile-dropdown-toggle')) {
        link.addEventListener('click', () => {
          hamburger.classList.remove('active');
          mobileMenu.classList.remove('active');
          document.body.style.overflow = '';
          
          const spans = hamburger.querySelectorAll('span');
          spans[0].style.transform = '';
          spans[1].style.opacity = '';
          spans[2].style.transform = '';
        });
      }
    });
    
    // Mobile dropdown toggle
    const mobileDropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');
    mobileDropdownToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        toggle.classList.toggle('active');
        const dropdownMenu = toggle.nextElementSibling;
        if (dropdownMenu) {
          dropdownMenu.classList.toggle('active');
        }
      });
    });
  }

  // Language toggle
  const langBtns = document.querySelectorAll('.lang-btn');
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all buttons in the same group
      const parent = btn.parentElement;
      parent.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

  // Blog Category Filter & Pagination
  initBlogPagination();
  
  // Subscribe form — handled by initFormHandling() now
}

/* ============================================
   SCROLL REVEAL ANIMATIONS
   ============================================ */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-text, .reveal-item');
  
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        // Optional: stop observing after reveal
        // revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });

  // Also handle section headers
  const sectionHeaders = document.querySelectorAll('.section-header');
  sectionHeaders.forEach(header => {
    const tag = header.querySelector('.section-tag');
    const title = header.querySelector('.section-title');
    const desc = header.querySelector('.section-desc');
    
    if (tag) revealObserver.observe(tag);
    if (title) revealObserver.observe(title);
    if (desc) revealObserver.observe(desc);
  });
}

/* ============================================
   FAQ ACCORDION
   ============================================ */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', () => {
      // Close other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
        }
      });
      
      // Toggle current item
      item.classList.toggle('active');
    });
  });
}

/* ============================================
   SMOOTH SCROLL
   ============================================ */
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (!target) return;
      
      e.preventDefault();
      
      const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    });
  });
}

/* ============================================
   FORM HANDLING
   ============================================ */
function detectFormType(form) {
  if (form.id === 'subscribeForm' || form.classList.contains('subscribe-form')) return 'subscribe';
  if (form.id === 'contactForm' || form.classList.contains('contact-form')) return 'contact';
  if (form.classList.contains('cta-form')) return 'cta';
  // Fallback: if it has company/website fields it's contact, otherwise cta
  if (form.querySelector('[name="company"]') || form.querySelector('[name="website"]')) return 'contact';
  return 'cta';
}

function getSuccessMessage(formType) {
  const lang = document.documentElement.lang || '';
  const path = window.location.pathname || '';
  const isEn = lang.startsWith('en') || path.startsWith('/en');
  const isSc = path.startsWith('/sc');
  if (isEn) {
    if (formType === 'subscribe') return 'Thank you for subscribing!';
    return 'Thank you! Your message has been sent.';
  }
  if (isSc) {
    if (formType === 'subscribe') return '感谢订阅！';
    return '感谢！您的讯息已成功发送。';
  }
  if (formType === 'subscribe') return '感謝訂閱！';
  return '感謝！您的訊息已成功發送。';
}

function getErrorMessage() {
  const path = window.location.pathname || '';
  if (path.startsWith('/en')) return 'Failed to send. Please try again later.';
  if (path.startsWith('/sc')) return '发送失败，请稍后再试。';
  return '發送失敗，請稍後再試。';
}

function initFormHandling() {
  const forms = document.querySelectorAll('form');

  forms.forEach(form => {
    // Skip forms already bound
    if (form.dataset.ulBound === '1') return;
    form.dataset.ulBound = '1';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formType = detectFormType(form);
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      data.form_type = formType;
      data.page_url = window.location.href;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (!submitBtn) return;
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>...</span>';

      try {
        const res = await fetch('/wp-json/ul/v1/contact', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();

        if (res.ok && result.success) {
          submitBtn.innerHTML = '<span>' + getSuccessMessage(formType) + '</span>';
          submitBtn.style.background = '#16a34a';
          form.reset();
          setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 4000);
        } else {
          submitBtn.innerHTML = '<span>' + (result.message || getErrorMessage()) + '</span>';
          submitBtn.style.background = '#dc2626';
          setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 3000);
        }
      } catch (err) {
        console.error('Form submission error:', err);
        submitBtn.innerHTML = '<span>' + getErrorMessage() + '</span>';
        submitBtn.style.background = '#dc2626';
        setTimeout(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
        }, 3000);
      }
    });
  });

  // Add focus states for better UX
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', () => {
      input.parentElement.classList.remove('focused');
    });
  });
}

/* ============================================
   TEXT SCRAMBLE EFFECT (Optional enhancement)
   ============================================ */
class TextScramble {
  constructor(el) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}—=+*^?#________';
    this.update = this.update.bind(this);
  }
  
  setText(newText) {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise((resolve) => this.resolve = resolve);
    this.queue = [];
    
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      this.queue.push({ from, to, start, end });
    }
    
    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
    return promise;
  }
  
  update() {
    let output = '';
    let complete = 0;
    
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      
      if (this.frame >= end) {
        complete++;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span class="scramble-char">${char}</span>`;
      } else {
        output += from;
      }
    }
    
    this.el.innerHTML = output;
    
    if (complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
    }
  }
  
  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}

/* ============================================
   PARALLAX EFFECT (For elements with data-parallax)
   ============================================ */
function initParallax() {
  const parallaxElements = document.querySelectorAll('[data-parallax]');
  
  if (parallaxElements.length === 0) return;
  
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    
    parallaxElements.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.5;
      const yPos = -(scrolled * speed);
      el.style.transform = `translateY(${yPos}px)`;
    });
  });
}

/* ============================================
   NUMBER COUNTER ANIMATION
   ============================================ */
function animateCounter(element, target, duration = 2000) {
  const start = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(easeProgress * target);
    
    element.textContent = current.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target.toLocaleString();
    }
  }
  
  requestAnimationFrame(update);
}

// Initialize counters when they come into view
function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.counter, 10);
        animateCounter(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  counters.forEach(counter => observer.observe(counter));
}

/* ============================================
   MAGNETIC BUTTON EFFECT
   ============================================ */
function initMagneticButtons() {
  const buttons = document.querySelectorAll('.btn-magnetic');
  
  buttons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

/* ============================================
   HORIZONTAL SCROLL FOR SERVICES
   ============================================ */
function initHorizontalScroll() {
  const scrollContainer = document.querySelector('.services-scroll');
  if (!scrollContainer) return;
  
  let isDown = false;
  let startX;
  let scrollLeft;
  
  scrollContainer.addEventListener('mousedown', (e) => {
    isDown = true;
    scrollContainer.style.cursor = 'grabbing';
    startX = e.pageX - scrollContainer.offsetLeft;
    scrollLeft = scrollContainer.scrollLeft;
  });
  
  scrollContainer.addEventListener('mouseleave', () => {
    isDown = false;
    scrollContainer.style.cursor = 'grab';
  });
  
  scrollContainer.addEventListener('mouseup', () => {
    isDown = false;
    scrollContainer.style.cursor = 'grab';
  });
  
  scrollContainer.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scrollContainer.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainer.scrollLeft = scrollLeft - walk;
  });
}

/* ============================================
   FLOATING CTA BAR
   ============================================ */
function initFloatingCTA() {
  const floatingCTA = document.getElementById('floatingCta');
  if (!floatingCTA) return;

  let lastScroll = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollY = window.pageYOffset;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const contactSection = document.getElementById('contact');
        
        // Show floating CTA after scrolling past hero section
        if (scrollY > windowHeight * 0.5) {
          // Hide when approaching contact section
          if (contactSection) {
            const contactRect = contactSection.getBoundingClientRect();
            if (contactRect.top < windowHeight) {
              floatingCTA.classList.remove('visible');
            } else {
              floatingCTA.classList.add('visible');
            }
          } else {
            floatingCTA.classList.add('visible');
          }
        } else {
          floatingCTA.classList.remove('visible');
        }
        
        lastScroll = scrollY;
        ticking = false;
      });
      ticking = true;
    }
  });
}

/* ============================================
   TRUST BANNER COUNTERS
   ============================================ */
function initTrustCounters() {
  const trustNumbers = document.querySelectorAll('.trust-number[data-counter]');
  
  if (trustNumbers.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.counter, 10);
        animateTrustCounter(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  trustNumbers.forEach(counter => observer.observe(counter));
}

function animateTrustCounter(element, target, duration = 2000) {
  const start = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(easeProgress * target);
    
    element.textContent = current;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target;
    }
  }
  
  requestAnimationFrame(update);
}

/* ============================================
   PROCESS TIMELINE ANIMATION
   Rope falling effect on scroll
   ============================================ */
function initProcessTimeline() {
  const processTimeline = document.querySelector('.process-timeline');
  const processSection = document.querySelector('.process-section');
  
  if (!processTimeline || !processSection) return;
  
  let hasTransitioned = false;
  let ticking = false;
  
  function checkScroll() {
    const rect = processSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Trigger when section is 40% into viewport
    const triggerPoint = windowHeight * 0.6;
    
    if (rect.top < triggerPoint && !hasTransitioned) {
      // Add falling class to trigger rope animation
      processTimeline.classList.add('falling');
      hasTransitioned = true;
    }
    
    // Optional: reverse when scrolling back up
    if (rect.top > windowHeight && hasTransitioned) {
      processTimeline.classList.remove('falling');
      hasTransitioned = false;
    }
  }
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        checkScroll();
        ticking = false;
      });
      ticking = true;
    }
  });
  
  // Initial check
  checkScroll();
}

// Initialize additional features
document.addEventListener('DOMContentLoaded', () => {
  initParallax();
  initCounters();
  initMagneticButtons();
  initHorizontalScroll();
});

/* ============================================
   BLOG PAGINATION & FILTERING
   ============================================ */
function initBlogPagination() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const allBlogCards = document.querySelectorAll('.blog-card');
  const blogGrid = document.querySelector('.blog-grid');
  const pagination = document.getElementById('blogPagination');
  const pageNumbersContainer = document.getElementById('pageNumbers');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  
  // Mobile Filter Dropdown - initialize first (before early return)
  const dropdownToggle = document.getElementById('filterDropdownToggle');
  const dropdownMenu = document.getElementById('filterDropdownMenu');
  const dropdownItems = document.querySelectorAll('.filter-dropdown-item');
  const dropdownLabel = document.querySelector('.filter-dropdown-label');
  
  if (dropdownToggle && dropdownMenu) {
    // Toggle dropdown
    dropdownToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownToggle.classList.toggle('active');
      dropdownMenu.classList.toggle('open');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownToggle.classList.remove('active');
        dropdownMenu.classList.remove('open');
      }
    });
  }
  
  // If the grid is server-paginated (rerenderer.js handles fetching per page),
  // skip client-side pagination entirely — the server controls paging & filtering.
  if (blogGrid && blogGrid.dataset.serverPaginated === 'true') return;

  if (!blogGrid || allBlogCards.length === 0) return;
  
  const ITEMS_PER_PAGE = 6;
  let currentPage = 1;
  let currentCategory = 'all';

  function applyCategoryFromHash(rerender) {
    var cat = (window.location.hash.match(/category=(\w+)/) || [])[1];
    if (!cat || !document.querySelector('.filter-btn[data-category="' + cat + '"]')) return;
    currentCategory = cat;
    currentPage = 1;
    filterBtns.forEach(function(b) { b.classList.toggle('active', b.dataset.category === cat); });
    dropdownItems.forEach(function(i) { i.classList.toggle('active', i.dataset.category === cat); });
    if (dropdownLabel) {
      var matchedBtn = document.querySelector('.filter-btn[data-category="' + cat + '"]');
      if (matchedBtn) dropdownLabel.textContent = matchedBtn.textContent;
    }
    if (rerender) {
      renderCards();
      renderPageNumbers();
      updateNavButtons();
    }
  }

  applyCategoryFromHash(false);

  window.addEventListener('hashchange', function() { applyCategoryFromHash(true); });

  // Get filtered cards based on current category
  function getFilteredCards() {
    return Array.from(allBlogCards).filter(card => {
      return currentCategory === 'all' || card.dataset.category === currentCategory;
    });
  }
  
  // Calculate total pages
  function getTotalPages() {
    const filteredCards = getFilteredCards();
    return Math.ceil(filteredCards.length / ITEMS_PER_PAGE);
  }
  
  // Render page numbers
  function renderPageNumbers() {
    if (!pageNumbersContainer) return;
    
    const totalPages = getTotalPages();
    pageNumbersContainer.innerHTML = '';
    
    // Always show first page
    if (totalPages > 0) {
      addPageNumber(1);
    }
    
    // Show ellipsis and middle pages
    if (totalPages > 5) {
      if (currentPage > 3) {
        addEllipsis();
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          addPageNumber(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        addEllipsis();
      }
      
      // Always show last page
      if (totalPages > 1) {
        addPageNumber(totalPages);
      }
    } else {
      // Show all page numbers if 5 or less
      for (let i = 2; i <= totalPages; i++) {
        addPageNumber(i);
      }
    }
  }
  
  function addPageNumber(num) {
    const btn = document.createElement('button');
    btn.className = 'page-number' + (num === currentPage ? ' active' : '');
    btn.textContent = num;
    btn.addEventListener('click', () => goToPage(num));
    pageNumbersContainer.appendChild(btn);
  }
  
  function addEllipsis() {
    const span = document.createElement('span');
    span.className = 'page-ellipsis';
    span.textContent = '...';
    pageNumbersContainer.appendChild(span);
  }
  
  // Go to specific page
  function goToPage(page) {
    const totalPages = getTotalPages();
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderCards();
    renderPageNumbers();
    updateNavButtons();
    
    // Scroll to top of blog section
    const blogMain = document.querySelector('.blog-main');
    if (blogMain) {
      blogMain.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  // Update prev/next buttons
  function updateNavButtons() {
    const totalPages = getTotalPages();
    
    if (prevBtn) {
      prevBtn.disabled = currentPage === 1;
    }
    if (nextBtn) {
      nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
    
    // Hide pagination if only 1 page or no pages
    if (pagination) {
      pagination.style.display = totalPages <= 1 ? 'none' : 'flex';
    }
  }
  
  // Render cards for current page
  function renderCards() {
    const filteredCards = getFilteredCards();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    
    // Hide all cards first
    allBlogCards.forEach(card => {
      card.classList.add('hidden');
      card.style.display = 'none';
    });
    
    // Show cards for current page
    filteredCards.forEach((card, index) => {
      if (index >= startIndex && index < endIndex) {
        card.classList.remove('hidden');
        card.style.display = 'block';
        // Re-trigger reveal animation
        card.classList.remove('revealed');
        setTimeout(() => card.classList.add('revealed'), 50 + (index - startIndex) * 100);
      }
    });
  }
  
  // Filter button click handlers (Desktop)
  if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active button
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update category and reset to page 1
        currentCategory = btn.dataset.category;
        currentPage = 1;
        
        // Re-render
        renderCards();
        renderPageNumbers();
        updateNavButtons();
        
        // Sync mobile dropdown
        syncMobileDropdown(btn.dataset.category, btn.textContent);
      });
    });
  }
  
  // Sync mobile dropdown with desktop filter
  function syncMobileDropdown(category, label) {
    if (dropdownLabel) {
      dropdownLabel.textContent = label;
    }
    dropdownItems.forEach(item => {
      item.classList.toggle('active', item.dataset.category === category);
    });
  }
  
  // Sync desktop filters with mobile dropdown
  function syncDesktopFilters(category) {
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
  }
  
  // Dropdown item click handlers (filtering logic)
  if (dropdownItems.length > 0) {
    dropdownItems.forEach(item => {
      item.addEventListener('click', () => {
        // Update active item
        dropdownItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Update label
        if (dropdownLabel) {
          dropdownLabel.textContent = item.textContent;
        }
        
        // Close dropdown
        if (dropdownToggle) dropdownToggle.classList.remove('active');
        if (dropdownMenu) dropdownMenu.classList.remove('open');
        
        // Update category and reset to page 1
        currentCategory = item.dataset.category;
        currentPage = 1;
        
        // Re-render
        renderCards();
        renderPageNumbers();
        updateNavButtons();
        
        // Sync desktop filters
        syncDesktopFilters(item.dataset.category);
      });
    });
  }
  
  // Prev/Next button handlers
  if (prevBtn) {
    prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
  }
  
  // Initial render
  renderCards();
  renderPageNumbers();
  updateNavButtons();
}
