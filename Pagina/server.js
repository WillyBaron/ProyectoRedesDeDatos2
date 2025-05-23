// server.js - Servidor Node.js con Cluster, CORS y endpoints corregidos
// Instala: npm install express ws body-parser cors

const cluster = require('cluster');
const os = require('os');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master PID ${process.pid} iniciando ${numCPUs} workers`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    console.warn(`Worker ${worker.process.pid} murió (code=${code}, signal=${signal}). Reiniciando...`);
    cluster.fork();
  });
} else {
  const app = express();
  app.use(cors());               // Permitir llamadas desde el cliente
  app.use(express.static('.'));  // Sirve index.html y app.js
  app.use(bodyParser.json());    // Parse JSON en body de POST

  let requests = 0;
  const start = Date.now();

  // Health endpoint
  app.get('/health', (req, res) => {
    requests++;
    res.json({
      pid: process.pid,
      uptime: Math.floor((Date.now() - start) / 1000),
      requests
    });
  });

  // Mentoría endpoint
  app.post('/mentor', (req, res) => {
    requests++;
    console.log(`Worker ${process.pid} recibió mentoría:`, req.body);
    // Aquí podrías guardar en DB o enviar un email
    res.json({ message: 'Solicitud de mentoría recibida. ¡Gracias!' });
  });

  // Iniciar servidor HTTP
  const server = app.listen(3000, () => {
    console.log(`Worker ${process.pid} escuchando en http://localhost:3000`);
  });

  // WebSocket server
  const wss = new WebSocket.Server({ server });
  wss.on('connection', ws => {
    requests++;
    ws.send(`Bienvenido al chat (Worker PID ${process.pid})`);
    ws.on('message', message => {
      requests++;
      // Reenviar a todos los clientes conectados
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(`Worker ${process.pid}: ${message}`);
        }
      });
    });
  });
}
