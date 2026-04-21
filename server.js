const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const MAX_BULLETS = 3;
const MAX_SHIELD_STREAK = 5;

const rooms = {};

function getRoomList() {
    return Object.entries(rooms).map(([id, room]) => ({
        id,
        players: room.players.length,
    }));
}

function resetRoom(room) {
    room.players.forEach((p) => {
        p.bullets = 0;
        p.dead = false;
        p.action = null;
        p.shieldStreak = 0;
    });
    room.log = "New game started!";
    room.timer = 10;
}

function resolveTurn(room) {
    const [p1, p2] = room.players;
    let log = "";

    if (p1.action === "shoot" && p1.bullets === 0) p1.action = "none";
    if (p2.action === "shoot" && p2.bullets === 0) p2.action = "none";

    if (p1.action === "reload" && p1.bullets < MAX_BULLETS) p1.bullets++;
    if (p2.action === "reload" && p2.bullets < MAX_BULLETS) p2.bullets++;

    if (p1.action === "shoot") p1.bullets--;
    if (p2.action === "shoot") p2.bullets--;

    if (p1.action === "shoot" && p2.action === "reload") {
        p2.dead = true;
        log = `${p1.name} shot ${p2.name}`;
    } else if (p2.action === "shoot" && p1.action === "reload") {
        p1.dead = true;
        log = `${p2.name} shot ${p1.name}`;
    } else if (p1.action === "shoot" && p2.action === "shield") {
        log = `${p2.name} blocked`;
    } else if (p2.action === "shoot" && p1.action === "shield") {
        log = `${p1.name} blocked`;
    } else {
        log = "Both acted";
    }

    p1.shieldStreak = p1.action === "shield" ? p1.shieldStreak + 1 : 0;
    p2.shieldStreak = p2.action === "shield" ? p2.shieldStreak + 1 : 0;

    p1.action = null;
    p2.action = null;
    room.log = log;
    room.timer = 10;
}

setInterval(() => {
    for (const roomId in rooms) {
        const room = rooms[roomId];
        if (room.players.length === 2 && !room.players.some((p) => p.dead)) {
            room.timer--;

            if (room.timer <= 0) {
                room.players.forEach((p) => {
                    if (!p.action) p.action = "none";
                });
                resolveTurn(room);
            }

            io.to(roomId).emit("state", room);
        }
    }

    io.emit("roomList", getRoomList());
}, 1000);

io.on("connection", (socket) => {
    socket.emit("roomList", getRoomList());

    socket.on("joinRoom", ({ roomId, name }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: [],
                log: "Waiting...",
                timer: 10,
            };
        }

        const room = rooms[roomId];

        if (room.players.length >= 2) {
            socket.emit("message", "Room full");
            return;
        }

        room.players.push({
            id: socket.id,
            name,
            bullets: 0,
            action: null,
            dead: false,
            shieldStreak: 0,
        });

        socket.join(roomId);

        io.to(roomId).emit("state", room);
        io.emit("roomList", getRoomList());
    });

    socket.on("action", ({ roomId, action }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player || player.action || player.dead) return;

        player.action = action;

        if (room.players.every((p) => p.action !== null)) {
            resolveTurn(room);
        }

        io.to(roomId).emit("state", room);
    });

    socket.on("restart", (roomId) => {
        const room = rooms[roomId];
        if (!room) return;
        resetRoom(room);
        io.to(roomId).emit("state", room);
    });

    socket.on("disconnect", () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            room.players = room.players.filter((p) => p.id !== socket.id);

            io.to(roomId).emit("state", room);
        }
        io.emit("roomList", getRoomList());
    });
});

server.listen(3000, () => console.log("http://localhost:3000"));
