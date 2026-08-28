const address = document.getElementById("address");

const page = document.getElementById("page");

const homePage = document.getElementById("homePage");

const errorPage = document.getElementById("errorPage");

const errorText = document.getElementById("errorText");

const loadingBar = document.getElementById("loadingBar");

const tabTitle = document.getElementById("tabTitle");

const homeSearch = document.getElementById("homeSearch");


/* =========================================
   SETTINGS
========================================= */

const HOME_URL = "about:home";


/*
 * These are URLs for pages you own/control.
 *
 * You can add multiple CDN mirrors.
 */
const SOURCES = [];


/* =========================================
   STATE
========================================= */

let history = [];

let historyIndex = -1;

let currentURL = "";

let loading = false;


/* =========================================
   URL HANDLING
========================================= */

function normalizeURL(input) {

  input = input.trim();

  if (!input) {
    return null;
  }

  /*
   * If it looks like a URL,
   * open it directly.
   */
  if (
    input.startsWith("http://") ||
    input.startsWith("https://")
  ) {
    try {
      return new URL(input).href;
    } catch {
      return null;
    }
  }


  /*
   * Otherwise treat it as a search.
   */
  return (
    "https://www.google.com/search?q=" +
    encodeURIComponent(input)
  );
}


/* =========================================
   LOADING UI
========================================= */

function loadingStart() {

  loading = true;

  loadingBar.style.width = "20%";

  setTimeout(() => {

    if (loading) {
      loadingBar.style.width = "60%";
    }

  }, 250);
}


function loadingEnd() {

  loading = false;

  loadingBar.style.width = "100%";

  setTimeout(() => {

    loadingBar.style.width = "0%";

  }, 250);
}


/* =========================================
   HOME
========================================= */

function showHome() {

  page.style.display = "none";

  errorPage.style.display = "none";

  homePage.style.display = "flex";

  address.value = "";

  tabTitle.textContent = "New Tab";

  currentURL = "";

}


/* =========================================
   ERROR
========================================= */

function showError(message) {

  page.style.display = "none";

  homePage.style.display = "none";

  errorPage.style.display = "flex";

  errorText.textContent = message;

}


function hideError() {

  errorPage.style.display = "none";

}


/* =========================================
   NORMAL IFRAME
========================================= */

function loadIframe(url) {

  return new Promise((resolve, reject) => {

    let finished = false;

    const timeout = setTimeout(() => {

      if (finished) return;

      finished = true;

      reject(
        new Error(
          "The site did not allow the browser frame to load."
        )
      );

    }, 8000);


    function loaded() {

      if (finished) return;

      finished = true;

      clearTimeout(timeout);

      resolve();

    }


    page.addEventListener(
      "load",
      loaded,
      { once: true }
    );


    page.src = url;

  });

}


/* =========================================
   SRCdoc LOADER
========================================= */

/*
 * This is the Arctic-style portion.
 *
 * It fetches HTML, turns it into text,
 * adds a <base> URL, then puts the HTML
 * into iframe.srcdoc.
 *
 * Use this with pages you own/control
 * or are authorized to redistribute.
 */

async function loadSrcDoc(url) {

  const response = await fetch(
    url + (
      url.includes("?")
        ? "&"
        : "?"
    ) + "d=" + Date.now(),
    {
      cache: "no-store"
    }
  );


  if (!response.ok) {

    throw new Error(
      "HTTP " + response.status
    );

  }


  const html = await response.text();


  if (!html.trim()) {

    throw new Error(
      "The server returned an empty page."
    );

  }


  /*
   * Make relative paths such as:
   *
   * ./script.js
   * ./style.css
   * ./assets/image.png
   *
   * resolve relative to the original page.
   */
  const baseURL =
    new URL(".", url).href;


  let finalHTML = html;


  if (/<head[\s>]/i.test(finalHTML)) {

    finalHTML =
      finalHTML.replace(
        /<head([^>]*)>/i,

        `<head$1>
          <base href="${baseURL}">
        `
      );

  } else {

    finalHTML =
      `<base href="${baseURL}">` +
      finalHTML;

  }


  page.srcdoc = finalHTML;

}


/* =========================================
   NAVIGATION
========================================= */

async function navigate(
  input,
  saveHistory = true
) {

  const url =
    normalizeURL(input);


  if (!url) {

    showError(
      "That isn't a valid address."
    );

    return;

  }


  if (url === HOME_URL) {

    showHome();

    return;

  }


  hideError();

  homePage.style.display = "none";

  page.style.display = "block";


  address.value = url;

  tabTitle.textContent = "Loading...";


  loadingStart();


  try {

    /*
     * First try normal iframe loading.
     *
     * This is the safest option.
     */
    await loadIframe(url);


    tabTitle.textContent =
      getHostname(url);


  } catch (iframeError) {

    console.log(
      "Normal iframe failed:",
      iframeError
    );


    /*
     * Then try the Arctic-style
     * fetch/srcdoc mechanism ONLY when
     * a permitted source is available.
     */
    let loaded = false;


    for (const source of SOURCES) {

      try {

        await loadSrcDoc(source);

        loaded = true;

        tabTitle.textContent =
          getHostname(source);

        break;

      } catch (error) {

        console.log(
          "Source failed:",
          source,
          error
        );

      }

    }


    if (!loaded) {

      showError(
        "This page could not be loaded. " +
        "The destination may prohibit embedding, " +
        "or its content may not permit browser-side fetching."
      );

    }

  }


  loadingEnd();


  if (saveHistory) {

    history =
      history.slice(
        0,
        historyIndex + 1
      );

    history.push(url);

    historyIndex =
      history.length - 1;

  }


  currentURL = url;

}


/* =========================================
   HOSTNAME
========================================= */

function getHostname(url) {

  try {

    return new URL(url).hostname;

  } catch {

    return "Page";

  }

}


/* =========================================
   BACK
========================================= */

function goBack() {

  if (historyIndex <= 0) {
    return;
  }


  historyIndex--;


  const url =
    history[historyIndex];


  navigate(
    url,
    false
  );

}


/* =========================================
   FORWARD
========================================= */

function goForward() {

  if (
    historyIndex >=
    history.length - 1
  ) {

    return;

  }


  historyIndex++;


  const url =
    history[historyIndex];


  navigate(
    url,
    false
  );

}


/* =========================================
   RELOAD
========================================= */

function reloadPage() {

  if (!currentURL) {

    showHome();

    return;

  }


  navigate(
    currentURL,
    false
  );

}


/* =========================================
   FULLSCREEN
========================================= */

function fullscreen() {

  const browser =
    document.getElementById(
      "browser"
    );


  if (
    document.fullscreenElement
  ) {

    document.exitFullscreen();

    return;

  }


  if (
    browser.requestFullscreen
  ) {

    browser.requestFullscreen();

  }

}


/* =========================================
   EVENTS
========================================= */

document
  .getElementById("back")
  .addEventListener(
    "click",
    goBack
  );


document
  .getElementById("forward")
  .addEventListener(
    "click",
    goForward
  );


document
  .getElementById("reload")
  .addEventListener(
    "click",
    reloadPage
  );


document
  .getElementById("home")
  .addEventListener(
    "click",
    showHome
  );


document
  .getElementById("fullscreen")
  .addEventListener(
    "click",
    fullscreen
  );


document
  .getElementById("newTab")
  .addEventListener(
    "click",
    showHome
  );


document
  .getElementById("go")
  .addEventListener(
    "click",
    () => {

      navigate(
        address.value
      );

    }
  );


document
  .getElementById("retry")
  .addEventListener(
    "click",
    () => {

      if (currentURL) {

        navigate(
          currentURL,
          false
        );

      }

    }
  );


address.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      navigate(
        address.value
      );

    }

  }
);


homeSearch.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      navigate(
        homeSearch.value
      );

    }

  }
);


document
  .getElementById("homeGo")
  .addEventListener(
    "click",
    () => {

      navigate(
        homeSearch.value
      );

    }
  );


/* =========================================
   START
========================================= */

showHome();
