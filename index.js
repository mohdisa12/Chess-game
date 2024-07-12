import express from "express";
import ejs from "ejs";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { Chess } from "chess.js";

const app = express();
const port = 3000;

const httpServer = createServer(app);
const io = new Server(httpServer);

const chess = new Chess();
let players = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set('view engine', 'ejs');

app.get("/", (req, res) => {
    res.render("index");
});

io.on("connection", (socket) => {
    console.log("connected", socket.id);

    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");
    } else {
        socket.emit("spectatorRole");
    }

    socket.emit("boardState", chess.fen());

    socket.on("disconnect", () => {
        if (socket.id === players.white) {
            delete players.white;
        } else if (socket.id === players.black) {
            delete players.black;
        }
    });

    socket.on("move", (move) => {
        try {
            if (chess.turn() === 'w' && socket.id !== players.white) return;
            if (chess.turn() === 'b' && socket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            } else {
                socket.emit("invalidMove", move);
            }
        } catch (err) {
            console.log(err);
            socket.emit("invalidMove", move);
        }
    });
});

httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});