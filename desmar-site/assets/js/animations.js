/* ============================================================
   Desmar — animations.js
   Scroll reveal (staggered) + sticky-header shadow.
   Loaded in <head>: sets .anim-ready before first paint so
   there is no flash, then wires observers on DOMContentLoaded.
   Self-contained; does not touch main.js.
   ============================================================ */
(function () {
  "use strict";
  var doc = document;
  var root = doc.documentElement;

  // Mark early so CSS can hide reveal targets before paint.
  root.classList.add("anim-ready");

  function ready(fn) {
    if (doc.readyState !== "loading") { fn(); }
    else { doc.addEventListener("DOMContentLoaded", fn); }
  }

  ready(function () {
    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var noIO = !("IntersectionObserver" in window);

    // Standalone elements (revealed individually)
    var singles = ".hero-copy,.hero-visual,.section-head,.industries-bar p," +
                  ".band-statement,.calc-card,.faq details";
    // Groups: container -> children cascade in with a stagger
    var groups = [
      ".why-grid > .why-card",
      ".demo-grid > .demo-card",
      ".pricing-grid > .price-card",
      ".trust-grid > .trust-item",
      ".timeline > .t-step",
      ".metrics > .metric"
    ];

    function show(el) { el.classList.add("is-in"); }

    // Fallback: no fancy support -> just show everything.
    if (reduce || noIO) {
      Array.prototype.forEach.call(doc.querySelectorAll(singles), show);
      groups.forEach(function (sel) {
        Array.prototype.forEach.call(doc.querySelectorAll(sel), show);
      });
      wireHeader();
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        if (el.__group) {
          // cascade children with a small stagger
          var kids = el.__kids;
          for (var i = 0; i < kids.length; i++) {
            (function (kid, idx) {
              setTimeout(function () { show(kid); }, idx * 90);
            })(kids[i], i);
          }
        } else {
          show(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    // observe singles
    Array.prototype.forEach.call(doc.querySelectorAll(singles), function (el) {
      io.observe(el);
    });

    // observe group containers (so children reveal together, staggered)
    groups.forEach(function (sel) {
      var kids = Array.prototype.slice.call(doc.querySelectorAll(sel));
      if (!kids.length) return;
      var container = kids[0].parentNode;
      if (!container || container.__group) return;
      container.__group = true;
      container.__kids = kids;
      io.observe(container);
    });

    wireHeader();
  });

  function wireHeader() {
    var header = doc.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();
