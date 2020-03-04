
const fs = require('fs');
const https = require('https');
const app = require('./app');

const privateKey = fs.readFileSync('/etc/letsencrypt/live/curly-lamp-server.fildabert.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/curly-lamp-server.fildabert.com/fullchain.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate };

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(443);
