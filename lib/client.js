var EventEmitter = require('eventemitter3');
var Peer = require('peerjs');
var io = require('socket.io-client');

function AutoPeer(options) {
  if (!(this instanceof AutoPeer)) {
    return new AutoPeer(options);
  }

  var socket = io();
  var _this = this;
  _this.socket = socket;
  var connections = [];

  /**
   * Emit three data events:
   *  + autoPeer:eventName
   *  + eventName
   *  + client|server:eventName
   * @param message
   * @private
   */
  function emitMessage(message) {
    _this.emit('autoPeer:data', message.data, message);
    _this.emit(message.event, message.data, message);
    _this.emit(message.prefix + ':' + message.event, message.data, message);
  }

  socket.on('connected', function (clientId) {
    // Open webrtc connection
    var peer = new Peer(clientId, options);
    // Tell other clients to connect to this new peer using webrct
    peer.on('open', function () {
      socket.emit('webrtc', 'connected');
      _this.clientId = clientId;
      _this.emit('autoPeer:connected', clientId);
    });
    // Outgoing webRTC Connections when socketIo informs this client about a new user
    socket.on('new-connection', function (targetClientId) {
      initializeWebRTC(peer.connect(targetClientId));
    });
    // Incoming webRTC Connections
    peer.on('connection', function (connection) {
      initializeWebRTC(connection);
    });

    // Called when a new initializeWebRTC is created
    function initializeWebRTC(connection) {
      connection.on('data', function (data) {
        emitMessage(data);
      });
      connections.push(connection);
    }
  });

  _this.send = function (event, data, sendToMyself) {
    var message = {
      source: this.clientId,
      event: event,
      data: data,
      prefix: 'client'
    };
    if (connections) {
      connections.forEach(function (connection) {
        connection.send(message);
      });
    }
    if (sendToMyself) {
      emitMessage(message);
    }
  };
}

AutoPeer.prototype = new EventEmitter();

module.exports = AutoPeer;