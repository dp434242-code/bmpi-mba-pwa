(function () {
  "use strict";

  var config = window.BMPI_PWA_CONFIG || {};
  var setupScreen = document.getElementById("setup-screen");
  var appRoot = document.getElementById("app-root");
  var frame = document.getElementById("portal-frame");
  var loading = document.getElementById("loading");
  var frameHelp = document.getElementById("frame-help");
  var installButton = document.getElementById("install-button");
  var offlineBanner = document.getElementById("offline-banner");
  var openDirect = document.getElementById("open-direct");
  var deferredInstallPrompt = null;
  var loadTimer = null;

  function isValidPortalUrl(value) {
    try {
      var parsed = new URL(String(value || ""));
      return (
        parsed.protocol === "https:" &&
        parsed.hostname === "script.google.com" &&
        /^\/(?:a\/)?macros\/(?:s\/[^/]+\/|[^/]+\/s\/[^/]+\/)(exec|dev)\/?$/.test(
          parsed.pathname
        )
      );
    } catch (error) {
      return false;
    }
  }

  function showOfflineState() {
    offlineBanner.hidden = navigator.onLine;
  }

  function hideLoading() {
    if (loadTimer) clearTimeout(loadTimer);
    loading.classList.add("is-hidden");
    window.setTimeout(function () {
      loading.hidden = true;
    }, 300);
  }

  var portalUrl = String(config.portalUrl || "").trim();
  if (!portalUrl || !isValidPortalUrl(portalUrl)) {
    setupScreen.hidden = false;
    appRoot.hidden = true;
    return;
  }

  setupScreen.hidden = true;
  appRoot.hidden = false;
  openDirect.href = portalUrl;
  document.getElementById("help-button").addEventListener("click", function () {
    window.open(portalUrl, "_blank", "noopener");
  });
  document.getElementById("retry-frame").addEventListener("click", function () {
    frameHelp.hidden = true;
    loading.hidden = false;
    loading.classList.remove("is-hidden");
    frame.src =
      portalUrl +
      (portalUrl.indexOf("?") === -1 ? "?" : "&") +
      "pwaReload=" +
      Date.now();
    armLoadTimeout();
  });

  function armLoadTimeout() {
    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = window.setTimeout(function () {
      frameHelp.hidden = false;
    }, 18000);
  }

  frame.addEventListener("load", function () {
    hideLoading();
    frameHelp.hidden = true;
  });
  frame.src = portalUrl;
  armLoadTimeout();

  window.addEventListener("online", showOfflineState);
  window.addEventListener("offline", showOfflineState);
  showOfflineState();

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener("click", async function () {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener("appinstalled", function () {
    installButton.hidden = true;
    deferredInstallPrompt = null;
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker
        .register("./sw.js", { scope: "./" })
        .catch(function (error) {
          console.warn("BMPI PWA service worker registration failed:", error);
        });
    });
  }
})();
