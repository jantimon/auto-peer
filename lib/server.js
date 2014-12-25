var SocketIo = require('socket.io');
var httpServer = require('http').Server;
var path = require('path');

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

function autoPeerBackend(backend) {
  var io = guessIoInstance(backend);

  io.on('connection', function (socket) {

    socket.emit('connected', socket.id);

    socket.on('webrtc', function (msg) {
      if (msg === 'connected') {
        console.log(socket.id, 'is ready for webrtc connections');
        io.sockets.in('webrtc').emit('new-connection', socket.id);
        socket.join('webrtc');
      }
    });

  });
}

var clientHelper = {
  file: function file(devVersion) {
    return path.join(__dirname, '..', 'dist', devVersion ? 'auto-peer.js' : 'auto-peer.min.js');
  },
  middleWare: function (devVersion) {
    return function middleWare(req, res) {
      res.sendFile(clientHelper.file(devVersion));
    };
  }
};


module.exports = autoPeerBackend;
module.exports.clientHelper = clientHelper;