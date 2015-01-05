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

  // Ready state
  _this.ready = false;
  // Create a new instance of the PatchedPeerJs class
  _this.peerJs = new Peer(options);
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
  } else if (this.peers[target].connection) {
    this.peers[target].connection.send(message);
  }
};

AutoPeer.prototype._onMessageFromServer = function (message) {
  if (message.event === 'autoPeer:peerCollectionUpdate') {
    this.clientId = this.peerJs.id;
    this._setPeers(message.data);
  }
  this._emitMessage(message);
};

AutoPeer.prototype._setPeers = function (peerCollectionUpdate) {
  var _this = this;
  var peers = peerCollectionUpdate.peers;
  var newPeer = peerCollectionUpdate.newPeer;

  if (newPeer !== _this.clientId) {
    // Add peers
    _this._connectPeer(newPeer);
  } else {
    // Wait for connection
    peers.forEach(function (peerId) {
      _this.peers[peerId] = { state: 'waiting' };
    });
    _this.peers[newPeer] = { state: 'self' };
  }

  // Remove disconnected peers
  Object.keys(_this.peers).filter(function (peerId) {
    return peers.indexOf(peerId) === -1;
  }).forEach(function (peerId) {
    _this._disconnectPeer(_this.peers[peerId], peerId);
  });

  _this._updateReadyState();
};

AutoPeer.prototype.getWaitingPeers = function () {
  var _this = this;
  return Object.keys(_this.peers).filter(function (peerId) {
    var peer = _this.peers[peerId];
    return !peer || peer.state === 'waiting' || peer.state === 'connecting';
  });
};

/**
 * Clean up on peer connection loss
 *
 * @private
 * @param message
 */
AutoPeer.prototype._disconnectPeer = function (peer, peerId) {
  if (peer.connection) {
    peer.connection.removeAllListeners();
    peer.connection.close();
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
  var peer = {
    state: 'connecting',
    connection: connection
  };

  if (_this.peers[connection.peer] && _this.peers[connection.peer].connection) {
    _this.peers[connection.peer].connection.removeAllListeners();
  }
  connection.on('data', function (data) {
    _this._emitMessage(data);
  });
  this.peers[connection.peer] = peer;

  // Wait until the connection is open
  peer.connection.once('open', function () {
    peer.state = 'connected';
    _this._updateReadyState();
    if (connection.peer !== this.clientId) {
      _this.emit('autoPeer:peerJoined', connection.peer);
    }
  });
};

/**
 * Checks if all peers are ready and fires the autoPeer:connected event
 *
 * @private
 */
AutoPeer.prototype._updateReadyState = function () {
  var _this = this;
  // Send ready event as soon as no more peers are establishing a connection
  if (!this.ready && this.getWaitingPeers().length === 0) {
    this.ready = true;
    _this.emit('autoPeer:connected', this.clientId);
  }
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