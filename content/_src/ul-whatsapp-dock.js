/**
 * Static preview + WordPress-safe WhatsApp dock.
 * Desktop (>=1025px): standard floating WhatsApp button.
 * Mobile/tablet (<=1024px): right-edge semicircle tab that pops out
 * WhatsApp + same-size empty slot diagonally above the CTA banner.
 * Does not modify rerenderer.js.
 */
(function () {
  function ready(cb) {
    if (document.readyState !== "loading") cb();
    else document.addEventListener("DOMContentLoaded", cb);
  }

  function ensureStyles() {
    if (document.getElementById("ul-wa-static-style")) return;
    var style = document.createElement("style");
    style.id = "ul-wa-static-style";
    style.textContent = [
      "@keyframes ul-wa-pulse{0%{box-shadow:0 0 0 0 rgba(0,212,232,.5)}70%{box-shadow:0 0 0 14px rgba(0,212,232,0)}100%{box-shadow:0 0 0 0 rgba(0,212,232,0)}}",
      "#ul-whatsapp-btn{position:fixed;bottom:40px;right:50px;z-index:99999;width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a24 100%);border:1.5px solid rgba(0,212,232,.4);display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(0,212,232,.2),inset 0 0 8px rgba(0,212,232,.05);cursor:pointer;text-decoration:none;animation:ul-wa-pulse 2.5s ease-in-out infinite;transition:transform .3s cubic-bezier(.34,1.56,.64,1),border-color .3s ease,box-shadow .3s ease;overflow:hidden}",
      "#ul-whatsapp-btn svg{pointer-events:none;fill:#00d4e8;filter:drop-shadow(0 0 4px rgba(0,212,232,.4));width:30px;height:30px}",
      "@media (min-width:1025px){#ul-whatsapp-btn{right:90px!important;bottom:15px!important;width:60px!important;height:60px!important}#ul-wa-dock{display:none!important}}",
      "@media (max-width:1024px){",
      "#ul-whatsapp-btn{animation:none!important}",
      "#ul-wa-dock #ul-whatsapp-btn::before{display:none!important;opacity:0!important}",
      "#ul-wa-dock #ul-whatsapp-btn:hover{transform:none!important;animation:none!important}",
      "#ul-wa-dock{position:fixed;right:0;bottom:24px;width:0;height:0;z-index:2147482000}",
      "#ul-wa-stack{position:absolute;right:6px;bottom:30px;width:190px;height:190px;pointer-events:none;transform-origin:bottom right;transition:transform .45s cubic-bezier(.34,1.56,.64,1),opacity .32s ease}",
      "#ul-wa-dock:not(.ul-wa-open) #ul-wa-stack{transform:translate(46px,56px) scale(.3) rotate(-6deg);opacity:0}",
      "#ul-wa-dock.ul-wa-open #ul-wa-stack{transform:none;opacity:1}",
      "#ul-wa-stack>*{position:absolute;pointer-events:auto}",
      "#ul-wa-dock #ul-whatsapp-btn{position:absolute!important;right:30px!important;bottom:52px!important;left:auto!important;top:auto!important;margin:0!important;width:72px!important;height:72px!important;opacity:1!important;transform:none!important;pointer-events:auto!important}",
      "#ul-wa-dock #ul-whatsapp-btn svg{width:36px!important;height:36px!important}",
      "#ul-wa-slot{right:88px;bottom:-8px;width:72px;height:72px;border-radius:50%;border:2px dashed rgba(0,212,232,.4);background:rgba(0,212,232,.06)}",
      "#ul-wa-tab{position:absolute;right:0;bottom:0;width:36px;height:84px;padding:0;cursor:pointer;pointer-events:auto;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a24 100%);border:1.5px solid rgba(0,212,232,.45);border-right:0;border-top-left-radius:84px;border-bottom-left-radius:84px;box-shadow:none;display:flex;align-items:center;justify-content:center}",
      "#ul-wa-tab svg{width:20px;height:20px;transition:transform .4s ease}",
      "#ul-wa-dock.ul-wa-open #ul-wa-tab svg{transform:rotate(180deg)}",
      "}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureWhatsAppBtn() {
    var btn = document.getElementById("ul-whatsapp-btn");
    if (btn) return btn;
    btn = document.createElement("a");
    btn.id = "ul-whatsapp-btn";
    btn.href = "https://wa.me/85284007393";
    btn.target = "_blank";
    btn.rel = "noopener noreferrer";
    btn.setAttribute("aria-label", "Chat on WhatsApp");
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39.504 39.504" width="30" height="30"><path d="M19.752 0C8.858 0 0 8.858 0 19.752c0 3.478.91 6.876 2.636 9.876L.058 39.504l10.1-2.633a19.63 19.63 0 0 0 9.594 2.494C30.646 39.365 39.504 30.507 39.504 19.613 39.504 8.858 30.646 0 19.752 0zm0 36.23a16.36 16.36 0 0 1-8.82-2.575l-.632-.382-6.557 1.719 1.75-6.397-.42-.667A16.345 16.345 0 0 1 3.136 19.752c0-9.151 7.465-16.617 16.616-16.617 9.151 0 16.617 7.466 16.617 16.617S28.903 36.23 19.752 36.23zm9.117-12.443c-.5-.25-2.954-1.457-3.413-1.623-.458-.167-.792-.25-1.125.25s-1.292 1.623-1.583 1.957c-.292.333-.583.375-1.083.125s-2.113-.778-4.025-2.484c-1.488-1.328-2.492-2.966-2.784-3.466s-.031-.771.219-1.02c.225-.225.5-.583.75-.875s.333-.5.5-.833c.167-.333.083-.625-.042-.875s-1.125-2.709-1.542-3.709c-.406-.975-.82-.843-1.125-.859-.292-.015-.625-.018-.958-.018s-.875.125-1.333.625-1.75 1.708-1.75 4.166 1.792 4.833 2.042 5.166c.25.333 3.525 5.38 8.542 7.542 1.193.515 2.125.823 2.852 1.053 1.198.381 2.288.327 3.15.198.961-.143 2.954-1.207 3.371-2.373.417-1.167.417-2.167.292-2.375-.125-.208-.458-.333-.958-.583z"/></svg>';
    document.body.appendChild(btn);
    return btn;
  }

  function isMT() {
    return window.innerWidth <= 1024;
  }

  // Hover-capable pointer (mouse) vs. touch. On touch we keep the dock open
  // until the user taps elsewhere; hover devices may also use hover/scroll.
  var HOVER = !!(window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches);

  function init(btn) {
    var dock = document.getElementById("ul-wa-dock");
    var stack, slot, closeTimer = null;
    function open() {
      if (isMT()) {
        clearTimeout(closeTimer);
        dock.classList.add("ul-wa-open");
      }
    }
    function close() {
      clearTimeout(closeTimer);
      dock.classList.remove("ul-wa-open");
    }
    function scheduleClose() {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(close, 280);
    }
    function cancelClose() {
      clearTimeout(closeTimer);
    }
    if (!dock) {
      dock = document.createElement("div");
      dock.id = "ul-wa-dock";
      stack = document.createElement("div");
      stack.id = "ul-wa-stack";
      slot = document.createElement("div");
      slot.id = "ul-wa-slot";
      slot.setAttribute("aria-hidden", "true");
      var tab = document.createElement("button");
      tab.id = "ul-wa-tab";
      tab.type = "button";
      tab.setAttribute("aria-label", "展開聯絡按鈕");
      tab.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-6 7 6 7" fill="none" stroke="#00d4e8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      stack.appendChild(slot);
      dock.appendChild(stack);
      dock.appendChild(tab);
      document.body.appendChild(dock);
      tab.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        open();
      });
      // Hovering (mouse) or tapping the tab pops the buttons out. Once open it
      // STAYS open — moving the mouse away does NOT close it; only a click/tap
      // elsewhere on the page closes it.
      if (HOVER) {
        tab.addEventListener("mouseenter", open);
        stack.addEventListener("mouseenter", open);
      }
    }
    stack = document.getElementById("ul-wa-stack");
    slot = document.getElementById("ul-wa-slot");
    function placeBtn() {
      if (isMT()) {
        if (btn.parentNode !== stack) stack.insertBefore(btn, slot);
      } else {
        if (btn.parentNode !== document.body) document.body.appendChild(btn);
        close();
      }
    }
    window.addEventListener("resize", function () {
      placeBtn();
      if (!isMT()) close();
    });
    document.addEventListener("click", function (e) {
      if (!dock.contains(e.target)) close();
    }, true);
    btn.addEventListener("click", function () { close(); });
    placeBtn();
  }

  ready(function () {
    ensureStyles();
    init(ensureWhatsAppBtn());
  });
})();
