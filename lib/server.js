var SocketIo = require('socket.io');
var httpServer = require('http').Server;
var path = require('path');
var version = require('../package').version;
var read = require('fs').readFileSync;
var EventEmitter = require('eventemitter3');

var clientSource = {
  min: read(path.join(__dirname, '..', 'dist', 'auto-peer.min.js'), 'utf-8')
};

/**
 * Returns a SocketIo instance
 */
function guessIoInstance(backend) {
  if (backend instanceof httpServer) {
    return SocketIo(backend);
  }
  if (backend instanceof SocketIo) {
    return backend;
  }
  throw 'Invalid backend type';
}

function AutoPeerBackend(backend) {
  if (!(this instanceof AutoPeerBackend)) {
    return new AutoPeerBackend(backend);
  }
  var _this = this;

  // Get the socketIo and the httpServer instance
  _this.io = guessIoInstance(backend);
  _this.httpServer = this.io.httpServer;

  // Attach static file serving
  _this.attachServe(_this.httpServer);

  // Wait for IO connections
  _this.io.on('connection', function (socket) {
    // Tell the new client its new id
    socket.emit('connected', socket.id);
    // Wait for the response
    socket.on('webrtc', function (msg) {
      if (msg === 'connected') {
        _this.emit('autoPeer:newClient', socket.id);
        _this.io.sockets.in('webrtc').emit('new-connection', socket.id);
        socket.join('webrtc');
      }
    });

  });
}

AutoPeerBackend.prototype = new EventEmitter();

/**
 * Attaches the static file serving. - from socket.io
 *
 * @param {Function|http.Server} http server
 * @api private
 */
AutoPeerBackend.prototype.attachServe = function (srv) {
  var url = '/auto-peer.min.js';
  var evs = srv.listeners('request').slice(0);
  var _this = this;
  srv.removeAllListeners('request');
  srv.on('request', function (req, res) {
    if (0 === req.url.indexOf(url)) {
      _this.serve(req, res);
    } else {
      for (var i = 0; i < evs.length; i++) {
        evs[i].call(srv, req, res);
      }
    }
  });
};

/**
 * Handles a request serving `/socket.io.js`
 *
 * @param {http.Request} req
 * @param {http.Response} res
 * @api private
 */

AutoPeerBackend.prototype.serve = function (req, res) {
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