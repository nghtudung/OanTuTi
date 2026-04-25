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

const socket = io();

const MAX_BULLETS = 3;
const MAX_SHIELD_STREAK = 5;

let myId = "";
let currentRoom = "";
let myName = "";
let enemyName = "";

socket.on("connect", () => {
    myId = socket.id;
});

function joinRoom(roomId = null) {
    const nameInput = document.getElementById("name");
    const name = nameInput.value.trim() || "Player";

    if (!name) {
        alert("Nhập tên trước đã");
        nameInput.focus();
        return;
    }

    currentRoom = roomId || document.getElementById("roomId").value.trim();
    if (!currentRoom) {
        alert("Nhập hoặc chọn ID phòng");
        return;
    }

    myName = name;
    socket.emit("joinRoom", { roomId: currentRoom, name });

    document.getElementById("game").style.display = "flex";
    document.getElementById("waitingState").style.display = "none";
    document.getElementById("joinRoomBtn").disabled = true;
}

function sendAction(action) {
    disableButtons(true);
    socket.emit("action", { roomId: currentRoom, action });
}

function restartGame() {
    socket.emit("restart", currentRoom);
}

function leaveRoom() {
    if (!currentRoom) return;
    socket.emit("leaveRoom", currentRoom);
    currentRoom = "";
    myName = "";
    enemyName = "";

    document.getElementById("game").style.display = "none";
    document.getElementById("waitingState").style.display = "flex";
    document.getElementById("joinRoomBtn").disabled = false;

    document.getElementById("log").innerText = "Chờ vào phòng...";
    hideResult();

    socket.emit("getRoomList");
}

function disableButtons(disabled) {
    document.getElementById("shootBtn").disabled = disabled;
    document.getElementById("shieldBtn").disabled = disabled;
    document.getElementById("reloadBtn").disabled = disabled;
}

function showResult(text, type) {
    document.getElementById("timerLabel").style.display = "none";
    document.getElementById("timer").style.display = "none";
    document.getElementById("vsBadge").style.display = "none";

    const el = document.getElementById("result");
    el.innerText = text;
    el.className = "game-result " + type;
    el.style.display = "flex";
}

function hideResult() {
    document.getElementById("timerLabel").style.display = "";
    document.getElementById("timer").style.display = "";
    document.getElementById("vsBadge").style.display = "";

    const el = document.getElementById("result");
    el.style.display = "none";
    el.className = "game-result";
}

function updateTimerUrgency(seconds) {
    const el = document.getElementById("timer");
    if (seconds <= 3 && seconds > 0) {
        el.classList.add("urgent");
    } else {
        el.classList.remove("urgent");
    }
}

socket.on("roomList", (rooms) => {
    const ul = document.getElementById("rooms");
    const noRoomMsg = document.getElementById("noRoomMsg");
    ul.innerHTML = "";

    if (rooms.length === 0) {
        noRoomMsg.style.display = "block";
        return;
    }

    noRoomMsg.style.display = "none";

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
        btn.className = "room-join-btn" + (isFull ? " full" : "");
        btn.innerText = isFull ? "ĐẦY" : "Vô";
        btn.disabled = isFull || !!currentRoom;

        if (!isFull && !currentRoom) {
            btn.onclick = () => {
                const nameInput = document.getElementById("name");
                if (!nameInput.value.trim()) {
                    alert("Nhập tên trước đã");
                    nameInput.focus();
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

    if (me) document.getElementById("myName").innerText = me.name;
    if (enemy) document.getElementById("enemyName").innerText = enemy.name;

    const statusEl = document.getElementById("log");
    if (room.players.length < 2) {
        statusEl.innerText = "⏳ Đang chờ đối thủ vào phòng...";
    } else {
        statusEl.innerText = room.log || "Game đang chạy";
    }

    const timerVal = room.timer;
    document.getElementById("timer").innerText =
        room.players.length < 2 ? "—" : timerVal;
    updateTimerUrgency(timerVal);

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
        showResult("THUA!", "lose");
        disableButtons(true);
    }

    if (enemy && enemy.dead) {
        showResult("THẮNG! 🏆", "win");
        disableButtons(true);
    }

    if (me && me.action === null && !me.dead && room.players.length === 2) {
        disableButtons(false);
    }

    if (me && me.bullets < 1) {
        document.getElementById("shootBtn").disabled = true;
    }

    if (me && me.shieldStreak >= MAX_SHIELD_STREAK) {
        document.getElementById("shieldBtn").disabled = true;
    }
});
