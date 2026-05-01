document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (!currentRoom) return;

    switch (e.key.toLowerCase()) {
        case "a":
            if (!document.getElementById("reloadBtn").disabled)
                sendAction("reload");
            break;
        case "s":
            if (!document.getElementById("shootBtn").disabled)
                sendAction("shoot");
            break;
        case "d":
            if (!document.getElementById("shieldBtn").disabled)
                sendAction("shield");
            break;
    }
});

const socket = io();

const DEFAULT_SETTINGS = {
    maxBullets: 3,
    maxShieldStreak: 5,
};

let myId = "";
let currentRoom = "";
let myName = "";
let enemyName = "";
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
        info.innerText = `Luật ván: Đạn tối đa ${settings.maxBullets} | Khiên liên tiếp tối đa ${settings.maxShieldStreak}`;
    }
}

socket.on("connect", () => {
    myId = socket.id;
});

function joinRoom(roomId = null) {
    const nameInput = document.getElementById("name");
    const name = nameInput.value.trim() || "Player";

    if (!name) {
        alert("Nhập tên trước đã");
        return;
    }

    currentRoom = roomId || document.getElementById("roomId").value;
    if (!currentRoom) {
        alert("Nhập hoặc chọn ID phòng");
        return;
    }

    myName = name;
    socket.emit("joinRoom", {
        roomId: currentRoom,
        name,
        settings: getGameSettings(),
    });
    document.getElementById("game").style.display = "block";
    document.getElementById("joinRoomBtn").disabled = true;
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
    if (currentRoom) {
        socket.emit("leaveRoom", currentRoom);
        currentRoom = "";
        myName = "";
        enemyName = "";
        document.getElementById("game").style.display = "none";
        document.getElementById("joinRoomBtn").disabled = false;
        socket.emit("getRoomList");
    }
}

function disableButtons(disabled) {
    document.getElementById("shootBtn").disabled = disabled;
    document.getElementById("shieldBtn").disabled = disabled;
    document.getElementById("reloadBtn").disabled = disabled;
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
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        li.style.padding = "8px 0";

        const roomInfo = document.createElement("span");
        roomInfo.innerText = `${room.id} (${room.players}/2)`;

        const joinBtn = document.createElement("button");
        joinBtn.innerText = "Vô";
        joinBtn.style.marginRight = "0";

        if (currentRoom) {
            joinBtn.disabled = true;
            joinBtn.style.opacity = "0.5";
            joinBtn.style.cursor = "not-allowed";
        }

        joinBtn.onclick = () => {
            const nameInput = document.getElementById("name");
            if (!nameInput.value.trim()) {
                alert("Nhập tên trước đã");
                nameInput.focus();
                return;
            }
            joinRoom(room.id);
        };

        li.appendChild(roomInfo);
        li.appendChild(joinBtn);
        ul.appendChild(li);
    });
});

socket.on("message", (msg) => alert(msg));

socket.on("state", (room) => {
    const me = room.players.find((p) => p.id === myId);
    const enemy = room.players.find((p) => p.id !== myId);
    const settings = room.settings || DEFAULT_SETTINGS;

    syncSettings(settings);

    if (me) {
        myName = me.name;
        document.getElementById("myName").innerText = me.name;
    }
    if (enemy) {
        enemyName = enemy.name;
        document.getElementById("enemyName").innerText = enemy.name;
    }

    document.getElementById("status").innerText =
        room.players.length < 2 ? "Chờ đối phương..." : "Game bắt đầu!";

    document.getElementById("timer").innerText =
        "Thời gian còn lại: " + room.timer;

    document.getElementById("bullets").innerText = me
        ? `Đạn: ${me.bullets}`
        : "";

    document.getElementById("enemyBullets").innerText = enemy
        ? `Đạn: ${enemy.bullets}`
        : "";

    document.getElementById("shieldStreak").innerText = me
        ? `Chuỗi khiên: ${me.shieldStreak}`
        : "";

    document.getElementById("enemyShieldStreak").innerText = enemy
        ? `Chuỗi khiên: ${enemy.shieldStreak}`
        : "";

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

    document.getElementById("log").innerText = room.log;

    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";
    resultDiv.className = "result-container";

    if (me && me.action === null && !me.dead) {
        disableButtons(false);
    }

    if (me) {
        if (me.bullets < 1) document.getElementById("shootBtn").disabled = true;
        if (me.bullets >= settings.maxBullets)
            document.getElementById("reloadBtn").disabled = true;
        if (me.shieldStreak >= settings.maxShieldStreak)
            document.getElementById("shieldBtn").disabled = true;
    }

    if (me && me.dead) {
        resultDiv.innerText = "Đừng đẻ trứng nhé!";
        resultDiv.classList.add("lose");
        resultDiv.style.display = "block";
        disableButtons(true);
    }

    if (enemy && enemy.dead) {
        resultDiv.innerText = "Booyah!";
        resultDiv.classList.add("win");
        resultDiv.style.display = "block";
        disableButtons(true);
    }
});
