/* Navkar City – tracking (GA4 + Google Ads conversions). Fill CONFIG, nothing else to touch. */
(function () {
  'use strict';
  var CONFIG = {
    GA4_ID: '',            // e.g. 'G-XXXXXXXXXX'
    ADS_ID: '',            // e.g. 'AW-1234567890'
    ADS_LEAD_LABEL: '',    // conversion label for "lead form"
    ADS_CALL_LABEL: '',    // conversion label for phone / WhatsApp click (optional)
    META_PIXEL_ID: ''      // optional
  };

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  var primary = CONFIG.GA4_ID || CONFIG.ADS_ID;
  if (primary) {
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(primary);
    document.head.appendChild(s);
    gtag('js', new Date());
    if (CONFIG.GA4_ID) gtag('config', CONFIG.GA4_ID);
    if (CONFIG.ADS_ID) gtag('config', CONFIG.ADS_ID);
  }

  if (CONFIG.META_PIXEL_ID) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CONFIG.META_PIXEL_ID); window.fbq('track', 'PageView');
  }

  var sent = {};
  window.navkarTrack = function (name, params) {
    params = params || {};
    try {
      if (CONFIG.GA4_ID) gtag('event', name, params);
      if (CONFIG.ADS_ID) {
        var label = name === 'generate_lead' ? CONFIG.ADS_LEAD_LABEL : (name === 'phone_click' || name === 'whatsapp_click') ? CONFIG.ADS_CALL_LABEL : '';
        if (label) gtag('event', 'conversion', { send_to: CONFIG.ADS_ID + '/' + label });
      }
      if (window.fbq && name === 'generate_lead') window.fbq('track', 'Lead', params);
    } catch (e) { }
  };

  /* automatic click tracking: call, WhatsApp, brochure */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a,button');
    if (!a) return;
    var href = a.getAttribute('href') || '', n = '';
    if (/^tel:/i.test(href)) n = 'phone_click';
    else if (/wa\.me|api\.whatsapp\.com/i.test(href)) n = 'whatsapp_click';
    else if (a.hasAttribute('data-brochure') || a.hasAttribute('data-ok-brochure')) n = 'brochure_click';
    if (!n) return;
    var now = Date.now(); if (sent[n] && now - sent[n] < 1500) return; sent[n] = now;
    window.navkarTrack(n, { link_url: href || undefined });
  }, true);
})();