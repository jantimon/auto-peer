var express = require('express');
var app = express();
var AutoPeer = require('../../index');
var server = app.listen(3001, function() {
  console.log('opening testing server on 3001');
});

var autoPeer = new AutoPeer(server);

app.use(autoPeer.app);
app.use(express.static(__dirname));

autoPeer.on('autoPeer:newClient', function (id) {
  console.log(id);
});
