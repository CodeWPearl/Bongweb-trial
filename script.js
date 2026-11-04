(function () {
  var cfg = window.BONGWEB_CONFIG || {};

  // One place that builds WhatsApp links (grow.js uses it for the branch cards too)
  function waLink(msg) {
    return "https://wa.me/" + cfg.whatsappNumber + "?text=" + encodeURIComponent(msg || "Hi Bongweb");
  }
  window.bongwebWa = waLink;

  document.querySelectorAll(".js-wa").forEach(function (a) {
    a.href = waLink(a.getAttribute("data-msg"));
    a.target = "_blank";
    a.rel = "noopener";
  });
  document.querySelectorAll(".js-mail").forEach(function (a) {
    a.href = "mailto:" + cfg.email + "?subject=" + encodeURIComponent("Project enquiry");
    if (a.classList.contains("js-mail-text")) a.textContent = cfg.email;
  });
})();
