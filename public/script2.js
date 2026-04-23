const socket = io();

const MAX_BULLETS = 3;
const MAX_SHIELD_STREAK = 5;

let myId = "";
let currentRoom = "";
let myName = "";
let enemyName = "";

const THEME_KEY = "oantuti:theme";

function $(id) {
    return document.getElementById(id);
}

function animateOnce(el, className) {
    if (!el) return;
    el.classList.remove(className);
    // Force reflow so animation can restart.
    void el.offsetWidth;
    el.classList.add(className);
}

function setTheme(theme) {
    const html = document.documentElement;
    if (theme === "dark") html.setAttribute("data-theme", "dark");
    else html.removeAttribute("data-theme");

    const btn = $("themeToggle");
    if (btn) {
        const icon = btn.querySelector(".btn__icon");
        const label = btn.querySelector(".btn__label");
        const isDark = theme === "dark";
        if (icon) icon.textContent = isDark ? "☀️" : "🌙";
        if (label) label.textContent = isDark ? "Light" : "Dark";
        btn.setAttribute("aria-pressed", String(isDark));
    }
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") {
        setTheme(saved);
        return;
    }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
}

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
}

socket.on("connect", () => {
    myId = socket.id;
});

function joinRoom(roomId = null) {
    const nameInput = $("name");
    const name = (nameInput?.value || "").trim() || "Player";

    if (!name) {
        alert("Nhập tên trước đã");
        return;
    }

    currentRoom = roomId || ($("roomId")?.value || "").trim();
    if (!currentRoom) {
        alert("Nhập hoặc chọn ID phòng");
        return;
    }

    myName = name;
    socket.emit("joinRoom", { roomId: currentRoom, name });
    $("game").style.display = "block";
    const ph = $("gamePlaceholder");
    if (ph) ph.style.display = "none";
    $("joinRoomBtn").disabled = true;
    animateOnce($("game"), "anim-pop");
}

function sendAction(action) {
    disableButtons(true);
    socket.emit("action", { roomId: currentRoom, action });
}

function restartGame() {
    socket.emit("restart", currentRoom);
    const res = $("result");
    if (res) {
        res.className = "result";
        res.style.display = "none";
    }
}

function leaveRoom() {
    if (!currentRoom) return;
    socket.emit("leaveRoom", currentRoom);
    currentRoom = "";
    myName = "";
    enemyName = "";
    $("game").style.display = "none";
    const ph = $("gamePlaceholder");
    if (ph) ph.style.display = "block";
    $("joinRoomBtn").disabled = false;
    socket.emit("getRoomList");
}

function disableButtons(disabled) {
    $("shootBtn").disabled = disabled;
    $("shieldBtn").disabled = disabled;
    $("reloadBtn").disabled = disabled;
}

socket.on("roomList", (rooms) => {
    const ul = $("rooms");
    const noRoomMsg = $("noRoomMsg");
    ul.innerHTML = "";

    if (rooms.length === 0) {
        noRoomMsg.style.display = "block";
        return;
    }

    noRoomMsg.style.display = "none";

    rooms.forEach((room) => {
        const li = document.createElement("li");
        li.className = "room-item";

        const meta = document.createElement("div");
        meta.className = "room-meta";

        const title = document.createElement("div");
        title.className = "room-id";
        title.innerText = room.id;

        const sub = document.createElement("div");
        sub.className = "room-sub";
        sub.innerText = `${room.players}/2 người`;

        meta.appendChild(title);
        meta.appendChild(sub);

        const joinBtn = document.createElement("button");
        joinBtn.className = "btn btn--primary";
        joinBtn.type = "button";
        joinBtn.innerHTML = `<span class="btn__icon" aria-hidden="true">🚪</span><span class="btn__label">Vô</span>`;

        if (currentRoom) {
            joinBtn.disabled = true;
        }

        joinBtn.onclick = () => {
            const nameInput = $("name");
            if (!nameInput.value.trim()) {
                alert("Nhập tên trước đã");
                nameInput.focus();
                return;
            }
            joinRoom(room.id);
        };

        li.appendChild(meta);
        li.appendChild(joinBtn);
        ul.appendChild(li);
        animateOnce(li, "anim-pop");
    });
});

socket.on("message", (msg) => alert(msg));

let lastTimerText = "";
let lastLogText = "";
let lastMyStatus = "";
let lastEnemyStatus = "";

socket.on("state", (room) => {
    const me = room.players.find((p) => p.id === myId);
    const enemy = room.players.find((p) => p.id !== myId);

    if (me) {
        myName = me.name;
        $("myName").innerText = me.name;
    }
    if (enemy) {
        enemyName = enemy.name;
        $("enemyName").innerText = enemy.name;
    }

    $("status").innerText = room.players.length < 2 ? "Chờ đối phương..." : "Game bắt đầu!";

    const timerText = "Thời gian còn lại: " + room.timer;
    $("timer").innerText = timerText;
    if (timerText !== lastTimerText) animateOnce($("timer"), "anim-pulse");
    lastTimerText = timerText;

    $("bullets").innerText = me ? `Đạn: ${me.bullets}` : "";
    $("enemyBullets").innerText = enemy ? `Đạn: ${enemy.bullets}` : "";

    $("shieldStreak").innerText = me ? `Chuỗi khiên: ${me.shieldStreak}` : "";
    $("enemyShieldStreak").innerText = enemy ? `Chuỗi khiên: ${enemy.shieldStreak}` : "";

    const myStatus = me ? (me.action ? "✅" : "💬") : "💬";
    const enemyStatus = enemy ? (enemy.action ? "✅" : "💬") : "💬";
    $("myStatus").innerText = myStatus;
    $("enemyStatus").innerText = enemyStatus;

    if (myStatus !== lastMyStatus) animateOnce($("myStatus"), "anim-pop");
    if (enemyStatus !== lastEnemyStatus) animateOnce($("enemyStatus"), "anim-pop");
    lastMyStatus = myStatus;
    lastEnemyStatus = enemyStatus;

    $("log").innerText = room.log;
    if (room.log !== lastLogText) animateOnce($("log"), "anim-pop");
    lastLogText = room.log;

    const resultDiv = $("result");
    resultDiv.className = "result";
    resultDiv.innerHTML = "";
    resultDiv.style.display = "none";

    if (me && me.action === null && !me.dead) {
        disableButtons(false);
    }

    if (me) {
        if (me.bullets < 1) $("shootBtn").disabled = true;
        if (me.shieldStreak >= MAX_SHIELD_STREAK) $("shieldBtn").disabled = true;
    }

    if (me && me.dead) {
        resultDiv.innerText = "Đừng đẻ trứng nhé!";
        resultDiv.classList.add("result--lose");
        resultDiv.style.display = "block";
        animateOnce(resultDiv, "anim-shake");
        disableButtons(true);
    }

    if (enemy && enemy.dead) {
        resultDiv.innerText = "Booyah!";
        resultDiv.classList.add("result--win");
        resultDiv.style.display = "block";
        animateOnce(resultDiv, "anim-pop");
        disableButtons(true);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    const t = $("themeToggle");
    if (t) t.addEventListener("click", toggleTheme);

    // Quality-of-life: Enter to join.
    const name = $("name");
    const roomId = $("roomId");
    const onEnter = (e) => {
        if (e.key === "Enter") joinRoom();
    };
    if (name) name.addEventListener("keydown", onEnter);
    if (roomId) roomId.addEventListener("keydown", onEnter);
});

