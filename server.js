import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';

const __dirname = path.resolve();
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let players = {};
let food = { x: Math.floor(Math.random() * 60) * 10, y: Math.floor(Math.random() * 60) * 10 };

io.on('connection', (socket) => {
    console.log('Bir oyuncu bağlandı:', socket.id);

    socket.on('newPlayer', (username) => {
        players[socket.id] = {
            username,
            position: [{ x: 150, y: 150 }],
            direction: { x: 10, y: 0 },
            score: 0,
            speed: 200, // Başlangıç hızı, milisaniye cinsinden
            color: getRandomColor()
        };
        socket.emit('currentPlayers', players);
        socket.emit('foodLocation', food);
        io.emit('updatePlayers', players);

        startMovement(socket.id);  // Yılanın hareket etmesini başlat
    });

    socket.on('playerMovement', (movementData) => {
        const player = players[socket.id];
        if (player) {
            player.direction = movementData.direction;
        }
    });

    socket.on('disconnect', () => {
        console.log('Bir oyuncu ayrıldı:', socket.id);
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

function startMovement(playerId) {
    const movePlayer = () => {
        const player = players[playerId];
        if (player) {
            let head = { x: player.position[0].x + player.direction.x, y: player.position[0].y + player.direction.y };

            // Oyun alanından çıkma kontrolü ve geri dönme
            if (head.x < 0) {
                head.x = 590;
            } else if (head.x >= 600) {
                head.x = 0;
            } else if (head.y < 0) {
                head.y = 590;
            } else if (head.y >= 600) {
                head.y = 0;
            }

            player.position.unshift(head);

            // Çarpışma kontrolü
            for (let id in players) {
                if (id !== playerId) {
                    const otherPlayer = players[id];
                    for (let i = 1; i < otherPlayer.position.length; i++) {
                        if (head.x === otherPlayer.position[i].x && head.y === otherPlayer.position[i].y) {
                            // Yılanın sıfırlanması
                            player.position = [{ x: 150, y: 150 }];
                            player.score = 0;
                            player.speed = 200; // Yılan sıfırlandığında başlangıç hızına dön
                            break;
                        }
                    }
                }
            }

            // Yılan yemeği yedi mi?
            if (head.x === food.x && head.y === food.y) {
                player.score += 10;
                food = { x: Math.floor(Math.random() * 60) * 10, y: Math.floor(Math.random() * 60) * 10 };
                io.emit('foodLocation', food);

                // Skor arttıkça hızı artır
                player.speed = Math.max(50, player.speed - 10);
            } else {
                player.position.pop();
            }

            io.emit('updatePlayers', players);

            // Yılanın bir sonraki hareketini ayarla
            setTimeout(movePlayer, player.speed);
        }
    };

    movePlayer();
}

function getRandomColor() {
    // Rastgele bir renk üret
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

server.listen(3000, '0.0.0.0', () => {
    console.log('Sunucu çalışıyor: http://localhost:3000');
});
