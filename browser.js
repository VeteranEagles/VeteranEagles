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

const REMOTE_WIDTH = 1280;
const REMOTE_HEIGHT = 720;


/* =========================================
   CONNECT
========================================= */

function connectBrowser() {

    socket = new WebSocket("ws://localhost:3000");

    socket.addEventListener("open", () => {

        connected = true;

        console.log(
            "Connected to Veteran Eagles browser."
        );

    });

    socket.addEventListener("message", event => {

        try {

            const message =
                JSON.parse(event.data);

            handleBrowserMessage(message);

        } catch (err) {

            console.error(
                "Invalid browser message:",
                err
            );

        }

    });

    socket.addEventListener("close", () => {

        connected = false;

        console.log(
            "Remote browser disconnected."
        );

        showError(
            "The Veteran Eagles browser server is not running."
        );

    });

    socket.addEventListener("error", err => {

        console.error(
            "WebSocket error:",
            err
        );

    });

}


/* =========================================
   SERVER MESSAGES
========================================= */

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
            "Remote browser error."
        );

    }

}


/* =========================================
   DISPLAY SCREEN
========================================= */

function displayScreenshot(base64) {

    page.style.display = "block";
    homePage.style.display = "none";
    errorPage.style.display = "none";

    // Create the remote screen only once.
    if (!page.dataset.remoteScreenReady) {

        page.dataset.remoteScreenReady = "true";

        page.srcdoc = `
<!DOCTYPE html>
<html>
<head>
<style>
html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #000;
}

body {
    outline: none;
}

#remoteScreen {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: fill;
    user-select: none;
    -webkit-user-drag: none;
    cursor: default;
}
</style>
</head>

<body tabindex="0">

<img
    id="remoteScreen"
    draggable="false"
>

<script>

const img = document.getElementById("remoteScreen");
const body = document.body;

function coordinates(event) {

    const rect = img.getBoundingClientRect();

    return {
        x: Math.max(
            0,
            Math.min(
                ${REMOTE_WIDTH},
                (event.clientX - rect.left)
                * ${REMOTE_WIDTH}
                / rect.width
            )
        ),

        y: Math.max(
            0,
            Math.min(
                ${REMOTE_HEIGHT},
                (event.clientY - rect.top)
                * ${REMOTE_HEIGHT}
                / rect.height
            )
        )
    };
}


/* Keep the remote browser focused */

img.addEventListener("mousedown", event => {

    body.focus();

    const pos = coordinates(event);

    parent.postMessage({
        source: "veteran-eagles-browser",
        type: "mousedown",
        x: pos.x,
        y: pos.y,
        button: event.button
    }, "*");

});


img.addEventListener("mouseup", event => {

    const pos = coordinates(event);

    parent.postMessage({
        source: "veteran-eagles-browser",
        type: "mouseup",
        x: pos.x,
        y: pos.y,
        button: event.button
    }, "*");

});


img.addEventListener("click", event => {

    const pos = coordinates(event);

    parent.postMessage({
        source: "veteran-eagles-browser",
        type: "click",
        x: pos.x,
        y: pos.y
    }, "*");

});


img.addEventListener("dblclick", event => {

    const pos = coordinates(event);

    parent.postMessage({
        source: "veteran-eagles-browser",
        type: "dblclick",
        x: pos.x,
        y: pos.y
    }, "*");

});


img.addEventListener("mousemove", event => {

    const pos = coordinates(event);

    parent.postMessage({
        source: "veteran-eagles-browser",
        type: "mousemove",
        x: pos.x,
        y: pos.y
    }, "*");

});


img.addEventListener("wheel", event => {

    event.preventDefault();

    parent.postMessage({
        source: "veteran-eagles-browser",
        type: "scroll",
        amount: event.deltaY
    }, "*");

}, { passive: false });


body.addEventListener("keydown", event => {

    parent.postMessage({
        source: "veteran-eagles-browser",
        type: "keydown",
        key: event.key
    }, "*");

    event.preventDefault();

});


body.addEventListener("keypress", event => {

    if (event.key.length === 1) {

        parent.postMessage({
            source: "veteran-eagles-browser",
            type: "type",
            text: event.key
        }, "*");

    }

});


/* Receive new screenshots without recreating the page */

window.addEventListener("message", event => {

    if (
        event.data &&
        event.data.source ===
            "veteran-eagles-screen"
    ) {

        img.src =
            "data:image/jpeg;base64," +
            event.data.data;

    }

});


body.focus();

</script>

</body>
</html>
`;

        // Wait for the iframe document to exist,
        // then send the first screenshot.
        setTimeout(() => {

            if (page.contentWindow) {

                page.contentWindow.postMessage({
                    source: "veteran-eagles-screen",
                    data: base64
                }, "*");

            }

        }, 50);

        return;
    }


    // IMPORTANT:
    // Don't recreate srcdoc.
    // Just replace the image.

    if (page.contentWindow) {

        page.contentWindow.postMessage({
            source: "veteran-eagles-screen",
            data: base64
        }, "*");

    }

}
function getCoordinates(event) {

    const rect =
        img.getBoundingClientRect();

    const x =
        (event.clientX - rect.left)
        * ${REMOTE_WIDTH}
        / rect.width;

    const y =
        (event.clientY - rect.top)
        * ${REMOTE_HEIGHT}
        / rect.height;

    return {
        x: Math.max(
            0,
            Math.min(${REMOTE_WIDTH}, x)
        ),
        y: Math.max(
            0,
            Math.min(${REMOTE_HEIGHT}, y)
        )
    };

}


/* CLICK */

img.addEventListener(
    "click",
    event => {

        const pos =
            getCoordinates(event);

        parent.postMessage({

            source:
                "veteran-eagles-browser",

            type:
                "click",

            x:
                pos.x,

            y:
                pos.y

        }, "*");

    }
);


/* DOUBLE CLICK */

img.addEventListener(
    "dblclick",
    event => {

        const pos =
            getCoordinates(event);

        parent.postMessage({

            source:
                "veteran-eagles-browser",

            type:
                "dblclick",

            x:
                pos.x,

            y:
                pos.y

        }, "*");

    }
);


/* MOUSE MOVE */

img.addEventListener(
    "mousemove",
    event => {

        const pos =
            getCoordinates(event);

        parent.postMessage({

            source:
                "veteran-eagles-browser",

            type:
                "mousemove",

            x:
                pos.x,

            y:
                pos.y

        }, "*");

    }
);


/* SCROLL */

img.addEventListener(
    "wheel",
    event => {

        event.preventDefault();

        parent.postMessage({

            source:
                "veteran-eagles-browser",

            type:
                "scroll",

            amount:
                event.deltaY

        }, "*");

    },
    { passive:false }
);


/* KEYBOARD */

document.addEventListener(
    "keydown",
    event => {

        parent.postMessage({

            source:
                "veteran-eagles-browser",

            type:
                "keydown",

            key:
                event.key

        }, "*");

        event.preventDefault();

    }
);


/* TEXT */

document.addEventListener(
    "keypress",
    event => {

        if (
            event.key.length === 1
        ) {

            parent.postMessage({

                source:
                    "veteran-eagles-browser",

                type:
                    "type",

                text:
                    event.key

            }, "*");

        }

    }
);

</script>

</body>
</html>
`;

}


/* =========================================
   RECEIVE SCREEN EVENTS
========================================= */

window.addEventListener(
    "message",
    event => {

        const data =
            event.data;

        if (
            !data ||
            data.source !==
                "veteran-eagles-browser"
        ) {
            return;
        }


        if (!socket) {
            return;
        }


        if (
            socket.readyState !==
            WebSocket.OPEN
        ) {
            return;
        }


        if (
            data.type === "click" ||
            data.type === "dblclick"
        ) {

            socket.send(
                JSON.stringify({

                    type:
                        data.type,

                    x:
                        data.x,

                    y:
                        data.y

                })
            );

            return;
        }


        if (
            data.type === "mousemove"
        ) {

            socket.send(
                JSON.stringify({

                    type:
                        "mousemove",

                    x:
                        data.x,

                    y:
                        data.y

                })
            );

            return;
        }


        if (
            data.type === "scroll"
        ) {

            socket.send(
                JSON.stringify({

                    type:
                        "scroll",

                    amount:
                        data.amount

                })
            );

            return;
        }


        if (
            data.type === "keydown"
        ) {

            socket.send(
                JSON.stringify({

                    type:
                        "keydown",

                    key:
                        data.key

                })
            );

            return;
        }


        if (
            data.type === "type"
        ) {

            socket.send(
                JSON.stringify({

                    type:
                        "type",

                    text:
                        data.text

                })
            );

        }

    }
);


/* =========================================
   NAVIGATE
========================================= */

function navigate(input) {

    const url =
        normalizeURL(input);

    if (!url) {
        return;
    }

    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN
    ) {

        showError(
            "Remote browser is not connected."
        );

        return;
    }

    address.value = url;

    currentURL = url;

    tabTitle.textContent =
        "Loading...";

    startLoading();

    socket.send(
        JSON.stringify({

            type:
                "navigate",

            url:
                url

        })
    );

}


/* =========================================
   URL
========================================= */

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


/* =========================================
   COMMAND
========================================= */

function sendCommand(type) {

    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN
    ) {
        return;
    }

    socket.send(
        JSON.stringify({
            type: type
        })
    );

}


/* =========================================
   NAVIGATION BUTTONS
========================================= */

function goBack() {

    startLoading();

    sendCommand("back");

}


function goForward() {

    startLoading();

    sendCommand("forward");

}


function reloadPage() {

    if (!currentURL) {

        showHome();

        return;
    }

    startLoading();

    sendCommand("reload");

}


/* =========================================
   HOME
========================================= */

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


/* =========================================
   ERROR
========================================= */

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


function hideError() {

    errorPage.style.display =
        "none";

}


/* =========================================
   LOADING
========================================= */

function startLoading() {

    loadingBar.style.width =
        "20%";

    setTimeout(() => {

        loadingBar.style.width =
            "60%";

    }, 100);

}


function finishLoading() {

    loadingBar.style.width =
        "100%";

    setTimeout(() => {

        loadingBar.style.width =
            "0%";

    }, 250);

}


/* =========================================
   HOSTNAME
========================================= */

function getHostname(url) {

    try {

        return new URL(url)
            .hostname
            .replace(/^www\./, "");

    } catch {

        return "Website";

    }

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

    } else if (
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
    .onclick =
        goBack;

document
    .getElementById("forward")
    .onclick =
        goForward;

document
    .getElementById("reload")
    .onclick =
        reloadPage;

document
    .getElementById("home")
    .onclick =
        showHome;

document
    .getElementById("fullscreen")
    .onclick =
        fullscreen;

document
    .getElementById("newTab")
    .onclick =
        showHome;

document
    .getElementById("go")
    .onclick =
        () => {

            navigate(
                address.value
            );

        };

address.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            navigate(
                address.value
            );

        }

    }
);

homeSearch.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            navigate(
                homeSearch.value
            );

        }

    }
);

document
    .getElementById("homeGo")
    .onclick =
        () => {

            navigate(
                homeSearch.value
            );

        };


document
    .getElementById("retry")
    .onclick =
        () => {

            if (currentURL) {

                navigate(
                    currentURL
                );

            } else {

                connectBrowser();

            }

        };


/* =========================================
   START
========================================= */

showHome();

connectBrowser();
