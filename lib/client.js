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
   *
   * @private
   * @param message
   */
  function emitMessage(message) {
    _this.emit('autoPeer:data', message.data, message);
    _this.emit(message.event, message.data, message);
    _this.emit(message.prefix + ':' + message.event, message.data, message);
  }

  /**
   * Create a message object.
   * As peer.js doesn't support custom objects this has to be a plain object
   *
   * @private
   * @param event
   * @param data
   * @returns {{source: (*|c.clientId|AutoPeer.clientId), event: *, data: *, prefix: string}}
   */
  function createMessage(event, data) {
    return  {
      source: _this.clientId,
      event: event,
      data: data,
      prefix: 'client'
    };
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

  /**
   * Send a named message to all clients
   * ```
   *   autoPeer.send('greeting', 'Hey!');
   * ```
   *
   * @public
   * @param event
   * @param data
   * @param sendToMyself
   */
  _this.send = function (event, data, sendToMyself) {
    var message = createMessage(event, data);
    if (connections) {
      connections.forEach(function (connection) {
        connection.send(message);
      });
    }
    if (sendToMyself) {
      emitMessage(message);
    }
  };

  /**
   * Send a named message to a given client id
   * ```
   *   autoPeer.sendTo('gsZlW6Y2r3SuUI8WAAAB', 'greeting', 'Hey!');
   * ```
   *
   * @param target
   * @param event
   * @param data
   * @returns {boolean}
   */
  _this.sendTo = function (target, event, data) {
    if (connections) {
      return !!connections.filter(function(connection){
        return connection.peer === target;
      }).forEach(function(connection) {
        connection.send(createMessage(event, data));
      });
    }
    return false;
  };
}

AutoPeer.prototype = new EventEmitter();

module.exports = AutoPeer;