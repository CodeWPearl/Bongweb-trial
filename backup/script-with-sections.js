(function () {
  var cfg = window.BONGWEB_CONFIG || {};
  var groups = window.BONGWEB_GROUPS || [];
  var services = (window.BONGWEB_SERVICES || []).filter(function (s) { return s.status !== "hide"; });

  function waLink(msg) {
    return "https://wa.me/" + cfg.whatsappNumber + "?text=" + encodeURIComponent(msg);
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  // Service groups and cards, built from data/services.js
  var tabs = document.getElementById("group-tabs");
  var host = document.getElementById("service-groups");
  var select = document.getElementById("service-select");

  groups.forEach(function (g, i) {
    var items = services.filter(function (s) { return s.group === g.id; });
    if (!items.length) return;

    var tab = el("a", "group-tab");
    tab.href = "#group-" + g.id;
    tab.innerHTML = "<span class='group-tab-num'>0" + (i + 1) + "</span>";
    tab.appendChild(document.createTextNode(g.name));
    tabs.appendChild(tab);

    var section = el("div", "group");
    section.id = "group-" + g.id;
    var head = el("div", "group-head");
    head.appendChild(el("h3", "group-name", g.name));
    head.appendChild(el("p", "group-promise", g.promise));
    section.appendChild(head);

    var grid = el("div", "cards");
    var optgroup = document.createElement("optgroup");
    optgroup.label = g.name;

    items.forEach(function (s) {
      var soon = s.status === "coming-soon";
      var card = el("article", "card" + (soon ? " card-soon" : ""));
      if (soon) card.appendChild(el("span", "tag", "Coming soon"));
      card.appendChild(el("h4", "card-title", s.name));
      card.appendChild(el("p", "card-gets", s.gets));
      var btn = el("a", "card-btn");
      btn.href = waLink(soon
        ? "Hi Bongweb, please let me know when " + s.name + " is available."
        : "Hi Bongweb, I'm interested in " + s.name + ".");
      btn.target = "_blank";
      btn.rel = "noopener";
      btn.textContent = soon ? "Tell me when it's ready" : "Enquire";
      card.appendChild(btn);
      grid.appendChild(card);

      var opt = document.createElement("option");
      opt.value = s.name;
      opt.textContent = s.name + (soon ? " (coming soon)" : "");
      optgroup.appendChild(opt);
    });

    section.appendChild(grid);
    host.appendChild(section);
    select.appendChild(optgroup);
  });

  // Featured pack
  if (cfg.showFeaturedPack) document.getElementById("featured").hidden = false;

  // WhatsApp and email links
  document.querySelectorAll(".js-wa").forEach(function (a) {
    a.href = waLink(a.getAttribute("data-msg") || "Hi Bongweb");
    a.target = "_blank";
    a.rel = "noopener";
  });
  document.querySelectorAll(".js-mail").forEach(function (a) {
    a.href = "mailto:" + cfg.email + "?subject=" + encodeURIComponent("Project enquiry");
    if (a.classList.contains("js-mail-text")) a.textContent = cfg.email;
  });

  // Form: compose a WhatsApp message
  var form = document.getElementById("enquire-form");
  var err = document.getElementById("form-error");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var name = (d.get("name") || "").trim();
    if (!name) { err.hidden = false; form.elements.name.focus(); return; }
    err.hidden = true;
    var lines = ["Hi Bongweb, I'm " + name + (d.get("business") ? " from " + d.get("business").trim() : "") + "."];
    lines.push(d.get("service") ? "I need: " + d.get("service") + "." : "I'm not sure yet what I need.");
    if ((d.get("details") || "").trim()) lines.push(d.get("details").trim());
    var url = waLink(lines.join("\n"));
    document.getElementById("form-link").href = url;
    document.getElementById("form-done").hidden = false;
    window.open(url, "_blank", "noopener");
  });

  // Highlight the group tab in view
  if ("IntersectionObserver" in window) {
    var links = tabs.querySelectorAll("a");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle("is-active", l.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    host.querySelectorAll(".group").forEach(function (g) { io.observe(g); });
  }
})();
