var app = require('express')();
var http = require('http').Server(app);
var AutoPeer = require('../../index');

var autoPeer = AutoPeer(http);
app.get('/auto-peer.js', AutoPeer.clientHelper.middleWare());

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});
