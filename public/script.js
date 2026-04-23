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
        alert("Please enter a nickname");
        return;
    }
    
    currentRoom = roomId || document.getElementById("roomId").value;
    if (!currentRoom) {
        alert("Please enter or select a room ID");
        return;
    }
    
    myName = name;
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

function leaveRoom() {
    if (currentRoom) {
        socket.emit("leaveRoom", currentRoom);
        currentRoom = "";
        myName = "";
        enemyName = "";
        document.getElementById("game").style.display = "none";
        // Re-render room list with buttons enabled
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
        joinBtn.innerText = "Join";
        joinBtn.style.marginRight = "0";
        
        // Disable join button if already in a room
        if (currentRoom) {
            joinBtn.disabled = true;
            joinBtn.style.opacity = "0.5";
            joinBtn.style.cursor = "not-allowed";
        }
        
        joinBtn.onclick = () => {
            const nameInput = document.getElementById("name");
            if (!nameInput.value.trim()) {
                alert("Please enter a nickname first");
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

    // Update player names
    if (me) {
        myName = me.name;
        document.getElementById("myName").innerText = me.name;
    }
    if (enemy) {
        enemyName = enemy.name;
        document.getElementById("enemyName").innerText = enemy.name;
    }

    document.getElementById("status").innerText =
        room.players.length < 2 ? "Waiting for opponent..." : "Battle started";

    document.getElementById("timer").innerText = "Time left: " + room.timer;

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
        if (me.shieldStreak >= MAX_SHIELD_STREAK)
            document.getElementById("shieldBtn").disabled = true;
    }

    if (me && me.dead) {
        resultDiv.innerText = "You Lose!";
        resultDiv.classList.add("lose");
        resultDiv.style.display = "block";
        disableButtons(true);
    }

    if (enemy && enemy.dead) {
        resultDiv.innerText = "You Win!";
        resultDiv.classList.add("win");
        resultDiv.style.display = "block";
        disableButtons(true);
    }
});
