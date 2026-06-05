const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const handleSocketEvents = require('./server/socket/events');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

handleSocketEvents(io);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
