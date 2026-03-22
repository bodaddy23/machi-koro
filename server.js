const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve your game HTML file
app.use(express.static('public'));

// In-memory room storage
const rooms = {};

wss.on('connection', (ws) => {
  let currentRoom = null;

  ws.on('message', (data) => {
    const msg = JSON.parse(data);

    if (msg.type === 'join') {
      currentRoom = msg.code;
      if (!rooms[currentRoom]) rooms[currentRoom] = { clients: [], state: null };
      rooms[currentRoom].clients.push(ws);

      // Send current state to the new joiner
      if (rooms[currentRoom].state) {
        ws.send(JSON.stringify({ type: 'state', state: rooms[currentRoom].state }));
      }
    }

    if (msg.type === 'update') {
      // Save and broadcast new state to all clients in the room
      rooms[currentRoom].state = msg.state;
      rooms[currentRoom].clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: 'state', state: msg.state }));
        }
      });
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].clients = rooms[currentRoom].clients.filter(c => c !== ws);
    }
  });
});

server.listen(3000, () => console.log('Server running at http://localhost:3000'));