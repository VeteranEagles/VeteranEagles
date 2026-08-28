const address = document.getElementById("address");
const page = document.getElementById("page");
const homePage = document.getElementById("homePage");
const errorPage = document.getElementById("errorPage");
const errorText = document.getElementById("errorText");
const loadingBar = document.getElementById("loadingBar");
const tabTitle = document.getElementById("tabTitle");
const homeSearch = document.getElementById("homeSearch");

let history = [];
let historyIndex = -1;
let currentURL = "";
let loadTimer = null;


/* ================================
   URL
================================ */

function normalizeURL(input) {
  input = input.trim();

  if (!input) return null;

  if (
    input.startsWith("http://") ||
    input.startsWith("https://")
  ) {
    return input;
  }

  /*
   * Treat things such as:
   * google.com
   * youtube.com
   * example.com/test
   * as URLs.
   */
  if (
    input.includes(".") &&
    !input.includes(" ")
  ) {
    return "https://" + input;
  }

  return (
    "https://www.google.com/search?q=" +
    encodeURIComponent(input)
  );
}


/* ================================
   LOADING UI
================================ */

function startLoading() {
  clearTimeout(loadTimer);

  loadingBar.style.width = "15%";

  requestAnimationFrame(() => {
    loadingBar.style.width = "55%";
  });
}


function finishLoading() {
  clearTimeout(loadTimer);

  loadingBar.style.width = "100%";

  setTimeout(() => {
    loadingBar.style.width = "0%";
  }, 250);
}


/* ================================
   HOME
================================ */

function showHome() {
  clearTimeout(loadTimer);

  page.style.display = "none";
  errorPage.style.display = "none";
  homePage.style.display = "flex";

  address.value = "";
  tabTitle.textContent = "Veteran Eagles";

  currentURL = "";

  finishLoading();
}


/* ================================
   ERROR
================================ */

function showError(message) {
  page.style.display = "none";
  homePage.style.display = "none";
  errorPage.style.display = "flex";

  errorText.textContent = message;

  finishLoading();
}


/* ================================
   LOAD PAGE
================================ */

function loadPage(url) {
  return new Promise((resolve, reject) => {

    let completed = false;

    clearTimeout(loadTimer);

    const cleanup = () => {
      clearTimeout(loadTimer);
      page.removeEventListener("load", onLoad);
    };

    const onLoad = () => {
      if (completed) return;

      completed = true;

      cleanup();

      resolve();
    };

    page.addEventListener("load", onLoad);

    /*
     * A load event can fail to happen when the
     * destination refuses iframe embedding.
     */
    loadTimer = setTimeout(() => {

      if (completed) return;

      completed = true;

      cleanup();

      reject(
        new Error(
          "The website did not allow itself to be embedded."
        )
      );

    }, 10000);

    page.src = url;
  });
}


/* ================================
   NAVIGATE
================================ */

async function navigate(input, saveHistory = true) {

  const url = normalizeURL(input);

  if (!url) {
    showError("Enter a website address or search.");
    return;
  }

  hideError();

  homePage.style.display = "none";
  page.style.display = "block";

  address.value = url;

  tabTitle.textContent = "Loading...";

  currentURL = url;

  startLoading();

  try {

    await loadPage(url);

    tabTitle.textContent = getTitleFromURL(url);

    finishLoading();

    if (saveHistory) {

      history =
        history.slice(0, historyIndex + 1);

      history.push(url);

      historyIndex =
        history.length - 1;
    }

  } catch (error) {

    console.log(
      "Page failed to load:",
      url,
      error
    );

    showError(
      "This website refused to load inside the Veteran Eagles browser. " +
      "The site may block iframe embedding."
    );

  }
}


/* ================================
   HIDE ERROR
================================ */

function hideError() {
  errorPage.style.display = "none";
}


/* ================================
   TITLE
================================ */

function getTitleFromURL(url) {

  try {

    const hostname =
      new URL(url).hostname;

    return hostname
      .replace(/^www\./, "");

  } catch {

    return "Website";

  }
}


/* ================================
   BACK
================================ */

function goBack() {

  if (historyIndex <= 0) {
    return;
  }

  historyIndex--;

  navigate(
    history[historyIndex],
    false
  );
}


/* ================================
   FORWARD
================================ */

function goForward() {

  if (
    historyIndex >=
    history.length - 1
  ) {
    return;
  }

  historyIndex++;

  navigate(
    history[historyIndex],
    false
  );
}


/* ================================
   RELOAD
================================ */

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


/* ================================
   FULLSCREEN
================================ */

function fullscreen() {

  const browser =
    document.getElementById("browser");

  if (document.fullscreenElement) {

    document.exitFullscreen();

  } else if (browser.requestFullscreen) {

    browser.requestFullscreen();

  }
}


/* ================================
   BUTTONS
================================ */

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
      navigate(address.value);
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


/* ================================
   ADDRESS ENTER
================================ */

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


/* ================================
   HOME SEARCH
================================ */

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


/* ================================
   START
================================ */

showHome();
