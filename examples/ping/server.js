var app = require('express')();
var AutoPeer = require('../../index');
var server = app.listen(3000);
var autoPeer = AutoPeer(server);

app.use(autoPeer.app);

autoPeer.on('ping', function (message, data) {
  autoPeer.sendTo(data.source, 'pong');
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});
