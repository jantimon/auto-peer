# auto-peer.js [![Build Status](https://secure.travis-ci.org/jantimon/auto-peer.svg?branch=master)](http://travis-ci.org/jantimon/auto-peer)  [![Dependency Status](https://david-dm.org/jantimon/auto-peer.svg)](https://david-dm.org/jantimon/auto-peer.png) [![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

## Abstract

auto-peer.js automates the peer.js connection establishment and connects all auto-peer.js clients with each other using webRTC.

The auto-peer.js library is an experimental webRTC client/server library which relies heavily on peerjs

## Motivation

The idea auto-peer.js was developed when creating a multi media installation for a couple of tablets. It should allow to communicate from tablet to tablet as fast as possible.

![http://engineering.spilgames.com/mastering-webrtc/](http://auth-83051f68-ec6c-44e0-afe5-bd8902acff57.cdn.spilcloud.com/10/1405328465_WebRTC_ping_testresults.png)
from http://engineering.spilgames.com/mastering-webrtc/

## How does it work?

**tl;dr: WebRTC with a node signaling server**

auto-peer.js core consists of a node websocket backend and a client side script.
When the user opens the application a new client is created. This client asks the backend to tell all existing clients to establish a new webRTC connection.

## Demos


  [![http://runnable.com/favicon.ico](http://runnable.com/favicon.ico)   Drag'n'Drop](http://runnable.com/VLf8lzN2CN07H5Jl/auto-peer-drag-example-for-node-js)

  [![http://runnable.com/favicon.ico](http://runnable.com/favicon.ico)   Ping](http://runnable.com/VLfOe_WNcp9fB-0u/auto-peer-ping-example-for-node-js)

## Example



[Take a look at the example directory](https://github.com/jantimon/auto-peer/tree/master/examples).

Server

```JavaScript
var app = require('express')();
var server = app.listen(3000);
var autoPeer = require('auto-peer')(server);

app.use(autoPeer.app);

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});
```

Client

```HTML
<!-- The auto-peer server delivers the client script at /auto-peer.min.js -->
<script src="/auto-peer.min.js"></script>
<script>
    var autoPeer = new AutoPeer();
    // Wait until autoPeer connected
    autoPeer.on('autoPeer:connected', function (clientId) {
      autoPeer.broadcast('example-message', 'This is a message to all connected peers from ' + clientId);
    });

    // Wait for incoming messages
    autoPeer.on('example-message', function (message, data) {
      console.log('received data:', message);
      // Reply kindly
      if (message !== 'thank you') {
        autoPeer.sendTo(data.source, 'example-message', 'thank you');
      }
    });
</script>
```

## Api


```js
autoPeer.broadcast(messageName, data, sendToSelf);
```

+ messageName - name of the message
+ data - optional data
+ sendToSelf - optional (only for client version) send message also to the current peer


```js
autoPeer.sendTo(clientId, messageName, data);
```

+ clientId - the peer id the message should be send to
+ messageName - name of the message
+ data - optional data


## Events

auto-peer inherits from [eventEmitter3](https://github.com/primus/EventEmitter3). for API methods see the official Node.js documentation:
http://nodejs.org/api/events.html

### Client

#### autoPeer:connected

Fired when the current peer is connected to every other peer

#### autoPeer:data

Fired when the current peer receives any data

#### autoPeer:peerJoined

Fired when another peer joined

### Server

#### autoPeer:newClient

Fired when a new client connected to the server

## Security

auto-peer.js is an experimental library and was not meant to be used in productive environment.
As a client is able to send commands to any other client you should never evaluate html or javascript code transmitted by auto-peer.

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## License
Copyright (c) 2014 Jan Nicklas. Licensed under the MIT license.
