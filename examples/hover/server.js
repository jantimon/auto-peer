var app = require('express')();
var autoPeer = require('../../index');
var server = app.listen(3000);

app.use(autoPeer(server).app);

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});
