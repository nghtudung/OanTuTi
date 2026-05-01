const socket = io();

const DEFAULT_SETTINGS = {
    maxBullets: 3,
    maxShieldStreak: 5,
};

let myId = "";
let currentRoom = "";
let myName = "";
let lastSettingsKey = "";

function getSettingInputs(name) {
    return Array.from(document.querySelectorAll(`[data-setting="${name}"]`));
}

function getGameSettings() {
    const maxBullets =
        getSettingInputs("maxBullets").reverse().find((input) => input.value) ||
        {};
    const maxShieldStreak =
        getSettingInputs("maxShieldStreak")
            .reverse()
            .find((input) => input.value) || {};

    return {
        maxBullets: Number.parseInt(maxBullets.value, 10),
        maxShieldStreak: Number.parseInt(maxShieldStreak.value, 10),
    };
}

function syncSettings(settings = DEFAULT_SETTINGS) {
    const key = `${settings.maxBullets}:${settings.maxShieldStreak}`;
    if (key === lastSettingsKey) return;
    lastSettingsKey = key;

    getSettingInputs("maxBullets").forEach((input) => {
        input.value = settings.maxBullets;
    });
    getSettingInputs("maxShieldStreak").forEach((input) => {
        input.value = settings.maxShieldStreak;
    });

    const info = document.getElementById("gameSettingsInfo");
    if (info) {
        info.innerText = `Đạn tối đa ${settings.maxBullets} | Khiên tối đa ${settings.maxShieldStreak}`;
    }
}

socket.on("connect", () => {
    myId = socket.id;
});

function toggleTheme() {
    const isLight = document.documentElement.classList.toggle("light");
    document.getElementById("themeIcon").innerText = isLight ? "🌙" : "☀️";
    localStorage.setItem("theme", isLight ? "light" : "dark");
}

(function () {
    if (localStorage.getItem("theme") === "light") {
        document.documentElement.classList.add("light");
        document.addEventListener("DOMContentLoaded", () => {
            document.getElementById("themeIcon").innerText = "🌙";
        });
    }
})();

function showGame() {
    document.getElementById("lobbyView").style.display = "none";
    document.getElementById("gameView").style.display = "flex";
}

function showLobby() {
    document.getElementById("gameView").style.display = "none";
    document.getElementById("lobbyView").style.display = "flex";
}

function joinRoom(roomId = null) {
    const nameInput = document.getElementById("name");
    const name = nameInput.value.trim();

    if (!name) {
        nameInput.focus();
        nameInput.placeholder = "Nhập tên trước đã! ⚠️";
        setTimeout(() => (nameInput.placeholder = "Nhập nickname..."), 2000);
        return;
    }

    currentRoom = roomId || document.getElementById("roomId").value.trim();
    if (!currentRoom) {
        const ri = document.getElementById("roomId");
        ri.focus();
        ri.placeholder = "Nhập mã phòng! ⚠️";
        setTimeout(() => (ri.placeholder = "Mã phòng..."), 2000);
        return;
    }

    myName = name;
    socket.emit("joinRoom", {
        roomId: currentRoom,
        name,
        settings: getGameSettings(),
    });
    document.getElementById("joinRoomBtn").disabled = true;
    showGame();
}

function sendAction(action) {
    disableButtons(true);
    socket.emit("action", { roomId: currentRoom, action });
}

function restartGame() {
    socket.emit("restart", {
        roomId: currentRoom,
        settings: getGameSettings(),
    });
}

function leaveRoom() {
    if (!currentRoom) return;
    socket.emit("leaveRoom", currentRoom);
    currentRoom = "";
    myName = "";

    document.getElementById("log").innerText = "Chờ đối thủ...";
    document.getElementById("joinRoomBtn").disabled = false;
    hideResult();
    showLobby();
    socket.emit("getRoomList");
}

function disableButtons(disabled) {
    document.getElementById("shootBtn").disabled = disabled;
    document.getElementById("shieldBtn").disabled = disabled;
    document.getElementById("reloadBtn").disabled = disabled;
}

function showResult(text, type) {
    document.getElementById("timerWrap").style.display = "none";

    const el = document.getElementById("result");
    el.innerText = text;
    el.className = "game-result " + type;
    el.style.display = "flex";
}

function hideResult() {
    document.getElementById("timerWrap").style.display = "";

    const el = document.getElementById("result");
    el.style.display = "none";
    el.className = "game-result";
}

function updateTimerUrgency(s) {
    const el = document.getElementById("timer");
    if (s <= 3 && s > 0) el.classList.add("urgent");
    else el.classList.remove("urgent");
}

socket.on("roomList", (rooms) => {
    const ul = document.getElementById("rooms");
    const noRoom = document.getElementById("noRoomMsg");
    const badge = document.getElementById("roomCountBadge");

    ul.innerHTML = "";
    badge.innerText = rooms.length;

    if (rooms.length === 0) {
        noRoom.style.display = "block";
        return;
    }

    noRoom.style.display = "none";

    rooms.forEach((room) => {
        const li = document.createElement("li");

        const idSpan = document.createElement("span");
        idSpan.className = "room-id";
        idSpan.innerText = room.id;

        const countSpan = document.createElement("span");
        countSpan.className = "room-count";
        countSpan.innerText = `${room.players}/2`;

        const btn = document.createElement("button");
        const isFull = room.players >= 2;
        btn.className = "room-join-btn";
        btn.innerText = isFull ? "ĐẦY" : "Vô";
        btn.disabled = isFull || !!currentRoom;

        if (!isFull && !currentRoom) {
            btn.onclick = () => {
                const nameInput = document.getElementById("name");
                if (!nameInput.value.trim()) {
                    nameInput.focus();
                    nameInput.placeholder = "Nhập tên trước! ⚠️";
                    setTimeout(
                        () => (nameInput.placeholder = "Nhập nickname..."),
                        2000,
                    );
                    return;
                }
                joinRoom(room.id);
            };
        }

        li.appendChild(idSpan);
        li.appendChild(countSpan);
        li.appendChild(btn);
        ul.appendChild(li);
    });
});

socket.on("message", (msg) => alert(msg));

socket.on("state", (room) => {
    const me = room.players.find((p) => p.id === myId);
    const enemy = room.players.find((p) => p.id !== myId);
    const settings = room.settings || DEFAULT_SETTINGS;

    syncSettings(settings);

    if (me) document.getElementById("myName").innerText = me.name;
    if (enemy) document.getElementById("enemyName").innerText = enemy.name;

    const logEl = document.getElementById("log");
    logEl.innerText =
        room.players.length < 2
            ? "⏳ Chờ đối thủ vào phòng..."
            : room.log || "Game đang chạy";

    document.getElementById("timer").innerText =
        room.players.length < 2 ? "—" : room.timer;
    updateTimerUrgency(room.timer);

    document.getElementById("bullets").innerText = me ? me.bullets : "0";
    document.getElementById("shieldStreak").innerText = me
        ? me.shieldStreak
        : "0";
    document.getElementById("enemyBullets").innerText = enemy
        ? enemy.bullets
        : "?";
    document.getElementById("enemyShieldStreak").innerText = enemy
        ? enemy.shieldStreak
        : "?";

    document.getElementById("myStatus").innerText = me
        ? me.action
            ? "✅"
            : "💬"
        : "💬";
    document.getElementById("enemyStatus").innerText = enemy
        ? enemy.action
            ? "✅"
            : "💬"
        : "💬";

    hideResult();

    if (me && me.dead) {
        showResult("💀 THUA!", "lose");
        disableButtons(true);
        return;
    }

    if (enemy && enemy.dead) {
        showResult("🏆 THẮNG!", "win");
        disableButtons(true);
        return;
    }

    if (me && me.action === null && !me.dead && room.players.length === 2) {
        disableButtons(false);
    }

    if (me && me.bullets < 1)
        document.getElementById("shootBtn").disabled = true;
    if (me && me.bullets >= settings.maxBullets)
        document.getElementById("reloadBtn").disabled = true;
    if (me && me.shieldStreak >= settings.maxShieldStreak)
        document.getElementById("shieldBtn").disabled = true;
});
