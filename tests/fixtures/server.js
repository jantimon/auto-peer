var express = require('express');
var app = express();
var http = require('http').Server(app);
var autoPeer = require('../../index')(http);

app.use(express.static(__dirname));

http.listen(3001, function () {
  console.log('booting test server on *:3001');
});

autoPeer.on('autoPeer:newClient', function (id) {
  console.log(id);
});