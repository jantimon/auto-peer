/**
 * Sub class of the original Peer.js class
 */
var Peer = require('peerjs');
var EventEmitter = require('eventemitter3');
var utils = require('./utils');

function AutoPeer(options) {
  if (!(this instanceof AutoPeer)) {
    return new AutoPeer(options);
  }
  var _this = this;

  options = utils.extend({
    autoPeer: true,
    host: document.location.hostname,
    port: document.location.port,
    path: '/auto-peer',
    key: 'peerjs'
  }, options || {});

  // Create a new instance of the PatchedPeerJs class
  _this.peerJs = new Peer(options);
  // Set clientId
  _this.on('autoPeer:connected', function (clientId) {
    _this.clientId = clientId;
    _this.peers[clientId] = false;
  });
  // Wait for server messages
  _this.peerJs.on('autoPeer', _this._onMessageFromServer.bind(this));
  // Incoming webRTC Connections
  _this.peerJs.on('connection', _this._addPeer.bind(this));
}

AutoPeer.prototype = new EventEmitter();

AutoPeer.prototype.peers = {};

AutoPeer.customPeerJsFunctions = {
  _handleMessage: function (peerJsHandleMessageFunction) {
    return function _handleMessage(message) {
      if (message.type !== 'autoPeer') {
        return peerJsHandleMessageFunction.apply(this, arguments);
      }
      this.emit('autoPeer', message.payload);
    };
  }
};

// Overwrite peerJs functions
Object.keys(AutoPeer.customPeerJsFunctions).forEach(function (functionName) {
  var originalFunction = Peer.prototype[functionName];
  var customFunction = AutoPeer.customPeerJsFunctions[functionName](originalFunction);
  Peer.prototype[functionName] = function () {
    if (this.options.autoPeer) {
      return customFunction.apply(this, arguments);
    }
    return originalFunction.apply(this, arguments);
  };
});

AutoPeer.prototype.send = function (event, data, sendToMyself) {
  var _this = this;
  Object.keys(_this.peers).forEach(function (peerId) {
    if (peerId !== _this.clientId || sendToMyself) {
      _this.sendTo(peerId, event, data);
    }
  });
};

AutoPeer.prototype.sendTo = function (target, event, data) {
  var message = {
    source: this.clientId,
    event: event,
    data: data,
    prefix: 'client'
  };
  if (target === this.clientId) {
    this._emitMessage(message);
  } else if (this.peers[target]) {
    this.peers[target].send(message);
  }
};

AutoPeer.prototype._onMessageFromServer = function (message) {
  if (message.event === 'autoPeer:peerCollectionUpdate') {
    this._setPeers(message.data);
  }
  this._emitMessage(message);
};

AutoPeer.prototype._setPeers = function (clients) {
  var _this = this;
  clients = clients.filter(function (peerId) {
    return peerId !== _this.clientId;
  });
  // Remove disconnected peers
  Object.keys(_this.peers).filter(function (peerId) {
    return clients.indexOf(peerId) === -1;
  }).forEach(function (peerId) {
    _this._disconnectPeer(_this.peers[peerId], peerId);
  });
  // Get new peers
  var newClients = clients.filter(function (peerId) {
    return !_this.peers[peerId];
  });
  // Add new peers
  newClients.forEach(_this._connectPeer.bind(_this));
  // Add self
  _this.peers[_this.clientId] = false;
};

/**
 * Clean up on peer connection loss
 *
 * @private
 * @param message
 */
AutoPeer.prototype._disconnectPeer = function (peer, peerId) {
  if (peer) {
    peer.removeAllListeners();
    peer.close();
  }
  delete(this.peers[peerId]);
};

/**
 * Clean up on peer connection loss
 *
 * @private
 * @param message
 */
AutoPeer.prototype._connectPeer = function (peerId) {
  this._addPeer(this.peerJs.connect(peerId));
};

/**
 * Add peer to internal storage
 *
 * @private
 * @param message
 */
AutoPeer.prototype._addPeer = function (connection) {
  var _this = this;
  if (_this.peers[connection.peer]) {
    _this.peers[connection.peer].removeAllListeners();
  }
  connection.on('data', function (data) {
    _this._emitMessage(data);
  });
  _this.peers[connection.peer] = connection;
};

/**
 * Emit three data events:
 *  + autoPeer:eventName
 *  + eventName
 *  + client|server:eventName
 *
 * @private
 * @param message
 */
AutoPeer.prototype._emitMessage = function (message) {
  this.emit('autoPeer:data', message.data, message);
  this.emit(message.event, message.data, message);
  this.emit(message.prefix + ':' + message.event, message.data, message);
};

module.exports = AutoPeer;