const address = document.getElementById("address");
const page = document.getElementById("page");
const homePage = document.getElementById("homePage");
const errorPage = document.getElementById("errorPage");
const errorText = document.getElementById("errorText");
const loadingBar = document.getElementById("loadingBar");
const tabTitle = document.getElementById("tabTitle");
const homeSearch = document.getElementById("homeSearch");

let socket = null;
let currentURL = "";
let connected = false;


/* ================================
   CONNECT TO REMOTE BROWSER
================================ */

function connectBrowser() {

    const protocol =
        location.protocol === "https:"
            ? "wss:"
            : "ws:";

    /*
     * For local testing, the GitHub HTTPS page
     * cannot directly use ws://localhost from
     * a secure page.
     *
     * Therefore connect explicitly to the
     * local backend.
     */

    socket = new WebSocket(
        "ws://localhost:3000"
    );


    socket.addEventListener("open", () => {

        connected = true;

        console.log(
            "Connected to Veteran Eagles browser."
        );

        tabTitle.textContent =
            "Veteran Eagles";

    });


    socket.addEventListener("message", event => {

        try {

            const message =
                JSON.parse(event.data);

            handleBrowserMessage(message);

        } catch (error) {

            console.error(
                "Invalid browser message:",
                error
            );

        }

    });


    socket.addEventListener("close", () => {

        connected = false;

        console.log(
            "Remote browser disconnected."
        );

        showError(
            "The Veteran Eagles browser server is not connected. " +
            "Make sure server.js is running on your computer."
        );

    });


    socket.addEventListener("error", error => {

        console.error(
            "WebSocket error:",
            error
        );

    });

}


/* ================================
   HANDLE SERVER
================================ */

function handleBrowserMessage(message) {

    if (message.type === "ready") {

        connected = true;

        if (message.url) {

            currentURL =
                message.url;

            address.value =
                message.url;

        }

        return;
    }


    if (message.type === "loaded") {

        currentURL =
            message.url;

        address.value =
            message.url;

        tabTitle.textContent =
            getHostname(message.url);

        hideError();

        finishLoading();

        return;
    }


    if (message.type === "screen") {

        /*
         * The remote Chromium screenshot is
         * displayed inside the browser UI.
         */

        displayScreenshot(
            message.data
        );

        if (message.url) {

            currentURL =
                message.url;

            address.value =
                message.url;

            tabTitle.textContent =
                getHostname(message.url);

        }

        finishLoading();

        return;
    }


    if (message.type === "error") {

        showError(
            message.message ||
            "The remote browser encountered an error."
        );

    }

}


/* ================================
   DISPLAY REMOTE SCREEN
================================ */

function displayScreenshot(base64) {

    page.style.display = "block";

    homePage.style.display = "none";

    errorPage.style.display = "none";

    /*
     * The existing iframe is replaced visually
     * with the Chromium screenshot.
     */

    page.srcdoc = `
        <!DOCTYPE html>
        <html>
        <head>
        <style>
        html,body {
            margin:0;
            padding:0;
            width:100%;
            height:100%;
            overflow:hidden;
            background:#000;
        }

        img {
            display:block;
            width:100%;
            height:100%;
            object-fit:contain;
            background:#000;
            user-select:none;
            -webkit-user-drag:none;
        }
        </style>
        </head>

        <body>

        <img
            src="data:image/jpeg;base64,${base64}"
            draggable="false"
        >

        </body>
        </html>
    `;

}


/* ================================
   NAVIGATION
================================ */

function navigate(input) {

    const url =
        normalizeURL(input);

    if (!url) {

        showError(
            "Enter a valid website address."
        );

        return;

    }


    if (!connected) {

        showError(
            "The remote browser is not connected. " +
            "Make sure server.js is running."
        );

        return;

    }


    address.value = url;

    tabTitle.textContent =
        "Loading...";

    currentURL = url;

    startLoading();


    socket.send(
        JSON.stringify({
            type: "navigate",
            url: url
        })
    );

}


/* ================================
   URL NORMALIZATION
================================ */

function normalizeURL(input) {

    input =
        input.trim();

    if (!input) {
        return null;
    }


    if (
        input.startsWith("http://") ||
        input.startsWith("https://")
    ) {

        return input;

    }


    if (
        input.includes(".") &&
        !input.includes(" ")
    ) {

        return (
            "https://" +
            input
        );

    }


    return (
        "https://www.google.com/search?q=" +
        encodeURIComponent(input)
    );

}


/* ================================
   BUTTON COMMANDS
================================ */

function sendCommand(type) {

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {

        showError(
            "Remote browser is not connected."
        );

        return;

    }


    socket.send(
        JSON.stringify({
            type: type
        })
    );

}


/* ================================
   BACK
================================ */

function goBack() {

    sendCommand("back");

    startLoading();

}


/* ================================
   FORWARD
================================ */

function goForward() {

    sendCommand("forward");

    startLoading();

}


/* ================================
   RELOAD
================================ */

function reloadPage() {

    if (!currentURL) {

        showHome();

        return;

    }

    sendCommand("reload");

    startLoading();

}


/* ================================
   LOADING
================================ */

function startLoading() {

    loadingBar.style.width =
        "20%";

    setTimeout(() => {

        loadingBar.style.width =
            "60%";

    }, 150);

}


function finishLoading() {

    loadingBar.style.width =
        "100%";

    setTimeout(() => {

        loadingBar.style.width =
            "0%";

    }, 250);

}


/* ================================
   HOME
================================ */

function showHome() {

    page.style.display =
        "none";

    errorPage.style.display =
        "none";

    homePage.style.display =
        "flex";

    address.value = "";

    tabTitle.textContent =
        "Veteran Eagles";

    currentURL = "";

}


/* ================================
   ERROR
================================ */

function showError(message) {

    page.style.display =
        "none";

    homePage.style.display =
        "none";

    errorPage.style.display =
        "flex";

    errorText.textContent =
        message;

}


/* ================================
   HOSTNAME
================================ */

function getHostname(url) {

    try {

        return new URL(url)
            .hostname
            .replace(/^www\./, "");

    } catch {

        return "Website";

    }

}


/* ================================
   FULLSCREEN
================================ */

function fullscreen() {

    const browser =
        document.getElementById(
            "browser"
        );

    if (
        document.fullscreenElement
    ) {

        document.exitFullscreen();

    } else {

        browser.requestFullscreen();

    }

}


/* ================================
   UI EVENTS
================================ */

document
    .getElementById("back")
    .onclick = goBack;


document
    .getElementById("forward")
    .onclick = goForward;


document
    .getElementById("reload")
    .onclick = reloadPage;


document
    .getElementById("home")
    .onclick = showHome;


document
    .getElementById("fullscreen")
    .onclick = fullscreen;


document
    .getElementById("newTab")
    .onclick = showHome;


document
    .getElementById("go")
    .onclick = () => {

        navigate(
            address.value
        );

    };


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
    .onclick = () => {

        navigate(
            homeSearch.value
        );

    };


document
    .getElementById("retry")
    .onclick = () => {

        if (currentURL) {

            navigate(
                currentURL
            );

        } else {

            connectBrowser();

        }

    };


/* ================================
   START
================================ */

showHome();

connectBrowser();
