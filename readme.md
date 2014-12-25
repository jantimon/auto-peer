# auto-peer.js

## Abstract

auto-peer.js automates the peer.js connection establishment and connects all auto-peer.js clients with each other using webRTC.

The auto-peer.js library is an experimental webRTC client/server library which relies heavily on peerjs and socket.io

## Motivation

The idea auto-peer.js was developed when creating a multi media installation for a couple of tablets. It should allow to communicate from tablet to tablet as fast as possible.

![http://engineering.spilgames.com/mastering-webrtc/](http://auth-83051f68-ec6c-44e0-afe5-bd8902acff57.cdn.spilcloud.com/10/1405328465_WebRTC_ping_testresults.png)  
from http://engineering.spilgames.com/mastering-webrtc/

## How does it work?

auto-peer.js core consists of a node websocket backend and a client side script.
When the user opens the application a new client is created. This client asks the backend to tell all existing clients to establish a new webRTC connection.

## Example

Server

```JavaScript
var app = require('express')();
var http = require('http').Server(app);
var autoPeer = require('auto-peer')(http);
app.get('/auto-peer.js', require('auto-peer').clientHelper.middleWare());

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});
http.listen(3000, function () {});
```

Client

```JavaScript
// Please get your own free key at http://peerjs.com/
var autoPeer = new AutoPeer({key: 'lwjd5qra8257b9'});
autoPeer.on('data', function(data){
  console.log('received data', data);
});
autoPeer.send('This is a message to all connected peers');
```


## Security

auto-peer.js is an experimental library and was not meant to be used in productive environment.
As a client is able to send commands to any other client you should never evaluate html or javascript code transmitted by auto-peer.
