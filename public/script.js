const socket = io();

const MAX_BULLETS = 3;
const MAX_SHIELD_STREAK = 5;

let myId = "";
let currentRoom = "";

socket.on("connect", () => {
    myId = socket.id;
});

function joinRoom() {
    currentRoom = document.getElementById("roomId").value;
    const name = document.getElementById("name").value || "Player";

    socket.emit("joinRoom", { roomId: currentRoom, name });
    document.getElementById("game").style.display = "block";
}

function sendAction(action) {
    disableButtons(true);
    socket.emit("action", { roomId: currentRoom, action });
}

function restartGame() {
    socket.emit("restart", currentRoom);
}

function disableButtons(disabled) {
    document.getElementById("shootBtn").disabled = disabled;
    document.getElementById("shieldBtn").disabled = disabled;
    document.getElementById("reloadBtn").disabled = disabled;
}

socket.on("roomList", (rooms) => {
    const ul = document.getElementById("rooms");
    ul.innerHTML = "";

    rooms.forEach((room) => {
        const li = document.createElement("li");
        li.innerText = `${room.id} (${room.players}/2)`;
        ul.appendChild(li);
    });
});

socket.on("message", (msg) => alert(msg));

socket.on("state", (room) => {
    const me = room.players.find((p) => p.id === myId);
    const enemy = room.players.find((p) => p.id !== myId);

    document.getElementById("status").innerText =
        room.players.length < 2
            ? "Waiting for opponent..."
            : "Battle started";

    document.getElementById("timer").innerText =
        "Time left: " + room.timer;

    document.getElementById("bullets").innerText = me
        ? `Bullets: ${me.bullets}`
        : "";

    document.getElementById("enemyBullets").innerText = enemy
        ? `Bullets: ${enemy.bullets}`
        : "";

    document.getElementById("shieldStreak").innerText = me
        ? `Shield Streak: ${me.shieldStreak}`
        : "";

    document.getElementById("enemyShieldStreak").innerText = enemy
        ? `Shield Streak: ${enemy.shieldStreak}`
        : "";

    document.getElementById("myStatus").innerText = me
        ? (me.action ? "✅" : "💬")
        : "💬";

    document.getElementById("enemyStatus").innerText = enemy
        ? (enemy.action ? "✅" : "💬")
        : "💬";

    document.getElementById("log").innerText = room.log;

    document.getElementById("result").innerText = "";

    if (me && me.action === null && !me.dead) {
        disableButtons(false);
    }

    if (me) {
        if (me.bullets < 1) document.getElementById("shootBtn").disabled = true;
        if (me.shieldStreak >= MAX_SHIELD_STREAK) document.getElementById("shieldBtn").disabled = true;
        if (me.bullets >= MAX_BULLETS) document.getElementById("reloadBtn").disabled = true;
    }

    if (me && me.dead) {
        document.getElementById("result").innerText = "You lose!";
        disableButtons(true);
    }

    if (enemy && enemy.dead) {
        document.getElementById("result").innerText = "You win!";
        disableButtons(true);
    }
});
