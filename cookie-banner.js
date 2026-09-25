/**
 * PLAYMATIC CMP (Consent Management Platform)
 * Cumplimiento estricto con RGPD (UE 2016/679), LOPDGDD 3/2018 y LSSI-CE 34/2002.
 * Implementa bloqueo previo de scripts de analítica (Google Analytics) hasta consentimiento expreso.
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'playmatic_cookie_consent';
    const POLICY_VERSION = '1.0';
    const CONSENT_VALIDITY_DAYS = 365;
    const GA_ID = 'G-J4QMT38XRH';
    const GTM_ID = 'GTM-K4R7MPPZ';

    // Definición de textos para soporte multi-idioma (ES / EN)
    const i18n = {
        es: {
            bannerTitle: 'Control de Privacidad y Cookies',
            bannerText: 'Utilizamos cookies propias y de terceros con fines técnicos esenciales y analíticos para optimizar el rendimiento y medir el tráfico de la web. Puedes aceptar todas las cookies, rechazar las no esenciales o configurar tus preferencias de forma personalizada. Para más detalles, consulta nuestra <a href="politica-de-cookies.html">Política de Cookies</a>.',
            btnAcceptAll: 'Aceptar todas',
            btnRejectAll: 'Rechazar no esenciales',
            btnConfigure: 'Configurar',
            modalTitle: 'Centro de Preferencias de Cookies',
            modalIntro: 'Las cookies son pequeños ficheros que se descargan en tu navegador. Puedes elegir qué categorías de cookies permites en este sitio. Las cookies técnicas son indispensables para el funcionamiento y seguridad de la web.',
            catTechnicalTitle: 'Cookies Técnicas y Esenciales',
            catTechnicalDesc: 'Garantizan la navegación segura, el funcionamiento del sitio web y almacenan tus preferencias de privacidad. No recaban datos personales y no pueden desactivarse.',
            catAnalyticsTitle: 'Cookies Analíticas y de Medición',
            catAnalyticsDesc: 'Nos permiten contar visitas y fuentes de tráfico de forma anónima para medir y mejorar el rendimiento de la web (Google Analytics).',
            catMarketingTitle: 'Cookies de Marketing y Personalización',
            catMarketingDesc: 'Se utilizan para mostrar contenido relevante o campañas publicitarias personalizadas. Actualmente no realizamos publicidad de terceros.',
            badgeRequired: 'Siempre activas',
            btnSavePreferences: 'Guardar preferencias',
            floatingTooltip: 'Configurar cookies'
        },
        en: {
            bannerTitle: 'Privacy & Cookie Control',
            bannerText: 'We use our own and third-party cookies for essential technical purposes and web analytics to optimize performance and measure traffic. You can accept all cookies, reject non-essential ones, or customize your preferences. For more information, read our <a href="politica-de-cookies.html">Cookie Policy</a>.',
            btnAcceptAll: 'Accept all',
            btnRejectAll: 'Reject non-essential',
            btnConfigure: 'Customize',
            modalTitle: 'Cookie Preference Center',
            modalIntro: 'Cookies are small files stored in your browser. You can choose which categories of cookies you allow on this site. Essential technical cookies are strictly necessary for website operation and security.',
            catTechnicalTitle: 'Technical & Essential Cookies',
            catTechnicalDesc: 'Ensure safe navigation, correct website operation, and store your privacy choices. They do not collect personal data and cannot be turned off.',
            catAnalyticsTitle: 'Analytics & Measurement Cookies',
            catAnalyticsDesc: 'Allow us to count visits and traffic sources anonymously to measure and improve our site performance (Google Analytics).',
            catMarketingTitle: 'Marketing & Personalization Cookies',
            catMarketingDesc: 'Used to provide tailored content or personalized ad campaigns. We currently do not display third-party ads.',
            badgeRequired: 'Always active',
            btnSavePreferences: 'Save preferences',
            floatingTooltip: 'Cookie settings'
        }
    };

    function getLang() {
        const lang = (document.documentElement.lang || 'es').toLowerCase();
        return lang.startsWith('en') ? 'en' : 'es';
    }

    // Comprobar si existe un consentimiento almacenado y válido
    function getStoredConsent() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data.timestamp || data.version !== POLICY_VERSION) return null;

            const daysElapsed = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
            if (daysElapsed > CONSENT_VALIDITY_DAYS) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    }

    function saveConsent(preferences) {
        const data = {
            technical: true,
            analytics: !!preferences.analytics,
            marketing: !!preferences.marketing,
            version: POLICY_VERSION,
            timestamp: Date.now()
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error al guardar consentimiento de cookies:', e);
        }
        applyConsent(data);
    }

    // Eliminar cookies de Google Analytics si el usuario rechaza
    function purgeAnalyticsCookies() {
        const cookies = document.cookie.split(';');
        const domains = [window.location.hostname, '.' + window.location.hostname];
        
        // Extraer dominio raíz para playmatic.es
        const parts = window.location.hostname.split('.');
        if (parts.length >= 2) {
            domains.push('.' + parts.slice(-2).join('.'));
        }

        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            if (name.startsWith('_ga') || name.startsWith('_gid') || name.startsWith('_gat')) {
                domains.forEach(domain => {
                    document.cookie = `${name}=; Path=/; Domain=${domain}; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;`;
                });
                document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;`;
            }
        }
    }

    // Inyección dinámica de Google Analytics y GTM ÚNICAMENTE tras consentimiento
    let gaLoaded = false;
    function loadGoogleAnalytics() {
        if (gaLoaded) return;
        gaLoaded = true;

        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        window.gtag = gtag;

        gtag('js', new Date());
        gtag('config', GA_ID, {
            'anonymize_ip': true,
            'cookie_flags': 'SameSite=Lax;Secure'
        });

        // Carga de gtag.js
        const scriptGA = document.createElement('script');
        scriptGA.async = true;
        scriptGA.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        document.head.appendChild(scriptGA);

        // Carga de Google Tag Manager
        (function (w, d, s, l, i) {
            w[l] = w[l] || []; w[l].push({
                'gtm.start': new Date().getTime(), event: 'gtm.js'
            }); var f = d.getElementsByTagName(s)[0],
                j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
        })(window, document, 'script', 'dataLayer', GTM_ID);

        console.log('[Playmatic CMP] Google Analytics y GTM inicializados tras consentimiento expreso.');
    }

    // Asegurar que si un script local llama a gtag() no lance error mientras esté bloqueado
    function ensureGtagStub() {
        if (!window.gtag) {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function () {
                window.dataLayer.push(arguments);
            };
        }
    }

    // Aplicar las decisiones de privacidad del usuario
    function applyConsent(consent) {
        if (consent && consent.analytics) {
            loadGoogleAnalytics();
        } else {
            purgeAnalyticsCookies();
        }

        // Disparar evento personalizado para otros scripts de la app
        window.dispatchEvent(new CustomEvent('playmatic_consent_updated', { detail: consent }));
    }

    // Renderizar la UI del Banner y el Modal
    function injectUI() {
        const lang = getLang();
        const t = i18n[lang];

        // 1. Contenedor Banner Nivel 1
        const banner = document.createElement('aside');
        banner.id = 'playmatic-cookie-banner';
        banner.className = 'cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', t.bannerTitle);
        banner.innerHTML = `
            <div class="cookie-banner-content">
                <div class="cookie-banner-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path>
                        <path d="M8.5 8.5v.01"></path>
                        <path d="M7 13v.01"></path>
                        <path d="M12 16v.01"></path>
                        <path d="M16 12v.01"></path>
                    </svg>
                    <h3 class="cookie-banner-title">${t.bannerTitle}</h3>
                </div>
                <p class="cookie-banner-text">${t.bannerText}</p>
                <div class="cookie-banner-actions">
                    <button type="button" class="cookie-btn cookie-btn-accept" id="cmp-accept-all">${t.btnAcceptAll}</button>
                    <button type="button" class="cookie-btn cookie-btn-reject" id="cmp-reject-all">${t.btnRejectAll}</button>
                    <button type="button" class="cookie-btn cookie-btn-settings" id="cmp-open-modal">${t.btnConfigure}</button>
                </div>
            </div>
        `;

        // 2. Contenedor Modal de Preferencias Nivel 2
        const modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'playmatic-cookie-modal';
        modalBackdrop.className = 'cookie-modal-backdrop';
        modalBackdrop.setAttribute('role', 'dialog');
        modalBackdrop.setAttribute('aria-modal', 'true');
        modalBackdrop.innerHTML = `
            <div class="cookie-modal">
                <div class="cookie-modal-header">
                    <h3 class="cookie-modal-title">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        ${t.modalTitle}
                    </h3>
                    <button type="button" class="cookie-modal-close" id="cmp-close-modal" aria-label="Cerrar modal">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="cookie-modal-body">
                    <p class="cookie-modal-intro">${t.modalIntro}</p>

                    <!-- Categoría Técnicas -->
                    <div class="cookie-category-item">
                        <div class="cookie-category-header">
                            <div class="cookie-category-title-wrap">
                                <h4 class="cookie-category-name">${t.catTechnicalTitle}</h4>
                                <span class="cookie-badge-required">${t.badgeRequired}</span>
                            </div>
                            <label class="cookie-switch">
                                <input type="checkbox" checked disabled>
                                <span class="cookie-slider"></span>
                            </label>
                        </div>
                        <p class="cookie-category-desc">${t.catTechnicalDesc}</p>
                    </div>

                    <!-- Categoría Analíticas -->
                    <div class="cookie-category-item">
                        <div class="cookie-category-header">
                            <div class="cookie-category-title-wrap">
                                <h4 class="cookie-category-name">${t.catAnalyticsTitle}</h4>
                            </div>
                            <label class="cookie-switch">
                                <input type="checkbox" id="cmp-toggle-analytics">
                                <span class="cookie-slider"></span>
                            </label>
                        </div>
                        <p class="cookie-category-desc">${t.catAnalyticsDesc}</p>
                    </div>

                    <!-- Categoría Marketing -->
                    <div class="cookie-category-item">
                        <div class="cookie-category-header">
                            <div class="cookie-category-title-wrap">
                                <h4 class="cookie-category-name">${t.catMarketingTitle}</h4>
                            </div>
                            <label class="cookie-switch">
                                <input type="checkbox" id="cmp-toggle-marketing">
                                <span class="cookie-slider"></span>
                            </label>
                        </div>
                        <p class="cookie-category-desc">${t.catMarketingDesc}</p>
                    </div>
                </div>
                <div class="cookie-modal-footer">
                    <button type="button" class="cookie-btn cookie-btn-reject" id="cmp-modal-reject">${t.btnRejectAll}</button>
                    <button type="button" class="cookie-btn cookie-btn-accept" id="cmp-modal-save">${t.btnSavePreferences}</button>
                </div>
            </div>
        `;

        // 3. Botón flotante para reapertura permanente
        const floatingBtn = document.createElement('button');
        floatingBtn.id = 'playmatic-cookie-trigger';
        floatingBtn.className = 'cookie-floating-trigger';
        floatingBtn.type = 'button';
        floatingBtn.title = t.floatingTooltip;
        floatingBtn.setAttribute('aria-label', t.floatingTooltip);
        floatingBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
        `;

        document.body.appendChild(banner);
        document.body.appendChild(modalBackdrop);
        document.body.appendChild(floatingBtn);

        // Eventos del Banner
        document.getElementById('cmp-accept-all').addEventListener('click', () => {
            saveConsent({ analytics: true, marketing: true });
            hideBanner();
        });

        document.getElementById('cmp-reject-all').addEventListener('click', () => {
            saveConsent({ analytics: false, marketing: false });
            hideBanner();
        });

        document.getElementById('cmp-open-modal').addEventListener('click', () => {
            openPreferencesModal();
        });

        // Eventos del Modal
        document.getElementById('cmp-close-modal').addEventListener('click', () => {
            closePreferencesModal();
        });

        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                closePreferencesModal();
            }
        });

        document.getElementById('cmp-modal-reject').addEventListener('click', () => {
            saveConsent({ analytics: false, marketing: false });
            closePreferencesModal();
            hideBanner();
        });

        document.getElementById('cmp-modal-save').addEventListener('click', () => {
            const analytics = document.getElementById('cmp-toggle-analytics').checked;
            const marketing = document.getElementById('cmp-toggle-marketing').checked;
            saveConsent({ analytics, marketing });
            closePreferencesModal();
            hideBanner();
        });

        // Evento del Botón Flotante
        floatingBtn.addEventListener('click', () => {
            openPreferencesModal();
        });
    }

    function showBanner() {
        const banner = document.getElementById('playmatic-cookie-banner');
        if (banner) banner.classList.add('active');
    }

    function hideBanner() {
        const banner = document.getElementById('playmatic-cookie-banner');
        if (banner) banner.classList.remove('active');
    }

    function openPreferencesModal() {
        const modal = document.getElementById('playmatic-cookie-modal');
        if (!modal) return;

        const currentConsent = getStoredConsent() || { analytics: false, marketing: false };
        const analyticsToggle = document.getElementById('cmp-toggle-analytics');
        const marketingToggle = document.getElementById('cmp-toggle-marketing');

        if (analyticsToggle) analyticsToggle.checked = !!currentConsent.analytics;
        if (marketingToggle) marketingToggle.checked = !!currentConsent.marketing;

        modal.classList.add('active');
    }

    function closePreferencesModal() {
        const modal = document.getElementById('playmatic-cookie-modal');
        if (modal) modal.classList.remove('active');
    }

    // Exponer API global para el footer y otros componentes
    window.openCookieSettings = openPreferencesModal;
    window.acceptAllCookies = () => {
        saveConsent({ analytics: true, marketing: true });
        hideBanner();
    };
    window.rejectNonEssentialCookies = () => {
        saveConsent({ analytics: false, marketing: false });
        hideBanner();
    };

    function initCMP() {
        try {
            ensureGtagStub();
            injectUI();

            const stored = getStoredConsent();
            if (stored) {
                applyConsent(stored);
            } else {
                // Sin consentimiento previo: bloqueo total y mostrar banner
                showBanner();
            }
        } catch (e) {
            console.error('[Playmatic CMP Init Error]', e);
        }
    }

    // Inicialización al cargar el DOM (inmediata si ya cargó)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCMP);
    } else {
        initCMP();
    }
})();
