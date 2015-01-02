var app = require('express')();
var http = require('http').Server(app);
var autoPeer = require('../../index')(http);

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});
