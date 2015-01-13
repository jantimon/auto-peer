var ExpressPeerServer = require('peer').ExpressPeerServer;
var express = require('express');
var path = require('path');
var version = require('../package').version;
var read = require('fs').readFileSync;
var EventEmitter = require('eventemitter3');

var clientSource = {
  min: read(path.join(__dirname, '..', 'dist', 'auto-peer.min.js'), 'utf-8')
};

function AutoPeerBackend(server, options) {
  if (!(this instanceof AutoPeerBackend)) {
    return new AutoPeerBackend(server, options);
  }
  this.server = server;
  this.app = express();
  this.app.on('mount', this.init.bind(this));
}

AutoPeerBackend.prototype = new EventEmitter();

AutoPeerBackend.prototype.defaultKey = 'peerjs';

AutoPeerBackend.prototype.init = function () {
  var _this = this;

  _this.peerServer = new ExpressPeerServer(this.server);
  _this.peerServer.on('mount', function () {
    _this.wss = _this.peerServer._wss;
    _this.clients = _this.peerServer._clients;
    _this.emit('connected');
  });

  // Attach
  _this.app.get('/auto-peer.min.js', _this._serve);
  _this.app.use('/auto-peer', _this.peerServer);

  // Handle new connections
  _this.peerServer.on('connection', _this._onNewPeerConnection.bind(this));
};

AutoPeerBackend.prototype._onNewPeerConnection = function (newClientId) {
  var _this = this;
  // Say hi to the new client
  _this.broadcast('autoPeer:peerCollectionUpdate', {
    newPeer: newClientId,
    peers: _this.getClientIds()
  });
  _this.emit('autoPeer:newClient', newClientId);
};

/**
 * Sends a message to all clients of the given key - if no key is specified the default key is used
 *
 * @param key optional
 * @returns {*|Array}
 */
AutoPeerBackend.prototype.broadcast = function (event, data, key) {
  var _this = this;
  _this.getClientIds(key).forEach(function (clientId) {
    _this.sendTo(clientId, event, data, key);
  });
};

/**
 * Returns all clients with a valid socket for the given key
 * if no key is specified the default key is used
 *
 * @param key optional
 * @returns {*|Array}
 */
AutoPeerBackend.prototype.getClientIds = function(key) {
  var clients = this.clients[key || this.defaultKey];
  return Object.keys(clients|| {}).filter(function(clientId) {
    return clients[clientId].socket;
  });
};

/**
 * Get the client for the given client id and key - if no key is specified the default key is used
 *
 * @param clientId
 * @param key optional
 * @returns {*}
 */
AutoPeerBackend.prototype.getClient = function (clientId, key) {
  key = key || this.defaultKey;
  return this.peerServer._clients[key] ? this.peerServer._clients[key][clientId] : undefined;
};

/**
 * Sends a message to the given clientId and key  - if no key is specified the default key is used
 *
 * @param clientId
 * @param event
 * @param data
 * @param key optional
 */
AutoPeerBackend.prototype.sendTo = function (clientId, event, data, key) {
  var client = this.getClient(clientId, key);
  if (client) {
    client.socket.send(JSON.stringify({
      type: 'autoPeer',
      payload: {
        event: event,
        data: data,
        source: 'server',
        prefix: 'server'
      }
    }));
  }
};


/**
 * Handles a request serving `/auto-peer.min.js`
 * @param {http.Request} req
 * @param {http.Response} res
 * @api private
 */

AutoPeerBackend.prototype._serve = function (req, res) {
  var etag = req.headers['if-none-match'];
  if (etag) {
    if (version === etag) {
      res.writeHead(304);
      res.end();
      return;
    }
  }
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('ETag', version);
  res.writeHead(200);
  res.end(clientSource.min);
};


module.exports = AutoPeerBackend;