// ── WP Re-renderer ────────────────────────────────────────────────
// Thin client-side layer injected via mu-plugin.
// For now, only re-renders the verified about-us page using
// the step4 template + JSON so you can see the design in WordPress
// before extracting all other pages.

const STEP4_BASE = '/content/_src/_map/step4';
const PREFERRED_LANGUAGE_KEY = 'ul_preferred_lang';

function ensureStyles(extraHrefs = []) {
	const bust = 'v=' + Date.now();
	const hrefs = ['/content/_src/styles.css', ...extraHrefs];
	const promises = hrefs.map((href) => {
		if (document.querySelector(`link[data-rerenderer-css="${href}"]`)) {
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = href + (href.includes('?') ? '&' : '?') + bust;
			link.setAttribute('data-rerenderer-css', href);
			link.onload = resolve;
			link.onerror = resolve;
			document.head.appendChild(link);
		});
	});
	return Promise.all(promises);
}

function loadScriptOnce(src) {
	return new Promise((resolve, reject) => {
		if (document.querySelector(`script[data-rerenderer-js="${src}"]`)) {
			return resolve();
		}
		const script = document.createElement('script');
		const bust = 'v=' + Date.now();
		script.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + bust;
		script.async = false;
		script.setAttribute('data-rerenderer-js', src);
		script.onload = () => resolve();
		script.onerror = (e) => reject(e);
		document.body.appendChild(script);
	});
}

async function fetchText(path) {
	const res = await fetch(path, { credentials: 'same-origin' });
	if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
	return res.text();
}

async function fetchJSON(path) {
	const res = await fetch(path, { credentials: 'same-origin' });
	if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
	return res.json();
}

function stripTags(html) {
	if (!html) return '';
	const tmp = document.createElement('div');
	tmp.innerHTML = html;
	return tmp.textContent || tmp.innerText || '';
}

function structureBlogContent(rawHtml) {
	const wrapper = document.createElement('div');
	wrapper.innerHTML = rawHtml;
	const nodes = Array.from(wrapper.childNodes);
	const groups = [];
	let current = { type: 'intro', elements: [] };

	nodes.forEach((node) => {
		if (node.nodeType === Node.ELEMENT_NODE && /^H[2-3]$/i.test(node.tagName)) {
			if (current.elements.length > 0) groups.push(current);
			current = { type: 'section', heading: node.outerHTML, elements: [] };
		} else if (node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent.trim())) {
			current.elements.push(node.nodeType === Node.ELEMENT_NODE ? node.outerHTML : `<p>${node.textContent.trim()}</p>`);
		}
	});
	if (current.elements.length > 0 || current.heading) groups.push(current);

	return groups.map((g) => {
		if (g.type === 'intro') {
			return `<div class="article-intro reveal-item">${g.elements.join('')}</div>`;
		}
		return `<section class="article-section reveal-item">${g.heading || ''}${g.elements.join('')}</section>`;
	}).join('');
}

function flatten(obj, prefix = '') {
	const out = {};
	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			Object.assign(out, flatten(value, fullKey));
		} else {
			out[fullKey] = value;
		}
	}
	return out;
}

function setByPath(target, dotPath, value) {
	const parts = dotPath.split('.');
	let cur = target;
	for (let i = 0; i < parts.length - 1; i += 1) {
		const key = parts[i];
		if (!cur[key] || typeof cur[key] !== 'object' || Array.isArray(cur[key])) {
			cur[key] = {};
		}
		cur = cur[key];
	}
	cur[parts[parts.length - 1]] = value;
}

function applyPrefixedMetaOntoFallback(meta, fallbackObj, prefix) {
	const base = fallbackObj ? JSON.parse(JSON.stringify(fallbackObj)) : {};
	const flat = flatten(base);
	Object.keys(flat).forEach((dotPath) => {
		const metaKey = `${prefix}_${dotPath.replace(/\./g, '_')}`;
		const v = meta[metaKey];
		if (v != null && v !== '') {
			setByPath(base, dotPath, v);
		}
	});
	return base;
}

function injectPlaceholders(template, map) {
	return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
		const val = map[key.trim()];
		return val == null ? match : String(val);
	});
}

function normalizeRerenderAssetUrls() {
	const toAbsoluteAssetUrl = (value) => {
		if (!value) return value;
		if (value.startsWith('asset/')) return `/content/_src/${value}`;
		if (value.startsWith('./asset/')) return `/content/_src/${value.slice(2)}`;
		if (value.startsWith('/asset/')) return `/content/_src${value}`;
		return value;
	};

	const nodes = document.querySelectorAll(
		'img[src],source[src],video[src],audio[src],a[href],link[href]'
	);
	nodes.forEach((node) => {
		const src = node.getAttribute('src');
		if (src != null) {
			const normalizedSrc = toAbsoluteAssetUrl(src);
			if (normalizedSrc !== src) node.setAttribute('src', normalizedSrc);
		}
		const href = node.getAttribute('href');
		if (href != null) {
			const normalizedHref = toAbsoluteAssetUrl(href);
			if (normalizedHref !== href) node.setAttribute('href', normalizedHref);
		}
	});
}

function metaOrFallback(meta, key, fallback) {
	const v = meta[key];
	return v != null && v !== '' ? v : (fallback != null ? fallback : '');
}

// Get Yoast SEO meta title or fallback to custom field or default
function getYoastTitle(page, customFieldKey, meta, fallbackTitle) {
	// Priority: Yoast > Custom Field > Fallback
	if (page?.yoast_meta?.title) return page.yoast_meta.title;
	return metaOrFallback(meta || {}, customFieldKey, fallbackTitle);
}

// Get Yoast SEO meta description or fallback to custom field or default
function getYoastDescription(page, customFieldKey, meta, fallbackDesc) {
	// Priority: Yoast > Custom Field > Fallback
	if (page?.yoast_meta?.description) return page.yoast_meta.description;
	return metaOrFallback(meta || {}, customFieldKey, fallbackDesc);
}

function updateDocumentMeta(merged) {
	// Update document title from WordPress custom fields or fallback
	if (merged.meta?.title) {
		document.title = merged.meta.title;
	}
	// Update or create meta description tag
	if (merged.meta?.description) {
		let metaDesc = document.querySelector('meta[name="description"]');
		if (!metaDesc) {
			metaDesc = document.createElement('meta');
			metaDesc.name = 'description';
			document.head.appendChild(metaDesc);
		}
		metaDesc.content = merged.meta.description;
	}
	// Update canonical URL to ensure it matches current URL with trailing slash
	let canonicalLink = document.querySelector('link[rel="canonical"]');
	let currentUrl = window.location.href.split('?')[0].split('#')[0];
	if (!currentUrl.endsWith('/')) {
		currentUrl += '/';
	}
	if (!canonicalLink) {
		canonicalLink = document.createElement('link');
		canonicalLink.rel = 'canonical';
		document.head.appendChild(canonicalLink);
	}
	canonicalLink.href = currentUrl;
}

async function fetchManagedFooterSocialLinks(pageId = 0, socialFallbackSource = null) {
	const fallback = {
		facebook: socialFallbackSource?.footer?.social?.facebook_href || '#',
		linkedin: socialFallbackSource?.footer?.social?.linkedin_href || '#',
		instagram: socialFallbackSource?.footer?.social?.instagram_href || '#',
	};
	if (!pageId) return fallback;

	try {
		const res = await fetch(`/wp-json/wp/v2/pages/${pageId}`, { credentials: 'same-origin' });
		if (!res.ok) return fallback;
		const page = await res.json();
		const meta = page.meta || {};
		return {
			facebook: metaOrFallback(meta, 'shared_footer_social_facebook_url', fallback.facebook),
			linkedin: metaOrFallback(meta, 'shared_footer_social_linkedin_url', fallback.linkedin),
			instagram: metaOrFallback(meta, 'shared_footer_social_instagram_url', fallback.instagram),
		};
	} catch (_) {
		return fallback;
	}
}

function applyManagedFooterSocialLinks(links) {
	const anchors = Array.from(document.querySelectorAll(
		'.footer .footer-social .social-link, .footer .footer-social .social-btn, .footer .social-btn, .sidebar-social .social-btn, .sidebar-social .social-link, .social-section .social-btn, .social-section .social-link, .social-links .social-btn, .social-links .social-link'
	));
	if (!anchors.length) return;
	const getTypeFromAnchor = (a, index) => {
		const label = (a.getAttribute('aria-label') || '').toLowerCase();
		if (label.includes('face')) return 'facebook';
		if (label.includes('linked')) return 'linkedin';
		if (label.includes('insta')) return 'instagram';
		return ['facebook', 'linkedin', 'instagram'][index] || '';
	};

	anchors.forEach((a, index) => {
		const type = getTypeFromAnchor(a, index);
		const href = links?.[type];
		if (!href || href === '#') return;
		a.setAttribute('href', href);
		a.setAttribute('target', '_blank');
		a.setAttribute('rel', 'noopener noreferrer');
	});
}

function detectLanguageFromPath(pathname) {
	if (pathname === '/en' || pathname === '/en/' || pathname.startsWith('/en/')) return 'en';
	if (pathname === '/sc' || pathname === '/sc/' || pathname.startsWith('/sc/')) return 'sc';
	if (pathname === '/tc' || pathname === '/tc/' || pathname.startsWith('/tc/')) return 'tc';
	return 'tc';
}

function normalizePath(pathname) {
	if (!pathname) return '/';
	if (pathname.length > 1 && pathname.endsWith('/')) return pathname.replace(/\/+$/, '');
	return pathname;
}

function readPreferredLanguage() {
	try {
		const v = window.localStorage.getItem(PREFERRED_LANGUAGE_KEY) || '';
		return v === 'tc' || v === 'en' || v === 'sc' ? v : '';
	} catch (_) {
		return '';
	}
}

function writePreferredLanguage(langSlug) {
	if (!(langSlug === 'tc' || langSlug === 'en' || langSlug === 'sc')) return;
	try {
		window.localStorage.setItem(PREFERRED_LANGUAGE_KEY, langSlug);
	} catch (_) {}
}

function prefixRoute(slug, langSlug) {
	if (langSlug === 'en') return '/en/' + slug;
	if (langSlug === 'sc') return '/sc/' + slug;
	return '/' + slug;
}

function getAboutUsRouteByLanguage(langSlug) { return prefixRoute('about-us', langSlug); }
function getContactRouteByLanguage(langSlug) { return prefixRoute('contact', langSlug); }
function getSeoServicesRouteByLanguage(langSlug) { return prefixRoute('seo-services', langSlug); }
function getAiSeoServicesRouteByLanguage(langSlug) { return prefixRoute('ai-seo-services', langSlug); }
function getOrmServicesRouteByLanguage(langSlug) { return prefixRoute('orm-services', langSlug); }
function getSemServicesRouteByLanguage(langSlug) { return prefixRoute('sem-services', langSlug); }
function getContentMarketingServicesRouteByLanguage(langSlug) { return prefixRoute('content-marketing-services', langSlug); }
function getSocialMediaServicesRouteByLanguage(langSlug) { return prefixRoute('social-media-services', langSlug); }
function getWebDesignServicesRouteByLanguage(langSlug) { return prefixRoute('web-design-services', langSlug); }
function getEcommerceServicesRouteByLanguage(langSlug) { return prefixRoute('ecommerce-services', langSlug); }
function getBlogRouteByLanguage(langSlug) { return prefixRoute('blog', langSlug); }
function getBlogArticle1RouteByLanguage(langSlug) { return prefixRoute('blog-article-1', langSlug); }

function getHomeRouteByLanguage(langSlug) {
	if (langSlug === 'en') return '/en/';
	if (langSlug === 'sc') return '/sc/';
	return '/';
}

function matchesSlugRoute(pathname, slug) {
	const p = normalizePath(pathname);
	return p === '/' + slug || p === '/en/' + slug || p === '/sc/' + slug || p === '/tc/' + slug;
}

function isAboutUsRoute(pathname) { return matchesSlugRoute(pathname, 'about-us'); }
function isContactRoute(pathname) { return matchesSlugRoute(pathname, 'contact'); }
function isSeoServicesRoute(pathname) { return matchesSlugRoute(pathname, 'seo-services'); }
function isAiSeoServicesRoute(pathname) { return matchesSlugRoute(pathname, 'ai-seo-services'); }
function isOrmServicesRoute(pathname) { return matchesSlugRoute(pathname, 'orm-services'); }
function isSemServicesRoute(pathname) { return matchesSlugRoute(pathname, 'sem-services'); }
function isContentMarketingServicesRoute(pathname) { return matchesSlugRoute(pathname, 'content-marketing-services'); }
function isSocialMediaServicesRoute(pathname) { return matchesSlugRoute(pathname, 'social-media-services'); }
function isWebDesignServicesRoute(pathname) { return matchesSlugRoute(pathname, 'web-design-services'); }
function isEcommerceServicesRoute(pathname) { return matchesSlugRoute(pathname, 'ecommerce-services'); }
function isBlogRoute(pathname) { return matchesSlugRoute(pathname, 'blog'); }
function isBlogArticle1Route(pathname) { return matchesSlugRoute(pathname, 'blog-article-1'); }

function isHomeRoute(pathname) {
	const p = normalizePath(pathname);
	return p === '/' || p === '/en' || p === '/sc' || p === '/tc' || p === '/home' || p === '/en/home' || p === '/sc/home';
}

function stripLanguagePrefix(pathname) {
	const p = normalizePath(pathname);
	const stripped = p.replace(/^\/(?:en|sc|tc)(?=\/|$)/, '');
	return stripped || '/';
}

function isSystemPath(pathname) {
	return /^\/(?:wp-admin|wp-login\.php|wp-json|wp-content|wp-includes|content|xmlrpc\.php|robots\.txt|favicon\.ico|sitemap)/.test(pathname);
}

function routePathForLanguage(pathname, langSlug) {
	if (!langSlug) return normalizePath(pathname);
	const current = normalizePath(pathname);
	if (isAboutUsRoute(current)) return getAboutUsRouteByLanguage(langSlug);
	if (isContactRoute(current)) return getContactRouteByLanguage(langSlug);
	if (isSeoServicesRoute(current)) return getSeoServicesRouteByLanguage(langSlug);
	if (isAiSeoServicesRoute(current)) return getAiSeoServicesRouteByLanguage(langSlug);
	if (isOrmServicesRoute(current)) return getOrmServicesRouteByLanguage(langSlug);
	if (isSemServicesRoute(current)) return getSemServicesRouteByLanguage(langSlug);
	if (isContentMarketingServicesRoute(current)) return getContentMarketingServicesRouteByLanguage(langSlug);
	if (isSocialMediaServicesRoute(current)) return getSocialMediaServicesRouteByLanguage(langSlug);
	if (isWebDesignServicesRoute(current)) return getWebDesignServicesRouteByLanguage(langSlug);
	if (isEcommerceServicesRoute(current)) return getEcommerceServicesRouteByLanguage(langSlug);
	if (isBlogRoute(current)) return getBlogRouteByLanguage(langSlug);
	if (isBlogArticle1Route(current)) return getBlogArticle1RouteByLanguage(langSlug);
	if (isHomeRoute(current)) return getHomeRouteByLanguage(langSlug);
	const core = stripLanguagePrefix(current);
	const suffix = core === '/' ? '/' : core;
	if (langSlug === 'tc') return suffix;
	return `/${langSlug}${suffix}`;
}

function localizeKnownNavHref(href, langSlug) {
	if (!href) return href;
	const normalized = href.trim().toLowerCase();
	const hashIdx = normalized.indexOf('#');
	const pathPart = hashIdx >= 0 ? normalized.substring(0, hashIdx) : normalized;
	const hashPart = hashIdx >= 0 ? normalized.substring(hashIdx) : '';
	if (hashPart === '#services' && (pathPart === '' || pathPart === '/' || pathPart === 'index-v1.html')) {
		return `${getHomeRouteByLanguage(langSlug)}#services`;
	}
	const slugRouteMap = [
		['about-us', getAboutUsRouteByLanguage],
		['contact', getContactRouteByLanguage],
		['seo-services', getSeoServicesRouteByLanguage],
		['ai-seo-services', getAiSeoServicesRouteByLanguage],
		['orm-services', getOrmServicesRouteByLanguage],
		['sem-services', getSemServicesRouteByLanguage],
		['content-marketing-services', getContentMarketingServicesRouteByLanguage],
		['social-media-services', getSocialMediaServicesRouteByLanguage],
		['web-design-services', getWebDesignServicesRouteByLanguage],
		['ecommerce-services', getEcommerceServicesRouteByLanguage],
		['blog', getBlogRouteByLanguage],
		['blog-article-1', getBlogArticle1RouteByLanguage],
	];
	for (const [slug, routeFn] of slugRouteMap) {
		if (pathPart === slug + '.html' || matchesSlugRoute(pathPart, slug)) {
			return routeFn(langSlug) + hashPart;
		}
	}
	if (pathPart === 'index-v1.html' || isHomeRoute(pathPart)) {
		return getHomeRouteByLanguage(langSlug) + hashPart;
	}
	return href;
}

function initLocalizedNavLinks() {
	const current = detectLanguageFromPath(window.location.pathname) || 'tc';
	const links = document.querySelectorAll('a[href]');
	links.forEach((link) => {
		const original = link.getAttribute('href') || '';
		const localized = localizeKnownNavHref(original, current);
		if (localized !== original) {
			link.setAttribute('href', localized);
		}
	});
}

function scrollToCurrentHashAnchor() {
	const rawHash = window.location.hash || '';
	if (!rawHash || rawHash === '#') return;
	const anchorId = decodeURIComponent(rawHash.slice(1)).trim();
	if (!anchorId) return;

	const tryScroll = () => {
		const target =
			document.getElementById(anchorId) ||
			document.querySelector(`[name="${anchorId}"]`) ||
			document.querySelector(`#${CSS.escape(anchorId)}`);
		if (!target) return false;
		target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		return true;
	};

	// Re-rendering and downstream scripts can shift layout after first paint.
	// Retry a few times so hash anchors reliably land on the intended section.
	if (tryScroll()) return;
	[80, 180, 350, 700].forEach((delay) => {
		window.setTimeout(() => {
			tryScroll();
		}, delay);
	});
}

function maybeRedirectToPreferredLanguage() {
	const pathname = window.location.pathname;
	if (isSystemPath(pathname)) return false;
	const pathLang = detectLanguageFromPath(pathname);
	if (pathLang) writePreferredLanguage(pathLang);
	const preferred = readPreferredLanguage();
	if (!preferred) return false;
	const targetPath = routePathForLanguage(pathname, preferred);
	if (normalizePath(targetPath) === normalizePath(pathname)) return false;
	window.location.replace(`${targetPath}${window.location.search || ''}${window.location.hash || ''}`);
	return true;
}

function getCurrentSlug(pathname) {
	if (isHomeRoute(pathname)) return 'home';
	const stripped = pathname.replace(/^\/(en|sc|tc)\//, '/').replace(/\/+$/, '') || '/';
	const knownSlugs = ['about-us', 'contact', 'seo-services', 'ai-seo-services', 'orm-services', 'sem-services', 'content-marketing-services', 'social-media-services', 'web-design-services', 'ecommerce-services', 'blog', 'blog-article-1'];
	for (const s of knownSlugs) {
		if (stripped === '/' + s) return s;
	}
	const parts = stripped.split('/').filter(Boolean);
	return parts.length ? parts[parts.length - 1] : '';
}

function getCurrentPageIdFromBody() {
	const m = (document.body.className || '').match(/\bpage-id-(\d+)\b/);
	return m ? Number(m[1]) : 0;
}

function getCurrentPostIdFromBody() {
	const m = (document.body.className || '').match(/\bpostid-(\d+)\b/);
	return m ? Number(m[1]) : 0;
}

function getAboutUsFallbackFile(langSlug) {
	if (langSlug === 'en') return 'about-us/about-us.en.json';
	if (langSlug === 'sc') return 'about-us/about-us.sc.json';
	return 'about-us/about-us.json';
}

function getSharedFallbackFile(langSlug) {
	if (langSlug === 'en') return 'shared/_shared.en.json';
	if (langSlug === 'sc') return 'shared/_shared.sc.json';
	return 'shared/_shared.json';
}

function getContactFallbackFile(langSlug) {
	if (langSlug === 'en') return 'contact/contact.en.json';
	if (langSlug === 'sc') return 'contact/contact.sc.json';
	return 'contact/contact.json';
}

function getSeoServicesFallbackFile(langSlug) {
	if (langSlug === 'en') return 'seo-services/seo-services.en.json';
	if (langSlug === 'sc') return 'seo-services/seo-services.sc.json';
	return 'seo-services/seo-services.json';
}

function getAiSeoServicesFallbackFile(langSlug) {
	if (langSlug === 'en') return 'ai-seo-services/ai-seo-services.en.json';
	if (langSlug === 'sc') return 'ai-seo-services/ai-seo-services.sc.json';
	return 'ai-seo-services/ai-seo-services.json';
}

function getOrmServicesFallbackFile(langSlug) {
	if (langSlug === 'en') return 'orm-services/orm-services.en.json';
	if (langSlug === 'sc') return 'orm-services/orm-services.sc.json';
	return 'orm-services/orm-services.json';
}

function getSemServicesFallbackFile(langSlug) {
	if (langSlug === 'en') return 'sem-services/sem-services.en.json';
	if (langSlug === 'sc') return 'sem-services/sem-services.sc.json';
	return 'sem-services/sem-services.json';
}

function getContentMarketingServicesFallbackFile(langSlug) {
	if (langSlug === 'en') return 'content-marketing-services/content-marketing-services.en.json';
	if (langSlug === 'sc') return 'content-marketing-services/content-marketing-services.sc.json';
	return 'content-marketing-services/content-marketing-services.json';
}

function getSocialMediaServicesFallbackFile(langSlug) {
	if (langSlug === 'en') return 'social-media-services/social-media-services.en.json';
	if (langSlug === 'sc') return 'social-media-services/social-media-services.sc.json';
	return 'social-media-services/social-media-services.json';
}

function getWebDesignServicesFallbackFile(langSlug) {
	if (langSlug === 'en') return 'web-design-services/web-design-services.en.json';
	if (langSlug === 'sc') return 'web-design-services/web-design-services.sc.json';
	return 'web-design-services/web-design-services.json';
}

function getEcommerceServicesFallbackFile(langSlug) {
	if (langSlug === 'en') return 'ecommerce-services/ecommerce-services.en.json';
	if (langSlug === 'sc') return 'ecommerce-services/ecommerce-services.sc.json';
	return 'ecommerce-services/ecommerce-services.json';
}

function getBlogFallbackFile(langSlug) {
	if (langSlug === 'en') return 'blog/blog.en.json';
	if (langSlug === 'sc') return 'blog/blog.sc.json';
	return 'blog/blog.json';
}

function getBlogArticle1FallbackFile(langSlug) {
	if (langSlug === 'en') return 'blog-article-1/blog-article-1.en.json';
	if (langSlug === 'sc') return 'blog-article-1/blog-article-1.sc.json';
	return 'blog-article-1/blog-article-1.json';
}

function getIndexFallbackFile(langSlug) {
	if (langSlug === 'en') return 'index/index.en.json';
	if (langSlug === 'sc') return 'index/index.sc.json';
	return 'index/index.json';
}

function initLanguageSwitcher() {
	const current = detectLanguageFromPath(window.location.pathname) || 'tc';
	const langByIndex = ['tc', 'en', 'sc'];
	const groups = document.querySelectorAll('.lang-toggle, .mobile-lang');
	groups.forEach((group) => {
		const nodes = group.querySelectorAll('.lang-btn');
		nodes.forEach((node, index) => {
			const lang = node.getAttribute('data-lang') || langByIndex[index] || '';
			if (!lang) return;

			node.setAttribute('data-lang', lang);
			const targetPath = routePathForLanguage(window.location.pathname, lang);
			if (node.tagName.toLowerCase() === 'a') {
				node.setAttribute('href', targetPath);
			}

			if (lang === current) {
				node.classList.add('active');
			} else {
				node.classList.remove('active');
			}

			if (node.getAttribute('data-lang-bound') === '1') return;
			node.setAttribute('data-lang-bound', '1');
			node.addEventListener('click', (e) => {
				writePreferredLanguage(lang);
				if (node.tagName.toLowerCase() !== 'a') {
					e.preventDefault();
					window.location.assign(targetPath);
				}
			});
		});
	});
}


async function fetchAboutUsPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getAboutUsFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/about-us/about-us.json`);
		} catch (_) {}
	}

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				const m = page.meta || {};
				const f = fallback || {};
				return {
					meta: {
						title: getYoastTitle(page, 'about_meta_title', m, page.title?.rendered || (f.meta && f.meta.title) || ''),
						description: getYoastDescription(page, 'about_meta_description', m, stripTags(page.excerpt?.rendered || '') || (f.meta && f.meta.description) || ''),
					},
					hero: {
						tag: metaOrFallback(m, 'hero_tag', f.hero?.tag),
						title1: metaOrFallback(m, 'hero_title1', f.hero?.title1),
						title2: metaOrFallback(m, 'hero_title2', f.hero?.title2),
						subtitle: metaOrFallback(m, 'hero_subtitle', f.hero?.subtitle),
						scroll_text: metaOrFallback(m, 'hero_scroll_text', f.hero?.scroll_text),
						back_home: metaOrFallback(m, 'hero_back_home', f.hero?.back_home),
					},
					intro: {
						title: metaOrFallback(m, 'intro_title', f.intro?.title),
						body: metaOrFallback(m, 'intro_body', f.intro?.body),
					},
					mission: {
						label: metaOrFallback(m, 'mission_label', f.mission?.label),
						title_line1: metaOrFallback(m, 'mission_title_line1', f.mission?.title_line1),
						title_highlight: metaOrFallback(m, 'mission_title_highlight', f.mission?.title_highlight),
						body: metaOrFallback(m, 'mission_body', f.mission?.body),
						services_intro: metaOrFallback(m, 'mission_services_intro', f.mission?.services_intro),
						services: {
							ai_seo: metaOrFallback(m, 'mission_services_ai_seo', f.mission?.services?.ai_seo),
							seo: metaOrFallback(m, 'mission_services_seo', f.mission?.services?.seo),
							sem: metaOrFallback(m, 'mission_services_sem', f.mission?.services?.sem),
							web: metaOrFallback(m, 'mission_services_web', f.mission?.services?.web),
							more: metaOrFallback(m, 'mission_services_more', f.mission?.services?.more),
						},
						cta: {
							prefix: metaOrFallback(m, 'mission_cta_prefix', f.mission?.cta?.prefix),
							sep: metaOrFallback(m, 'mission_cta_sep', f.mission?.cta?.sep),
							startup: metaOrFallback(m, 'mission_cta_startup', f.mission?.cta?.startup),
							sme: metaOrFallback(m, 'mission_cta_sme', f.mission?.cta?.sme),
							or: metaOrFallback(m, 'mission_cta_or', f.mission?.cta?.or),
							enterprise: metaOrFallback(m, 'mission_cta_enterprise', f.mission?.cta?.enterprise),
							comma: metaOrFallback(m, 'mission_cta_comma', f.mission?.cta?.comma),
							suffix: metaOrFallback(m, 'mission_cta_suffix', f.mission?.cta?.suffix),
						},
					},
					values: {
						label: metaOrFallback(m, 'values_label', f.values?.label),
						title_line1: metaOrFallback(m, 'values_title_line1', f.values?.title_line1),
						title_highlight: metaOrFallback(m, 'values_title_highlight', f.values?.title_highlight),
						partner_intro_title_prefix: metaOrFallback(m, 'values_partner_intro_title_prefix', f.values?.partner_intro_title_prefix),
						partner_intro_google_text: metaOrFallback(m, 'values_partner_intro_google_text', f.values?.partner_intro_google_text),
						partner_intro_title_suffix: metaOrFallback(m, 'values_partner_intro_title_suffix', f.values?.partner_intro_title_suffix),
						partner_intro_body_line1: metaOrFallback(m, 'values_partner_intro_body_line1', f.values?.partner_intro_body_line1),
						partner_intro_body_line2: metaOrFallback(m, 'values_partner_intro_body_line2', f.values?.partner_intro_body_line2),
						benefits: {
							benefit1: {
								title: metaOrFallback(m, 'values_benefit1_title', f.values?.benefits?.benefit1?.title),
								desc: metaOrFallback(m, 'values_benefit1_desc', f.values?.benefits?.benefit1?.desc),
							},
							benefit2: {
								title: metaOrFallback(m, 'values_benefit2_title', f.values?.benefits?.benefit2?.title),
								desc: metaOrFallback(m, 'values_benefit2_desc', f.values?.benefits?.benefit2?.desc),
							},
							benefit3: {
								title: metaOrFallback(m, 'values_benefit3_title', f.values?.benefits?.benefit3?.title),
								desc: metaOrFallback(m, 'values_benefit3_desc', f.values?.benefits?.benefit3?.desc),
							},
						},
					},
					why_partner: {
						label: metaOrFallback(m, 'why_partner_label', f.why_partner?.label),
						title_line1: metaOrFallback(m, 'why_partner_title_line1', f.why_partner?.title_line1),
						title_highlight: metaOrFallback(m, 'why_partner_title_highlight', f.why_partner?.title_highlight),
						desc_line1: metaOrFallback(m, 'why_partner_desc_line1', f.why_partner?.desc_line1),
						desc_mid: metaOrFallback(m, 'why_partner_desc_mid', f.why_partner?.desc_mid),
						desc_line2: metaOrFallback(m, 'why_partner_desc_line2', f.why_partner?.desc_line2),
						desc_tail: metaOrFallback(m, 'why_partner_desc_tail', f.why_partner?.desc_tail),
						advantages: {
							adv1: {
								title: metaOrFallback(m, 'why_partner_adv1_title', f.why_partner?.advantages?.adv1?.title),
								desc: metaOrFallback(m, 'why_partner_adv1_desc', f.why_partner?.advantages?.adv1?.desc),
							},
							adv2: {
								title: metaOrFallback(m, 'why_partner_adv2_title', f.why_partner?.advantages?.adv2?.title),
								desc: metaOrFallback(m, 'why_partner_adv2_desc', f.why_partner?.advantages?.adv2?.desc),
							},
							adv3: {
								title: metaOrFallback(m, 'why_partner_adv3_title', f.why_partner?.advantages?.adv3?.title),
								desc: metaOrFallback(m, 'why_partner_adv3_desc', f.why_partner?.advantages?.adv3?.desc),
							},
							adv4: {
								title: metaOrFallback(m, 'why_partner_adv4_title', f.why_partner?.advantages?.adv4?.title),
								desc: metaOrFallback(m, 'why_partner_adv4_desc', f.why_partner?.advantages?.adv4?.desc),
							},
						},
					},
					cta: {
						title: metaOrFallback(m, 'cta_title', f.cta?.title),
						desc: metaOrFallback(m, 'cta_desc', f.cta?.desc),
						primary_btn: metaOrFallback(m, 'cta_primary_btn', f.cta?.primary_btn),
						secondary_btn: metaOrFallback(m, 'cta_secondary_btn', f.cta?.secondary_btn),
					},
				};
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'about-us';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			// Fallback for setups where lang filtering is unavailable.
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'about-us') {
			// Final fallback to canonical slug.
			res = await fetch(`/wp-json/wp/v2/pages?slug=about-us${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "about-us"');
		}
		const page = pages[0];
		const m = page.meta || {};
		const f = fallback || {};

		return {
			meta: {
				title: getYoastTitle(page, 'about_meta_title', m, page.title?.rendered || (f.meta && f.meta.title) || ''),
				description: getYoastDescription(page, 'about_meta_description', m, stripTags(page.excerpt?.rendered || '') || (f.meta && f.meta.description) || ''),
			},
			hero: {
				tag: metaOrFallback(m, 'hero_tag', f.hero?.tag),
				title1: metaOrFallback(m, 'hero_title1', f.hero?.title1),
				title2: metaOrFallback(m, 'hero_title2', f.hero?.title2),
				subtitle: metaOrFallback(m, 'hero_subtitle', f.hero?.subtitle),
				scroll_text: metaOrFallback(m, 'hero_scroll_text', f.hero?.scroll_text),
				back_home: metaOrFallback(m, 'hero_back_home', f.hero?.back_home),
			},
			intro: {
				title: metaOrFallback(m, 'intro_title', f.intro?.title),
				body: metaOrFallback(m, 'intro_body', f.intro?.body),
			},
			mission: {
				label: metaOrFallback(m, 'mission_label', f.mission?.label),
				title_line1: metaOrFallback(m, 'mission_title_line1', f.mission?.title_line1),
				title_highlight: metaOrFallback(m, 'mission_title_highlight', f.mission?.title_highlight),
				body: metaOrFallback(m, 'mission_body', f.mission?.body),
				services_intro: metaOrFallback(m, 'mission_services_intro', f.mission?.services_intro),
				services: {
					ai_seo: metaOrFallback(m, 'mission_services_ai_seo', f.mission?.services?.ai_seo),
					seo: metaOrFallback(m, 'mission_services_seo', f.mission?.services?.seo),
					sem: metaOrFallback(m, 'mission_services_sem', f.mission?.services?.sem),
					web: metaOrFallback(m, 'mission_services_web', f.mission?.services?.web),
					more: metaOrFallback(m, 'mission_services_more', f.mission?.services?.more),
				},
				cta: {
					prefix: metaOrFallback(m, 'mission_cta_prefix', f.mission?.cta?.prefix),
					sep: metaOrFallback(m, 'mission_cta_sep', f.mission?.cta?.sep),
					startup: metaOrFallback(m, 'mission_cta_startup', f.mission?.cta?.startup),
					sme: metaOrFallback(m, 'mission_cta_sme', f.mission?.cta?.sme),
					or: metaOrFallback(m, 'mission_cta_or', f.mission?.cta?.or),
					enterprise: metaOrFallback(m, 'mission_cta_enterprise', f.mission?.cta?.enterprise),
					comma: metaOrFallback(m, 'mission_cta_comma', f.mission?.cta?.comma),
					suffix: metaOrFallback(m, 'mission_cta_suffix', f.mission?.cta?.suffix),
				},
			},
			values: {
				label: metaOrFallback(m, 'values_label', f.values?.label),
				title_line1: metaOrFallback(m, 'values_title_line1', f.values?.title_line1),
				title_highlight: metaOrFallback(m, 'values_title_highlight', f.values?.title_highlight),
				partner_intro_title_prefix: metaOrFallback(m, 'values_partner_intro_title_prefix', f.values?.partner_intro_title_prefix),
				partner_intro_google_text: metaOrFallback(m, 'values_partner_intro_google_text', f.values?.partner_intro_google_text),
				partner_intro_title_suffix: metaOrFallback(m, 'values_partner_intro_title_suffix', f.values?.partner_intro_title_suffix),
				partner_intro_body_line1: metaOrFallback(m, 'values_partner_intro_body_line1', f.values?.partner_intro_body_line1),
				partner_intro_body_line2: metaOrFallback(m, 'values_partner_intro_body_line2', f.values?.partner_intro_body_line2),
				benefits: {
					benefit1: {
						title: metaOrFallback(m, 'values_benefit1_title', f.values?.benefits?.benefit1?.title),
						desc: metaOrFallback(m, 'values_benefit1_desc', f.values?.benefits?.benefit1?.desc),
					},
					benefit2: {
						title: metaOrFallback(m, 'values_benefit2_title', f.values?.benefits?.benefit2?.title),
						desc: metaOrFallback(m, 'values_benefit2_desc', f.values?.benefits?.benefit2?.desc),
					},
					benefit3: {
						title: metaOrFallback(m, 'values_benefit3_title', f.values?.benefits?.benefit3?.title),
						desc: metaOrFallback(m, 'values_benefit3_desc', f.values?.benefits?.benefit3?.desc),
					},
				},
			},
			why_partner: {
				label: metaOrFallback(m, 'why_partner_label', f.why_partner?.label),
				title_line1: metaOrFallback(m, 'why_partner_title_line1', f.why_partner?.title_line1),
				title_highlight: metaOrFallback(m, 'why_partner_title_highlight', f.why_partner?.title_highlight),
				desc_line1: metaOrFallback(m, 'why_partner_desc_line1', f.why_partner?.desc_line1),
				desc_mid: metaOrFallback(m, 'why_partner_desc_mid', f.why_partner?.desc_mid),
				desc_line2: metaOrFallback(m, 'why_partner_desc_line2', f.why_partner?.desc_line2),
				desc_tail: metaOrFallback(m, 'why_partner_desc_tail', f.why_partner?.desc_tail),
				advantages: {
					adv1: {
						title: metaOrFallback(m, 'why_partner_adv1_title', f.why_partner?.advantages?.adv1?.title),
						desc: metaOrFallback(m, 'why_partner_adv1_desc', f.why_partner?.advantages?.adv1?.desc),
					},
					adv2: {
						title: metaOrFallback(m, 'why_partner_adv2_title', f.why_partner?.advantages?.adv2?.title),
						desc: metaOrFallback(m, 'why_partner_adv2_desc', f.why_partner?.advantages?.adv2?.desc),
					},
					adv3: {
						title: metaOrFallback(m, 'why_partner_adv3_title', f.why_partner?.advantages?.adv3?.title),
						desc: metaOrFallback(m, 'why_partner_adv3_desc', f.why_partner?.advantages?.adv3?.desc),
					},
					adv4: {
						title: metaOrFallback(m, 'why_partner_adv4_title', f.why_partner?.advantages?.adv4?.title),
						desc: metaOrFallback(m, 'why_partner_adv4_desc', f.why_partner?.advantages?.adv4?.desc),
					},
				},
			},
			cta: {
				title: metaOrFallback(m, 'cta_title', f.cta?.title),
				desc: metaOrFallback(m, 'cta_desc', f.cta?.desc),
				primary_btn: metaOrFallback(m, 'cta_primary_btn', f.cta?.primary_btn),
				secondary_btn: metaOrFallback(m, 'cta_secondary_btn', f.cta?.secondary_btn),
			},
		};
	} catch (err) {
		console.warn('Falling back to step4 about-us.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/about-us/about-us.json`);
	}
}

async function fetchContactPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getContactFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/contact/contact.json`);
		} catch (_) {}
	}

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				const m = page.meta || {};
				const f = fallback || {};
				return {
					meta: {
						title: getYoastTitle(page, 'contact_meta_title', m, page.title?.rendered || (f.meta && f.meta.title) || ''),
						description: getYoastDescription(page, 'contact_meta_description', m, stripTags(page.excerpt?.rendered || '') || (f.meta && f.meta.description) || ''),
					},
					hero: {
						back_home: metaOrFallback(m, 'contact_hero_back_home', f.hero?.back_home),
						tag: metaOrFallback(m, 'contact_hero_tag', f.hero?.tag),
						title: metaOrFallback(m, 'contact_hero_title', f.hero?.title),
						subtitle: metaOrFallback(m, 'contact_hero_subtitle', f.hero?.subtitle),
						scroll_text: metaOrFallback(m, 'contact_hero_scroll_text', f.hero?.scroll_text),
					},
					intro: {
						title_line1: metaOrFallback(m, 'contact_intro_title_line1', f.intro?.title_line1),
						title_highlight: metaOrFallback(m, 'contact_intro_title_highlight', f.intro?.title_highlight),
						consult_title: metaOrFallback(m, 'contact_intro_consult_title', f.intro?.consult_title),
						consult_body: metaOrFallback(m, 'contact_intro_consult_body', f.intro?.consult_body),
					},
					benefits: {
						reply_24h: metaOrFallback(m, 'contact_benefits_reply_24h', f.benefits?.reply_24h),
						increase_traffic: metaOrFallback(m, 'contact_benefits_increase_traffic', f.benefits?.increase_traffic),
						sales_target: metaOrFallback(m, 'contact_benefits_sales_target', f.benefits?.sales_target),
					},
					form: {
						title: metaOrFallback(m, 'contact_form_title', f.form?.title),
						name_label: metaOrFallback(m, 'contact_form_name_label', f.form?.name_label),
						name_placeholder: metaOrFallback(m, 'contact_form_name_placeholder', f.form?.name_placeholder),
						phone_label: metaOrFallback(m, 'contact_form_phone_label', f.form?.phone_label),
						phone_placeholder: metaOrFallback(m, 'contact_form_phone_placeholder', f.form?.phone_placeholder),
						email_label: metaOrFallback(m, 'contact_form_email_label', f.form?.email_label),
						email_placeholder: metaOrFallback(m, 'contact_form_email_placeholder', f.form?.email_placeholder),
						company_label: metaOrFallback(m, 'contact_form_company_label', f.form?.company_label),
						company_placeholder: metaOrFallback(m, 'contact_form_company_placeholder', f.form?.company_placeholder),
						website_label: metaOrFallback(m, 'contact_form_website_label', f.form?.website_label),
						website_placeholder: metaOrFallback(m, 'contact_form_website_placeholder', f.form?.website_placeholder),
						subject_label: metaOrFallback(m, 'contact_form_subject_label', f.form?.subject_label),
						subject_placeholder: metaOrFallback(m, 'contact_form_subject_placeholder', f.form?.subject_placeholder),
						subject_options: {
							ai_seo: metaOrFallback(m, 'contact_form_subject_option_ai_seo', f.form?.subject_options?.ai_seo),
							seo: metaOrFallback(m, 'contact_form_subject_option_seo', f.form?.subject_options?.seo),
							sem: metaOrFallback(m, 'contact_form_subject_option_sem', f.form?.subject_options?.sem),
							social: metaOrFallback(m, 'contact_form_subject_option_social', f.form?.subject_options?.social),
							web: metaOrFallback(m, 'contact_form_subject_option_web', f.form?.subject_options?.web),
							other: metaOrFallback(m, 'contact_form_subject_option_other', f.form?.subject_options?.other),
						},
						message_label: metaOrFallback(m, 'contact_form_message_label', f.form?.message_label),
						message_placeholder: metaOrFallback(m, 'contact_form_message_placeholder', f.form?.message_placeholder),
						submit_btn: metaOrFallback(m, 'contact_form_submit_btn', f.form?.submit_btn),
						note: metaOrFallback(m, 'contact_form_note', f.form?.note),
					},
					location: {
						map_embed_src: metaOrFallback(m, 'contact_location_map_embed_src', f.location?.map_embed_src),
						section_title: metaOrFallback(m, 'contact_location_section_title', f.location?.section_title),
						details: {
							address: {
								label: metaOrFallback(m, 'contact_location_address_label', f.location?.details?.address?.label),
								value_html: metaOrFallback(m, 'contact_location_address_value_html', f.location?.details?.address?.value_html),
							},
							phone: {
								label: metaOrFallback(m, 'contact_location_phone_label', f.location?.details?.phone?.label),
								value_line1: metaOrFallback(m, 'contact_location_phone_value_line1', f.location?.details?.phone?.value_line1),
								value_line2: metaOrFallback(m, 'contact_location_phone_value_line2', f.location?.details?.phone?.value_line2),
							},
							wechat: {
								label: metaOrFallback(m, 'contact_location_wechat_label', f.location?.details?.wechat?.label),
								value: metaOrFallback(m, 'contact_location_wechat_value', f.location?.details?.wechat?.value),
							},
							email: {
								label: metaOrFallback(m, 'contact_location_email_label', f.location?.details?.email?.label),
								value: metaOrFallback(m, 'contact_location_email_value', f.location?.details?.email?.value),
							},
						},
						social: {
							title: metaOrFallback(m, 'contact_social_title', f.location?.social?.title),
							facebook_aria: metaOrFallback(m, 'contact_social_facebook_aria', f.location?.social?.facebook_aria),
							facebook_text: metaOrFallback(m, 'contact_social_facebook_text', f.location?.social?.facebook_text),
							instagram_aria: metaOrFallback(m, 'contact_social_instagram_aria', f.location?.social?.instagram_aria),
							instagram_text: metaOrFallback(m, 'contact_social_instagram_text', f.location?.social?.instagram_text),
							linkedin_aria: metaOrFallback(m, 'contact_social_linkedin_aria', f.location?.social?.linkedin_aria),
							linkedin_text: metaOrFallback(m, 'contact_social_linkedin_text', f.location?.social?.linkedin_text),
						},
					},
				};
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'contact';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'contact') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=contact${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "contact"');
		}

		const page = pages[0];
		const m = page.meta || {};
		const f = fallback || {};
		return {
			meta: {
				title: getYoastTitle(page, 'contact_meta_title', m, page.title?.rendered || (f.meta && f.meta.title) || ''),
				description: getYoastDescription(page, 'contact_meta_description', m, stripTags(page.excerpt?.rendered || '') || (f.meta && f.meta.description) || ''),
			},
			hero: {
				back_home: metaOrFallback(m, 'contact_hero_back_home', f.hero?.back_home),
				tag: metaOrFallback(m, 'contact_hero_tag', f.hero?.tag),
				title: metaOrFallback(m, 'contact_hero_title', f.hero?.title),
				subtitle: metaOrFallback(m, 'contact_hero_subtitle', f.hero?.subtitle),
				scroll_text: metaOrFallback(m, 'contact_hero_scroll_text', f.hero?.scroll_text),
			},
			intro: {
				title_line1: metaOrFallback(m, 'contact_intro_title_line1', f.intro?.title_line1),
				title_highlight: metaOrFallback(m, 'contact_intro_title_highlight', f.intro?.title_highlight),
				consult_title: metaOrFallback(m, 'contact_intro_consult_title', f.intro?.consult_title),
				consult_body: metaOrFallback(m, 'contact_intro_consult_body', f.intro?.consult_body),
			},
			benefits: {
				reply_24h: metaOrFallback(m, 'contact_benefits_reply_24h', f.benefits?.reply_24h),
				increase_traffic: metaOrFallback(m, 'contact_benefits_increase_traffic', f.benefits?.increase_traffic),
				sales_target: metaOrFallback(m, 'contact_benefits_sales_target', f.benefits?.sales_target),
			},
			form: {
				title: metaOrFallback(m, 'contact_form_title', f.form?.title),
				name_label: metaOrFallback(m, 'contact_form_name_label', f.form?.name_label),
				name_placeholder: metaOrFallback(m, 'contact_form_name_placeholder', f.form?.name_placeholder),
				phone_label: metaOrFallback(m, 'contact_form_phone_label', f.form?.phone_label),
				phone_placeholder: metaOrFallback(m, 'contact_form_phone_placeholder', f.form?.phone_placeholder),
				email_label: metaOrFallback(m, 'contact_form_email_label', f.form?.email_label),
				email_placeholder: metaOrFallback(m, 'contact_form_email_placeholder', f.form?.email_placeholder),
				company_label: metaOrFallback(m, 'contact_form_company_label', f.form?.company_label),
				company_placeholder: metaOrFallback(m, 'contact_form_company_placeholder', f.form?.company_placeholder),
				website_label: metaOrFallback(m, 'contact_form_website_label', f.form?.website_label),
				website_placeholder: metaOrFallback(m, 'contact_form_website_placeholder', f.form?.website_placeholder),
				subject_label: metaOrFallback(m, 'contact_form_subject_label', f.form?.subject_label),
				subject_placeholder: metaOrFallback(m, 'contact_form_subject_placeholder', f.form?.subject_placeholder),
				subject_options: {
					ai_seo: metaOrFallback(m, 'contact_form_subject_option_ai_seo', f.form?.subject_options?.ai_seo),
					seo: metaOrFallback(m, 'contact_form_subject_option_seo', f.form?.subject_options?.seo),
					sem: metaOrFallback(m, 'contact_form_subject_option_sem', f.form?.subject_options?.sem),
					social: metaOrFallback(m, 'contact_form_subject_option_social', f.form?.subject_options?.social),
					web: metaOrFallback(m, 'contact_form_subject_option_web', f.form?.subject_options?.web),
					other: metaOrFallback(m, 'contact_form_subject_option_other', f.form?.subject_options?.other),
				},
				message_label: metaOrFallback(m, 'contact_form_message_label', f.form?.message_label),
				message_placeholder: metaOrFallback(m, 'contact_form_message_placeholder', f.form?.message_placeholder),
				submit_btn: metaOrFallback(m, 'contact_form_submit_btn', f.form?.submit_btn),
				note: metaOrFallback(m, 'contact_form_note', f.form?.note),
			},
			location: {
				map_embed_src: metaOrFallback(m, 'contact_location_map_embed_src', f.location?.map_embed_src),
				section_title: metaOrFallback(m, 'contact_location_section_title', f.location?.section_title),
				details: {
					address: {
						label: metaOrFallback(m, 'contact_location_address_label', f.location?.details?.address?.label),
						value_html: metaOrFallback(m, 'contact_location_address_value_html', f.location?.details?.address?.value_html),
					},
					phone: {
						label: metaOrFallback(m, 'contact_location_phone_label', f.location?.details?.phone?.label),
						value_line1: metaOrFallback(m, 'contact_location_phone_value_line1', f.location?.details?.phone?.value_line1),
						value_line2: metaOrFallback(m, 'contact_location_phone_value_line2', f.location?.details?.phone?.value_line2),
					},
					wechat: {
						label: metaOrFallback(m, 'contact_location_wechat_label', f.location?.details?.wechat?.label),
						value: metaOrFallback(m, 'contact_location_wechat_value', f.location?.details?.wechat?.value),
					},
					email: {
						label: metaOrFallback(m, 'contact_location_email_label', f.location?.details?.email?.label),
						value: metaOrFallback(m, 'contact_location_email_value', f.location?.details?.email?.value),
					},
				},
				social: {
					title: metaOrFallback(m, 'contact_social_title', f.location?.social?.title),
					facebook_aria: metaOrFallback(m, 'contact_social_facebook_aria', f.location?.social?.facebook_aria),
					facebook_text: metaOrFallback(m, 'contact_social_facebook_text', f.location?.social?.facebook_text),
					instagram_aria: metaOrFallback(m, 'contact_social_instagram_aria', f.location?.social?.instagram_aria),
					instagram_text: metaOrFallback(m, 'contact_social_instagram_text', f.location?.social?.instagram_text),
					linkedin_aria: metaOrFallback(m, 'contact_social_linkedin_aria', f.location?.social?.linkedin_aria),
					linkedin_text: metaOrFallback(m, 'contact_social_linkedin_text', f.location?.social?.linkedin_text),
				},
			},
		};
	} catch (err) {
		console.warn('Falling back to step4 contact.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/contact/contact.json`);
	}
}

async function fetchSeoServicesPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getSeoServicesFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/seo-services/seo-services.json`);
		} catch (_) {}
	}

	const build = (page, meta) => {
		const merged = applyPrefixedMetaOntoFallback(meta || {}, fallback || {}, 'seo_services');
		if (!merged.meta) merged.meta = {};
		merged.meta.title = getYoastTitle(page, 'seo_services_meta_title', meta, page.title?.rendered || merged.meta.title || '');
		merged.meta.description = getYoastDescription(page, 'seo_services_meta_description', meta, stripTags(page.excerpt?.rendered || '') || merged.meta.description || '');
		return merged;
	};

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				return build(page, page.meta || {});
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'seo-services';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'seo-services') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=seo-services${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "seo-services"');
		}
		return build(pages[0], pages[0].meta || {});
	} catch (err) {
		console.warn('Falling back to step4 seo-services.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/seo-services/seo-services.json`);
	}
}

async function fetchAiSeoServicesPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getAiSeoServicesFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/ai-seo-services/ai-seo-services.json`);
		} catch (_) {}
	}

	const build = (page, meta) => {
		const merged = applyPrefixedMetaOntoFallback(meta || {}, fallback || {}, 'ai_seo_services');
		if (!merged.meta) merged.meta = {};
		merged.meta.title = getYoastTitle(page, 'ai_seo_services_meta_title', meta, page.title?.rendered || merged.meta.title || '');
		merged.meta.description = getYoastDescription(page, 'ai_seo_services_meta_description', meta, stripTags(page.excerpt?.rendered || '') || merged.meta.description || '');
		return merged;
	};

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				return build(page, page.meta || {});
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'ai-seo-services';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'ai-seo-services') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=ai-seo-services${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "ai-seo-services"');
		}
		return build(pages[0], pages[0].meta || {});
	} catch (err) {
		console.warn('Falling back to step4 ai-seo-services.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/ai-seo-services/ai-seo-services.json`);
	}
}

async function fetchOrmServicesPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getOrmServicesFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/orm-services/orm-services.json`);
		} catch (_) {}
	}

	const build = (page, meta) => {
		const merged = applyPrefixedMetaOntoFallback(meta || {}, fallback || {}, 'orm_services');
		if (!merged.meta) merged.meta = {};
		merged.meta.title = getYoastTitle(page, 'orm_services_meta_title', meta, page.title?.rendered || merged.meta.title || '');
		merged.meta.description = getYoastDescription(page, 'orm_services_meta_description', meta, stripTags(page.excerpt?.rendered || '') || merged.meta.description || '');
		return merged;
	};

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				return build(page, page.meta || {});
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'orm-services';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'orm-services') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=orm-services${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "orm-services"');
		}
		return build(pages[0], pages[0].meta || {});
	} catch (err) {
		console.warn('Falling back to step4 orm-services.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/orm-services/orm-services.json`);
	}
}

async function fetchSemServicesPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getSemServicesFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/sem-services/sem-services.json`);
		} catch (_) {}
	}

	const build = (page, meta) => {
		const merged = applyPrefixedMetaOntoFallback(meta || {}, fallback || {}, 'sem_services');
		if (!merged.meta) merged.meta = {};
		merged.meta.title = getYoastTitle(page, 'sem_services_meta_title', meta, page.title?.rendered || merged.meta.title || '');
		merged.meta.description = getYoastDescription(page, 'sem_services_meta_description', meta, stripTags(page.excerpt?.rendered || '') || merged.meta.description || '');
		return merged;
	};

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				return build(page, page.meta || {});
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'sem-services';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'sem-services') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=sem-services${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "sem-services"');
		}
		return build(pages[0], pages[0].meta || {});
	} catch (err) {
		console.warn('Falling back to step4 sem-services.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/sem-services/sem-services.json`);
	}
}

async function fetchContentMarketingServicesPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getContentMarketingServicesFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/content-marketing-services/content-marketing-services.json`);
		} catch (_) {}
	}

	const build = (page, meta) => {
		const merged = applyPrefixedMetaOntoFallback(meta || {}, fallback || {}, 'content_marketing_services');
		if (!merged.meta) merged.meta = {};
		merged.meta.title = getYoastTitle(page, 'content_marketing_services_meta_title', meta, page.title?.rendered || merged.meta.title || '');
		merged.meta.description = getYoastDescription(page, 'content_marketing_services_meta_description', meta, stripTags(page.excerpt?.rendered || '') || merged.meta.description || '');
		return merged;
	};

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				return build(page, page.meta || {});
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'content-marketing-services';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'content-marketing-services') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=content-marketing-services${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "content-marketing-services"');
		}
		return build(pages[0], pages[0].meta || {});
	} catch (err) {
		console.warn('Falling back to step4 content-marketing-services.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/content-marketing-services/content-marketing-services.json`);
	}
}

async function fetchSocialMediaServicesPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getSocialMediaServicesFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/social-media-services/social-media-services.json`);
		} catch (_) {}
	}

	const build = (page, meta) => {
		const merged = applyPrefixedMetaOntoFallback(meta || {}, fallback || {}, 'social_media_services');
		if (!merged.meta) merged.meta = {};
		merged.meta.title = getYoastTitle(page, 'social_media_services_meta_title', meta, page.title?.rendered || merged.meta.title || '');
		merged.meta.description = getYoastDescription(page, 'social_media_services_meta_description', meta, stripTags(page.excerpt?.rendered || '') || merged.meta.description || '');
		return merged;
	};

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				return build(page, page.meta || {});
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'social-media-services';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'social-media-services') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=social-media-services${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "social-media-services"');
		}
		return build(pages[0], pages[0].meta || {});
	} catch (err) {
		console.warn('Falling back to step4 social-media-services.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/social-media-services/social-media-services.json`);
	}
}

async function fetchWebDesignServicesPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getWebDesignServicesFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/web-design-services/web-design-services.json`);
		} catch (_) {}
	}

	const build = (page, meta) => {
		const merged = applyPrefixedMetaOntoFallback(meta || {}, fallback || {}, 'web_design_services');
		if (!merged.meta) merged.meta = {};
		merged.meta.title = getYoastTitle(page, 'web_design_services_meta_title', meta, page.title?.rendered || merged.meta.title || '');
		merged.meta.description = getYoastDescription(page, 'web_design_services_meta_description', meta, stripTags(page.excerpt?.rendered || '') || merged.meta.description || '');
		return merged;
	};

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				return build(page, page.meta || {});
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'web-design-services';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'web-design-services') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=web-design-services${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "web-design-services"');
		}
		return build(pages[0], pages[0].meta || {});
	} catch (err) {
		console.warn('Falling back to step4 web-design-services.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/web-design-services/web-design-services.json`);
	}
}

async function fetchEcommerceServicesPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getEcommerceServicesFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/ecommerce-services/ecommerce-services.json`);
		} catch (_) {}
	}

	const build = (page, meta) => {
		const merged = applyPrefixedMetaOntoFallback(meta || {}, fallback || {}, 'ecommerce_services');
		if (!merged.meta) merged.meta = {};
		merged.meta.title = getYoastTitle(page, 'ecommerce_services_meta_title', meta, page.title?.rendered || merged.meta.title || '');
		merged.meta.description = getYoastDescription(page, 'ecommerce_services_meta_description', meta, stripTags(page.excerpt?.rendered || '') || merged.meta.description || '');
		return merged;
	};

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				return build(page, page.meta || {});
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'ecommerce-services';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'ecommerce-services') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=ecommerce-services${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "ecommerce-services"');
		}
		return build(pages[0], pages[0].meta || {});
	} catch (err) {
		console.warn('Falling back to step4 ecommerce-services.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/ecommerce-services/ecommerce-services.json`);
	}
}

async function fetchBlogPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getBlogFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/blog/blog.json`);
		} catch (_) {}
	}

	const build = (page, meta) => {
		const merged = applyPrefixedMetaOntoFallback(meta || {}, fallback || {}, 'blog');
		if (!merged.meta) merged.meta = {};
		merged.meta.title = getYoastTitle(page, 'blog_meta_title', meta, page.title?.rendered || merged.meta.title || '');
		merged.meta.description = getYoastDescription(page, 'blog_meta_description', meta, stripTags(page.excerpt?.rendered || '') || merged.meta.description || '');
		return merged;
	};

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				return build(page, page.meta || {});
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'blog';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'blog') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=blog${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "blog"');
		}
		return build(pages[0], pages[0].meta || {});
	} catch (err) {
		console.warn('Falling back to step4 blog.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/blog/blog.json`);
	}
}

async function fetchBlogArticle1PageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getBlogArticle1FallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/blog-article-1/blog-article-1.json`);
		} catch (_) {}
	}

	const build = (page, meta) => {
		const merged = applyPrefixedMetaOntoFallback(meta || {}, fallback || {}, 'blog_article_1');
		if (!merged.meta) merged.meta = {};
		merged.meta.title = getYoastTitle(page, 'blog_article_1_meta_title', meta, page.title?.rendered || merged.meta.title || '');
		merged.meta.description = getYoastDescription(page, 'blog_article_1_meta_description', meta, stripTags(page.excerpt?.rendered || '') || merged.meta.description || '');
		return merged;
	};

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				return build(page, page.meta || {});
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'blog-article-1';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) {
			pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'blog-article-1') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=blog-article-1${query}`);
			if (res.ok) {
				pages = await res.json();
			}
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) {
			throw new Error('No page found for slug "blog-article-1"');
		}
		return build(pages[0], pages[0].meta || {});
	} catch (err) {
		console.warn('Falling back to step4 blog-article-1.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/blog-article-1/blog-article-1.json`);
	}
}

async function fetchIndexPageJson(langSlug, pageSlug, pageId = 0) {
	let fallback = null;
	try {
		fallback = await fetchJSON(`${STEP4_BASE}/pages/${getIndexFallbackFile(langSlug)}`);
	} catch (_) {}
	if (!fallback) {
		try {
			fallback = await fetchJSON(`${STEP4_BASE}/pages/index/index.json`);
		} catch (_) {}
	}

	const build = (page, meta) => {
		const merged = applyPrefixedMetaOntoFallback(meta || {}, fallback || {}, 'index');
		if (!merged.meta) merged.meta = {};
		merged.meta.title = getYoastTitle(page, 'index_meta_title', meta, page.title?.rendered || merged.meta.title || '');
		merged.meta.description = getYoastDescription(page, 'index_meta_description', meta, stripTags(page.excerpt?.rendered || '') || merged.meta.description || '');
		return merged;
	};

	try {
		if (pageId) {
			const byId = await fetch(`/wp-json/wp/v2/pages/${pageId}`);
			if (byId.ok) {
				const page = await byId.json();
				return build(page, page.meta || {});
			}
		}

		const query = langSlug ? `&lang=${encodeURIComponent(langSlug)}` : '';
		const effectiveSlug = pageSlug || 'home';
		let res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}${query}`);
		let pages = [];
		if (res.ok) pages = await res.json();
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && langSlug) {
			res = await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(effectiveSlug)}`);
			if (res.ok) pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'index') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=index${query}`);
			if (res.ok) pages = await res.json();
		}
		if ((!res.ok || !Array.isArray(pages) || pages.length === 0) && effectiveSlug !== 'home') {
			res = await fetch(`/wp-json/wp/v2/pages?slug=home${query}`);
			if (res.ok) pages = await res.json();
		}
		if (!res.ok) throw new Error(`REST pages request failed: ${res.status}`);
		if (!Array.isArray(pages) || pages.length === 0) throw new Error('No page found for slug "home/index"');
		return build(pages[0], pages[0].meta || {});
	} catch (err) {
		console.warn('Falling back to step4 index.json:', err);
		if (fallback) return fallback;
		return fetchJSON(`${STEP4_BASE}/pages/index/index.json`);
	}
}

async function renderAboutUs() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	// Use the already-verified Step 4 assets
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/about-us.html`),
		fetchAboutUsPageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);

	// Replace the whole document body with the rendered template.
	// We keep <head> from WordPress for now; Step 4 has already
	// proven the body HTML matches your original design.
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');

	// Take the <body> contents from the template document
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	// Ensure global styles for this layout are present
	await ensureStyles(['/content/_src/about-us.css']);

	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function renderContact() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/contact.html`),
		fetchContactPageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	await ensureStyles(['/content/_src/contact.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function renderSeoServices() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/seo-services.html`),
		fetchSeoServicesPageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	await ensureStyles(['/content/_src/ai-seo-services.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function renderAiSeoServices() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/ai-seo-services.html`),
		fetchAiSeoServicesPageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	await ensureStyles(['/content/_src/ai-seo-services.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function renderOrmServices() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/orm-services.html`),
		fetchOrmServicesPageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	// ORM page uses the shared service stylesheet from source files.
	await ensureStyles(['/content/_src/ai-seo-services.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function renderSemServices() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/sem-services.html`),
		fetchSemServicesPageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	// SEM page also uses the shared service stylesheet from source files.
	await ensureStyles(['/content/_src/ai-seo-services.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function renderContentMarketingServices() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/content-marketing-services.html`),
		fetchContentMarketingServicesPageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	// Content marketing page uses the shared service stylesheet from source files.
	await ensureStyles(['/content/_src/ai-seo-services.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function renderSocialMediaServices() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/social-media-services.html`),
		fetchSocialMediaServicesPageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	// Social media page also uses the shared service stylesheet from source files.
	await ensureStyles(['/content/_src/ai-seo-services.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function renderWebDesignServices() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/web-design-services.html`),
		fetchWebDesignServicesPageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	// Web design page uses the shared service stylesheet from source files.
	await ensureStyles(['/content/_src/ai-seo-services.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function renderEcommerceServices() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/ecommerce-services.html`),
		fetchEcommerceServicesPageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	// Ecommerce page uses the shared service stylesheet from source files.
	await ensureStyles(['/content/_src/ai-seo-services.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function renderBlog() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/blog.html`),
		fetchBlogPageJson(langSlug, pageSlug, pageId),
	]);

	const flat = flatten(pageJson);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(pageJson);

	await ensureStyles(['/content/_src/blog.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, pageJson).then(applyManagedFooterSocialLinks);

	const readMoreLabel = pageJson.posts?.p1?.link_text || (langSlug === 'en' ? 'Read article' : langSlug === 'sc' ? '阅读文章' : '閱讀文章');

	// Grid fetches only page 1 (6 posts); sidebar fetches independently in parallel
	await Promise.all([
		populateBlogGrid(langSlug, readMoreLabel, 1, 'all'),
		populateSidebarLatestPosts(langSlug),
	]);

	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

/* ============================================
   SERVER-SIDE PAGINATED BLOG GRID
   ============================================ */
const BLOG_PER_PAGE = 6;

/**
 * Fetch WP category list once, build a map from normalized filter slug → WP category ID.
 * Cached after the first call.
 */
let _catIdMapCache = null;
let _catInfoByIdCache = null; // { catId: { name, norm } }
async function fetchCategoryIdMap(langSlug) {
	if (_catIdMapCache) return _catIdMapCache;
	const langParam = langSlug === 'en' ? 'en' : langSlug === 'sc' ? 'sc' : 'tc';
	const normMap = {
		'ai': 'ai', 'ai-blog': 'ai', 'ai-blog-en': 'ai', 'ai-blog-sc': 'ai',
		'seo': 'seo', 'seo-blog': 'seo', 'seo-blog-en': 'seo', 'seo-blog-sc': 'seo',
		'sem': 'sem', 'sem-blog': 'sem', 'sem-blog-en': 'sem', 'sem-blog-sc': 'sem',
		'digital-marketing': 'digital', 'digital-marketing-blog': 'digital', 'digital-marketing-blog-en': 'digital', 'digital-marketing-blog-sc': 'digital',
	};
	_catIdMapCache = {};
	_catInfoByIdCache = {};
	try {
		const res = await fetch(`/wp-json/wp/v2/categories?per_page=100&lang=${langParam}`, { credentials: 'same-origin' });
		if (res.ok) {
			const cats = await res.json();
			const buckets = {};
			(Array.isArray(cats) ? cats : []).forEach((c) => {
				const norm = normMap[c.slug] || c.slug.replace(/-blog(?:-(?:en|sc))?$/, '');
				if (!norm) return;
				if (!buckets[norm]) buckets[norm] = new Set();
				buckets[norm].add(c.id);
				_catInfoByIdCache[c.id] = { name: c.name, norm };
			});
			for (const [key, ids] of Object.entries(buckets)) {
				_catIdMapCache[key] = Array.from(ids).join(',');
			}
		}
	} catch (_) {}
	return _catIdMapCache;
}

/**
 * Fetch exactly one page of posts from the WP REST API.
 * Returns { posts: [], totalPages: number }.
 */
async function fetchBlogPostsPage(langSlug, page, categoryIds) {
	const langParam = langSlug === 'en' ? 'en' : langSlug === 'sc' ? 'sc' : 'tc';
	let url = `/wp-json/wp/v2/posts?per_page=${BLOG_PER_PAGE}&page=${page}&orderby=date&order=desc&_embed&lang=${langParam}`;
	if (categoryIds) url += `&categories=${categoryIds}`;
	try {
		const res = await fetch(url, { credentials: 'same-origin' });
		if (!res.ok) return { posts: [], totalPages: 0 };
		const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '0', 10);
		const posts = await res.json();
		return { posts: Array.isArray(posts) ? posts : [], totalPages };
	} catch (_) {
		return { posts: [], totalPages: 0 };
	}
}

/**
 * Populate the #blogGrid with exactly one page of posts, fetched on demand.
 * Renders pagination UI and wires filter / page-change handlers.
 */
async function populateBlogGrid(langSlug, readMoreLabel, page, categorySlug) {
	const grid = document.getElementById('blogGrid');
	if (!grid) return;

	// Mark grid so script.js skips its own client-side pagination
	grid.dataset.serverPaginated = 'true';

	const catMap = await fetchCategoryIdMap(langSlug);
	const categoryIds = (categorySlug && categorySlug !== 'all') ? (catMap[categorySlug] || '') : '';

	const { posts, totalPages } = await fetchBlogPostsPage(langSlug, page, categoryIds);

	const categorySlugMap = {
		'ai': 'ai', 'ai-blog': 'ai', 'ai-blog-en': 'ai', 'ai-blog-sc': 'ai',
		'seo': 'seo', 'seo-blog': 'seo', 'seo-blog-en': 'seo', 'seo-blog-sc': 'seo',
		'sem': 'sem', 'sem-blog': 'sem', 'sem-blog-en': 'sem', 'sem-blog-sc': 'sem',
		'digital-marketing': 'digital', 'digital-marketing-blog': 'digital', 'digital-marketing-blog-en': 'digital', 'digital-marketing-blog-sc': 'digital',
	};
	const dateLocale = langSlug === 'en' ? 'en-US' : langSlug === 'sc' ? 'zh-CN' : 'zh-TW';

	if (!posts || posts.length === 0) {
		grid.innerHTML = '';
		const pag = document.getElementById('blogPagination');
		if (pag) pag.style.display = 'none';
		return;
	}

	grid.innerHTML = posts.map((post) => {
		const title = post.title?.rendered || '';
		const slug = post.slug || '';
		const dateStr = post.date ? new Date(post.date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
		const embedded = post._embedded || {};
		const featuredMedia = embedded['wp:featuredmedia'];
		const imgUrl = (Array.isArray(featuredMedia) && featuredMedia.length > 0) ? (featuredMedia[0].source_url || '') : '';
		const imgAlt = (Array.isArray(featuredMedia) && featuredMedia.length > 0) ? (featuredMedia[0].alt_text || title) : title;
		const terms = embedded['wp:term'];
		const cats = (Array.isArray(terms) && Array.isArray(terms[0])) ? terms[0] : [];
		const firstCat = cats.length > 0 ? cats[0] : null;
		const catName = firstCat ? firstCat.name : '';
		const catSlugRaw = firstCat ? firstCat.slug : '';
		const dataCat = categorySlugMap[catSlugRaw] || catSlugRaw.replace(/-blog(?:-(?:en|sc))?$/, '') || 'uncategorized';
		const postUrl = prefixRoute(slug, langSlug);

		return `<article class="blog-card reveal-item" data-category="${dataCat}">
			<div class="blog-card-image">
				${imgUrl ? `<img src="${imgUrl}" alt="${imgAlt.replace(/"/g, '&quot;')}" class="blog-thumbnail" loading="lazy">` : '<div class="blog-image-placeholder"></div>'}
			</div>
			<div class="blog-card-inner">
				<span class="blog-category ${dataCat}">${catName}</span>
				<time class="blog-date">${dateStr}</time>
				<h3 class="blog-title">${title}</h3>
				<a href="${postUrl}" class="blog-link">
					${readMoreLabel}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</a>
			</div>
		</article>`;
	}).join('');

	// Trigger reveal animation for the newly rendered cards
	setTimeout(() => {
		grid.querySelectorAll('.blog-card').forEach((card, i) => {
			setTimeout(() => card.classList.add('revealed'), 50 + i * 100);
		});
	}, 10);

	// Render pagination UI and wire event handlers
	renderBlogPaginationUI(page, totalPages, langSlug, readMoreLabel, categorySlug);
	wireBlogFilterButtons(langSlug, readMoreLabel);
}

/**
 * Build / update the pagination buttons (#blogPagination) based on current page & total.
 */
function renderBlogPaginationUI(currentPage, totalPages, langSlug, readMoreLabel, categorySlug) {
	const pagination = document.getElementById('blogPagination');
	const pageNumbersContainer = document.getElementById('pageNumbers');
	const prevBtn = document.getElementById('prevPage');
	const nextBtn = document.getElementById('nextPage');
	if (!pagination) return;

	if (totalPages <= 1) {
		pagination.style.display = 'none';
		return;
	}
	pagination.style.display = 'flex';

	// Build page number buttons
	if (pageNumbersContainer) {
		pageNumbersContainer.innerHTML = '';
		const addNum = (num) => {
			const btn = document.createElement('button');
			btn.className = 'page-number' + (num === currentPage ? ' active' : '');
			btn.textContent = num;
			btn.addEventListener('click', () => {
				populateBlogGrid(langSlug, readMoreLabel, num, categorySlug);
				const blogMain = document.querySelector('.blog-main');
				if (blogMain) blogMain.scrollIntoView({ behavior: 'smooth', block: 'start' });
			});
			pageNumbersContainer.appendChild(btn);
		};
		const addEllipsis = () => {
			const span = document.createElement('span');
			span.className = 'page-ellipsis';
			span.textContent = '...';
			pageNumbersContainer.appendChild(span);
		};

		if (totalPages > 0) addNum(1);
		if (totalPages > 5) {
			if (currentPage > 3) addEllipsis();
			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalPages - 1, currentPage + 1);
			for (let i = start; i <= end; i++) {
				if (i !== 1 && i !== totalPages) addNum(i);
			}
			if (currentPage < totalPages - 2) addEllipsis();
			if (totalPages > 1) addNum(totalPages);
		} else {
			for (let i = 2; i <= totalPages; i++) addNum(i);
		}
	}

	// Prev / Next
	const goTo = (p) => {
		populateBlogGrid(langSlug, readMoreLabel, p, categorySlug);
		const blogMain = document.querySelector('.blog-main');
		if (blogMain) blogMain.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	if (prevBtn) {
		prevBtn.disabled = currentPage === 1;
		const newPrev = prevBtn.cloneNode(true);
		prevBtn.parentNode.replaceChild(newPrev, prevBtn);
		newPrev.addEventListener('click', () => { if (currentPage > 1) goTo(currentPage - 1); });
	}
	if (nextBtn) {
		nextBtn.disabled = currentPage === totalPages;
		const newNext = nextBtn.cloneNode(true);
		nextBtn.parentNode.replaceChild(newNext, nextBtn);
		newNext.addEventListener('click', () => { if (currentPage < totalPages) goTo(currentPage + 1); });
	}
}

/**
 * Wire category filter buttons (desktop + mobile dropdown) so they trigger
 * a server-side paginated re-fetch at page 1.
 * Uses cloneNode to avoid stacking duplicate listeners on repeated calls.
 */
function wireBlogFilterButtons(langSlug, readMoreLabel) {
	const filterBtns = document.querySelectorAll('.filter-btn');
	const dropdownItems = document.querySelectorAll('.filter-dropdown-item');
	const dropdownLabel = document.querySelector('.filter-dropdown-label');
	const dropdownToggle = document.getElementById('filterDropdownToggle');
	const dropdownMenu = document.getElementById('filterDropdownMenu');

	filterBtns.forEach((btn) => {
		const clone = btn.cloneNode(true);
		btn.parentNode.replaceChild(clone, btn);
		clone.addEventListener('click', () => {
			document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
			clone.classList.add('active');
			// Sync mobile dropdown
			if (dropdownLabel) dropdownLabel.textContent = clone.textContent;
			dropdownItems.forEach((i) => i.classList.toggle('active', i.dataset.category === clone.dataset.category));
			populateBlogGrid(langSlug, readMoreLabel, 1, clone.dataset.category);
		});
	});

	dropdownItems.forEach((item) => {
		const clone = item.cloneNode(true);
		item.parentNode.replaceChild(clone, item);
		clone.addEventListener('click', () => {
			document.querySelectorAll('.filter-dropdown-item').forEach((i) => i.classList.remove('active'));
			clone.classList.add('active');
			if (dropdownLabel) dropdownLabel.textContent = clone.textContent;
			if (dropdownToggle) dropdownToggle.classList.remove('active');
			if (dropdownMenu) dropdownMenu.classList.remove('open');
			// Sync desktop
			document.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('active', b.dataset.category === clone.dataset.category));
			populateBlogGrid(langSlug, readMoreLabel, 1, clone.dataset.category);
		});
	});
}

async function populateSidebarLatestPosts(langSlug) {
	const container = document.getElementById('sidebarLatestPosts');
	if (!container) return;

	const langParam = langSlug === 'en' ? 'en' : langSlug === 'sc' ? 'sc' : 'tc';
	const readLabel = langSlug === 'en' ? 'Read article' : langSlug === 'sc' ? '阅读文章' : '閱讀文章';
	const dateLocale = langSlug === 'en' ? 'en-US' : langSlug === 'sc' ? 'zh-CN' : 'zh-TW';

	// Ensure category info is available (reuses the cached categories fetch)
	await fetchCategoryIdMap(langSlug);
	const catInfoById = _catInfoByIdCache || {};

	// Lightweight fetch: only the fields the sidebar needs — no _embed (saves ~26 MB)
	let allPosts = [];
	try {
		const res = await fetch(`/wp-json/wp/v2/posts?per_page=20&orderby=date&order=desc&_fields=id,title,date,slug,categories&lang=${langParam}`, { credentials: 'same-origin' });
		if (res.ok) allPosts = await res.json();
	} catch (_) {}

	if (!Array.isArray(allPosts) || allPosts.length === 0) {
		container.innerHTML = '';
		return;
	}

	// Enrich each post with its normalized category (resolved from cached category data)
	const enriched = allPosts.map((post) => {
		const catIds = Array.isArray(post.categories) ? post.categories : [];
		const firstInfo = catIds.length > 0 ? catInfoById[catIds[0]] : null;
		const catName = firstInfo ? firstInfo.name : '';
		const dataCat = firstInfo ? firstInfo.norm : 'uncategorized';
		return { post, catName, dataCat };
	});

	function renderPostsForCategory(category) {
		const filtered = category === 'all'
			? enriched.slice(0, 5)
			: enriched.filter((p) => p.dataCat === category).slice(0, 5);

		if (filtered.length === 0) {
			container.innerHTML = '';
			return;
		}

		container.innerHTML = filtered.map(({ post, catName, dataCat }) => {
			const title = post.title?.rendered || '';
			const slug = post.slug || '';
			const dateStr = post.date ? new Date(post.date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
			const postUrl = prefixRoute(slug, langSlug);
			return `<div class="featured-post" data-category="${dataCat}">
				<span class="blog-category ${dataCat}">${catName}</span>
				<h4><a href="${postUrl}" class="latest-post-title-link">${title}</a></h4>
				<time>${dateStr}</time>
				<a href="${postUrl}" class="featured-link">${readLabel}
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
				</a>
			</div>`;
		}).join('');
	}

	// Initial render — show 5 latest across all categories
	renderPostsForCategory('all');

	// Listen for category filter changes and re-render sidebar with the correct 5
	const filterBtns = document.querySelectorAll('.filter-btn');
	const dropdownItems = document.querySelectorAll('.filter-dropdown-item');

	filterBtns.forEach((btn) => {
		btn.addEventListener('click', () => renderPostsForCategory(btn.dataset.category));
	});
	dropdownItems.forEach((item) => {
		item.addEventListener('click', () => renderPostsForCategory(item.dataset.category));
	});
}

async function renderBlogArticle1() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/blog-article-1.html`),
		fetchBlogArticle1PageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	await ensureStyles(['/content/_src/blog.css', '/content/_src/blog-article.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function renderBlogPost(postSlug, langOverride) {
	const langSlug = langOverride || detectLanguageFromPath(window.location.pathname);
	const [templateHtml, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/blog-post.html`),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const bodyPostId = getCurrentPostIdFromBody();
	let postData = null;
	try {
		let res;
		if (bodyPostId) {
			res = await fetch(`/wp-json/wp/v2/posts/${bodyPostId}?_embed`, { credentials: 'same-origin' });
			if (res.ok) postData = await res.json();
		} else {
			res = await fetch(`/wp-json/wp/v2/posts?slug=${encodeURIComponent(postSlug)}&_embed`, { credentials: 'same-origin' });
			if (res.ok) {
				const posts = await res.json();
				if (Array.isArray(posts) && posts.length > 0) postData = posts[0];
			}
		}
	} catch (_) {}

	if (!postData) {
		document.body.style.opacity = '1';
		return;
	}

	const postTitle = postData.title?.rendered || '';
	const postContent = postData.content?.rendered || '';
	const postExcerpt = (postData.excerpt?.rendered || '').replace(/<[^>]*>/g, '').trim();
	const postDateRaw = postData.date || '';
	const postDate = postDateRaw ? new Date(postDateRaw).toLocaleDateString(langSlug === 'en' ? 'en-US' : langSlug === 'sc' ? 'zh-CN' : 'zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
	const embedded = postData._embedded || {};
	const featuredMedia = embedded['wp:featuredmedia'];
	const featuredImageUrl = (Array.isArray(featuredMedia) && featuredMedia.length > 0) ? (featuredMedia[0].source_url || '') : '';
	const featuredImageAlt = (Array.isArray(featuredMedia) && featuredMedia.length > 0) ? (featuredMedia[0].alt_text || postTitle) : postTitle;
	const terms = embedded['wp:term'];
	const category = (Array.isArray(terms) && Array.isArray(terms[0]) && terms[0].length > 0) ? terms[0][0].name : '';

	const ctaDefaults = {
		tc: { back: '返回博客', scroll: '向下捲動', cta_title: '需要專業的數位行銷支援？', cta_desc: '聯繫我們的專家團隊，獲取免費諮詢和定制解決方案。', cta_btn: '立即聯繫我們' },
		en: { back: 'Back to Blog', scroll: 'Scroll down', cta_title: 'Need professional digital marketing support?', cta_desc: 'Contact our expert team for a free consultation and customized solutions.', cta_btn: 'Contact Us Now' },
		sc: { back: '返回博客', scroll: '向下滚动', cta_title: '需要专业的数字营销支持？', cta_desc: '联系我们的专家团队，获取免费咨询和定制解决方案。', cta_btn: '立即联系我们' },
	};
	const cta = ctaDefaults[langSlug] || ctaDefaults.tc;

	const placeholderData = {
		shared: sharedJson,
		post: {
			title: postTitle,
			excerpt: postExcerpt,
			date: postDate,
			category: category,
			back_to_blog: cta.back,
			scroll_text: cta.scroll,
			cta_title: cta.cta_title,
			cta_desc: cta.cta_desc,
			cta_btn: cta.cta_btn,
		},
	};

	const flat = flatten(placeholderData);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	// Update document meta for blog posts
	updateDocumentMeta({
		meta: {
			title: postTitle ? `${postTitle} | Unique Logic` : '',
			description: postExcerpt || ''
		}
	});

	await ensureStyles(['/content/_src/blog.css', '/content/_src/blog-article.css']);
	document.body.innerHTML = newBody.innerHTML;

	if (featuredImageUrl) {
		const imgContainer = document.getElementById('post-featured-image');
		if (imgContainer) {
			imgContainer.innerHTML = `<img src="${featuredImageUrl}" alt="${featuredImageAlt.replace(/"/g, '&quot;')}">`;
		}
	}

	const bodyContainer = document.getElementById('post-body');
	if (bodyContainer) {
		bodyContainer.innerHTML = structureBlogContent(postContent);
	}

	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(0, sharedJson).then(applyManagedFooterSocialLinks);

	const categoryIds = postData.categories || [];
	if (categoryIds.length > 0) {
		fetchRelatedArticles(postData.id, categoryIds[0], langSlug).then((html) => {
			const section = document.getElementById('related-articles-section');
			if (section && html) section.innerHTML = html;
		});
	}

	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	document.body.style.opacity = '1';
}

async function fetchRelatedArticles(excludeId, categoryId, langSlug) {
	const relatedLabels = {
		tc: { tag: '相關文章', title: '探索更多相關資訊', link: '閱讀此文章' },
		en: { tag: 'Related Articles', title: 'Explore More', link: 'Read this article' },
		sc: { tag: '相关文章', title: '探索更多相关资讯', link: '阅读此文章' },
	};
	const labels = relatedLabels[langSlug] || relatedLabels.tc;

	try {
		const res = await fetch(`/wp-json/wp/v2/posts?categories=${categoryId}&exclude=${excludeId}&per_page=3&_embed`, { credentials: 'same-origin' });
		if (!res.ok) return '';
		const posts = await res.json();
		if (!Array.isArray(posts) || posts.length === 0) return '';

		const cards = posts.map((p) => {
			const title = p.title?.rendered || '';
			const link = p.link || `/${p.slug}/`;
			const dateStr = p.date ? new Date(p.date).toLocaleDateString(langSlug === 'en' ? 'en-US' : langSlug === 'sc' ? 'zh-CN' : 'zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
			const emb = p._embedded || {};
			const media = emb['wp:featuredmedia'];
			const imgUrl = (Array.isArray(media) && media.length > 0) ? (media[0].source_url || '') : '';
			const imgAlt = (Array.isArray(media) && media.length > 0) ? (media[0].alt_text || title) : title;
			const terms = emb['wp:term'];
			const cat = (Array.isArray(terms) && Array.isArray(terms[0]) && terms[0].length > 0) ? terms[0][0].name : '';

			return `<article class="blog-card reveal-item">
          <div class="blog-card-image">
            ${imgUrl ? `<img src="${imgUrl}" alt="${imgAlt.replace(/"/g, '&quot;')}" class="blog-thumbnail" loading="lazy">` : ''}
          </div>
          <div class="blog-card-inner">
            <span class="blog-category ai">${cat}</span>
            <time class="blog-date">${dateStr}</time>
            <h3 class="blog-title">${title}</h3>
            <a href="${link}" class="blog-link">
              ${labels.link}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
        </article>`;
		}).join('\n');

		return `<div class="container">
      <div class="section-header">
        <span class="section-tag reveal-item">${labels.tag}</span>
        <h2 class="section-title reveal-text">${labels.title}</h2>
      </div>
      <div class="related-grid">${cards}</div>
    </div>`;
	} catch (_) {
		return '';
	}
}

async function renderIndex() {
	const langSlug = detectLanguageFromPath(window.location.pathname);
	const pageSlug = getCurrentSlug(window.location.pathname);
	const pageId = getCurrentPageIdFromBody();
	const [templateHtml, pageJson, sharedJson] = await Promise.all([
		fetchText(`${STEP4_BASE}/templates/index.html`),
		fetchIndexPageJson(langSlug, pageSlug, pageId),
		fetchJSON(`${STEP4_BASE}/pages/${getSharedFallbackFile(langSlug)}`).catch(async () => {
			return fetchJSON(`${STEP4_BASE}/pages/shared/_shared.json`);
		}),
	]);

	const merged = { shared: sharedJson, ...pageJson };
	const flat = flatten(merged);
	const rendered = injectPlaceholders(templateHtml, flat);
	const parser = new DOMParser();
	const doc = parser.parseFromString(rendered, 'text/html');
	const newBody = doc.body;
	if (!newBody) return;

	updateDocumentMeta(merged);

	await ensureStyles(['/content/_src/styles.css']);
	document.body.innerHTML = newBody.innerHTML;
	normalizeRerenderAssetUrls();
	initLocalizedNavLinks();
	initLanguageSwitcher();
	fetchManagedFooterSocialLinks(pageId, typeof sharedJson !== 'undefined' ? sharedJson : null).then(applyManagedFooterSocialLinks);
	await loadScriptOnce('/content/_src/script.js');
	document.dispatchEvent(new Event('DOMContentLoaded'));
	scrollToCurrentHashAnchor();
	document.body.style.opacity = '1';
}

function injectWhatsAppButton() {
	if (document.getElementById('ul-whatsapp-btn')) return;
	const btn = document.createElement('a');
	btn.id = 'ul-whatsapp-btn';
	btn.href = 'https://wa.me/85284007393';
	btn.target = '_blank';
	btn.rel = 'noopener noreferrer';
	btn.setAttribute('aria-label', 'Chat on WhatsApp');
	btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39.504 39.504" width="30" height="30"><path d="M19.752 0C8.858 0 0 8.858 0 19.752c0 3.478.91 6.876 2.636 9.876L.058 39.504l10.1-2.633a19.63 19.63 0 0 0 9.594 2.494C30.646 39.365 39.504 30.507 39.504 19.613 39.504 8.858 30.646 0 19.752 0zm0 36.23a16.36 16.36 0 0 1-8.82-2.575l-.632-.382-6.557 1.719 1.75-6.397-.42-.667A16.345 16.345 0 0 1 3.136 19.752c0-9.151 7.465-16.617 16.616-16.617 9.151 0 16.617 7.466 16.617 16.617S28.903 36.23 19.752 36.23zm9.117-12.443c-.5-.25-2.954-1.457-3.413-1.623-.458-.167-.792-.25-1.125.25s-1.292 1.623-1.583 1.957c-.292.333-.583.375-1.083.125s-2.113-.778-4.025-2.484c-1.488-1.328-2.492-2.966-2.784-3.466s-.031-.771.219-1.02c.225-.225.5-.583.75-.875s.333-.5.5-.833c.167-.333.083-.625-.042-.875s-1.125-2.709-1.542-3.709c-.406-.975-.82-.843-1.125-.859-.292-.015-.625-.018-.958-.018s-.875.125-1.333.625-1.75 1.708-1.75 4.166 1.792 4.833 2.042 5.166c.25.333 3.525 5.38 8.542 7.542 1.193.515 2.125.823 2.852 1.053 1.198.381 2.288.327 3.15.198.961-.143 2.954-1.207 3.371-2.373.417-1.167.417-2.167.292-2.375-.125-.208-.458-.333-.958-.583z"/></svg>';
	const style = document.createElement('style');
	style.textContent = `
		@keyframes ul-wa-pulse {
			0% { box-shadow: 0 0 0 0 rgba(0, 212, 232, 0.5); }
			70% { box-shadow: 0 0 0 14px rgba(0, 212, 232, 0); }
			100% { box-shadow: 0 0 0 0 rgba(0, 212, 232, 0); }
		}
		@keyframes ul-wa-glow-rotate {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}
		#ul-whatsapp-btn {
			position: fixed;
			bottom: 40px;
			right: 50px;
			z-index: 99999;
			width: 70px;
			height: 70px;
			border-radius: 50%;
			background: linear-gradient(135deg, #0a0a0a 0%, #1a1a24 100%);
			border: 1.5px solid rgba(0, 212, 232, 0.4);
			display: flex;
			align-items: center;
			justify-content: center;
			box-shadow: 0 0 12px rgba(0, 212, 232, 0.2), inset 0 0 8px rgba(0, 212, 232, 0.05);
			cursor: pointer;
			text-decoration: none;
			animation: ul-wa-pulse 2.5s ease-in-out infinite;
			transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s ease, box-shadow 0.3s ease;
			overflow: hidden;
		}
		#ul-whatsapp-btn::before {
			content: '';
			position: absolute;
			top: -2px; left: -2px; right: -2px; bottom: -2px;
			border-radius: 50%;
			background: conic-gradient(from 0deg, transparent 0%, #00d4e8 25%, transparent 50%);
			opacity: 0;
			transition: opacity 0.4s ease;
			animation: ul-wa-glow-rotate 3s linear infinite;
			z-index: -1;
		}
		#ul-whatsapp-btn:hover {
			transform: scale(1.15) translateY(-2px);
			border-color: #00d4e8;
			box-shadow: 0 0 24px rgba(0, 212, 232, 0.5), 0 0 48px rgba(0, 212, 232, 0.2), inset 0 0 12px rgba(0, 212, 232, 0.1);
			animation: none;
		}
		#ul-whatsapp-btn:hover::before {
			opacity: 1;
		}
		#ul-whatsapp-btn svg {
			pointer-events: none;
			fill: #00d4e8;
			filter: drop-shadow(0 0 4px rgba(0, 212, 232, 0.4));
			transition: filter 0.3s ease, transform 0.3s ease;
		}
		#ul-whatsapp-btn:hover svg {
			filter: drop-shadow(0 0 8px rgba(0, 212, 232, 0.8));
			transform: scale(1.05);
		}
		@media (max-width: 768px) {
			#ul-whatsapp-btn {
				bottom: 20px;
				right: 20px;
				width: 56px;
				height: 56px;
			}
			#ul-whatsapp-btn svg {
				width: 24px;
				height: 24px;
			}
		}
	`;
	document.head.appendChild(style);
	document.body.appendChild(btn);
}

async function bootstrap() {
	if (maybeRedirectToPreferredLanguage()) return;
	const path = window.location.pathname;
	const slug = getCurrentSlug(path);
	const isAbout = isAboutUsRoute(path);
	const isContact = isContactRoute(path);
	const isSeoServices = isSeoServicesRoute(path);
	const isAiSeoServices = isAiSeoServicesRoute(path);
	const isOrmServices = isOrmServicesRoute(path);
	const isSemServices = isSemServicesRoute(path);
	const isContentMarketingServices = isContentMarketingServicesRoute(path);
	const isSocialMediaServices = isSocialMediaServicesRoute(path);
	const isWebDesignServices = isWebDesignServicesRoute(path);
	const isEcommerceServices = isEcommerceServicesRoute(path);
	const isBlog = isBlogRoute(path);
	const isBlogArticle1 = isBlogArticle1Route(path);
	const isHome = isHomeRoute(path) || slug === 'home' || slug === 'index';
	const isSinglePost = !isAbout && !isContact && !isSeoServices && !isAiSeoServices && !isOrmServices && !isSemServices && !isContentMarketingServices && !isSocialMediaServices && !isWebDesignServices && !isEcommerceServices && !isBlog && !isBlogArticle1 && !isHome && (document.body.classList.contains('single-post') || document.body.classList.contains('single'));

	if (!isAbout && !isContact && !isSeoServices && !isAiSeoServices && !isOrmServices && !isSemServices && !isContentMarketingServices && !isSocialMediaServices && !isWebDesignServices && !isEcommerceServices && !isBlog && !isBlogArticle1 && !isHome && !isSinglePost) {
		document.body.style.opacity = '1';
		injectWhatsAppButton();
		return;
	}

	try {
		if (isContact) {
			await renderContact();
		} else if (isSeoServices) {
			await renderSeoServices();
		} else if (isAiSeoServices) {
			await renderAiSeoServices();
		} else if (isOrmServices) {
			await renderOrmServices();
		} else if (isSemServices) {
			await renderSemServices();
		} else if (isContentMarketingServices) {
			await renderContentMarketingServices();
		} else if (isSocialMediaServices) {
			await renderSocialMediaServices();
		} else if (isWebDesignServices) {
			await renderWebDesignServices();
		} else if (isEcommerceServices) {
			await renderEcommerceServices();
		} else if (isBlog) {
			await renderBlog();
		} else if (isBlogArticle1) {
			const ba1Lang = detectLanguageFromPath(path);
			await renderBlogPost('blog-article-1', ba1Lang);
		} else if (isHome) {
			await renderIndex();
		} else if (isSinglePost) {
			const postSlug = slug || path.replace(/\/+$/, '').split('/').filter(Boolean).pop() || '';
			await renderBlogPost(postSlug);
		} else {
			await renderAboutUs();
		}
	} catch (err) {
		console.error('Re-renderer failed:', err);
		document.body.style.opacity = '1';
	}

	// Inject WhatsApp button AFTER rendering, since render functions
	// replace document.body.innerHTML which would destroy an earlier button.
	injectWhatsAppButton();
}

// Run after the DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', bootstrap);
} else {
	bootstrap();
}