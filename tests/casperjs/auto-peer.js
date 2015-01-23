var casper = require('casper').create({
  logLevel: 'info'
});

casper.test.begin('auto peer', 16, function (test) {

  // Initialize the testing environment
  casper
    .start('http://127.0.0.1:3001/', function () {
      return this.waitForSelector('body.peers-ready', function () {
      }, 10000);
    });

  // Assert that all peers are up and running
  casper.then(function () {
    test.assertEvalEquals(function () {
      return window.testingEnvironments.length;
    }, 3, 'Three iframes registered their testing environment');
  });

  // Assert that every peer got his client id
  casper.then(function () {
    test.assertEvalEquals(function () {
      return window.testingEnvironments.filter(function (testingEnvironment) {
        return testingEnvironment.autoPeer.clientId !== undefined;
      }).length;
    }, 3, 'Every peer has an id');
  });

  // Assert that no peer received any messages by now
  casper.then(function () {
    test.assertEvalEquals(function () {
      var messages = [];
      window.testingEnvironments.forEach(function (testingEnvironment) {
        messages.concat(testingEnvironment.messageReceived);
      });
      return messages;
    }, [], 'No messages received');
  });

  // Assert that sending a message from the first peer will be received by the second and the third peer
  casper.then(function () {
    // Send
    casper.evaluate(function () {
      window.clearData();
      window.testingEnvironments[0].autoPeer.broadcast('data', 'hello-peers');
    });
    // Wait for 100ms
    casper.wait(100);

    casper.then(function () {
      // Test
      test.assertEvalEquals(function () {
        return window.testingEnvironments[0].messageReceived;
      }, [], 'Peer one did not receive its own message');
      test.assertEvalEquals(function () {
        return window.testingEnvironments[1].messageReceived;
      }, ['hello-peers'], 'Peer two received the message');
      test.assertEvalEquals(function () {
        return window.testingEnvironments[2].messageReceived;
      }, ['hello-peers'], 'Peer three received the message');

    });
  });

  // Assert that the send self option works
  casper.then(function () {
    // Send
    casper.evaluate(function () {
      window.clearData();
      window.testingEnvironments[0].autoPeer.broadcast('data', 'hello-peers-send-self', true);
    });
    // Wait for 100ms
    casper.wait(100);

    casper.then(function () {
      // Test
      test.assertEvalEquals(function () {
        return window.testingEnvironments[0].messageReceived;
      }, ['hello-peers-send-self'], 'Send-self: Peer one did receive its own message');
      test.assertEvalEquals(function () {
        return window.testingEnvironments[1].messageReceived;
      }, ['hello-peers-send-self'], 'Send-self: Peer two received the message');
      test.assertEvalEquals(function () {
        return window.testingEnvironments[2].messageReceived;
      }, ['hello-peers-send-self'], 'Send-self: Peer three received the message');

    });
  });

  // Assert that the sendTo function sends a message only to the specified target
  casper.then(function () {
    // Send
    casper.evaluate(function () {
      window.clearData();
      var targetId = window.testingEnvironments[1].autoPeer.clientId;
      window.testingEnvironments[0].autoPeer.sendTo(targetId, 'data', 'hello-peer-two');
    });
    // Wait for 100ms
    casper.wait(100);

    casper.then(function () {
      // Test
      test.assertEvalEquals(function () {
        return window.testingEnvironments[0].messageReceived;
      }, [], 'Send-to-two: Peer one did not receive its own message');
      test.assertEvalEquals(function () {
        return window.testingEnvironments[1].messageReceived;
      }, ['hello-peer-two'], 'Send-to-two: Peer two did receive the message');
      test.assertEvalEquals(function () {
        return window.testingEnvironments[2].messageReceived;
      }, [], 'Send-to-two: Peer three did not receive the message');

      var senderId = casper.evaluate(function () {
        return window.testingEnvironments[0].autoPeer.clientId;
      });

      test.assertEvalEquals(function () {
        return window.testingEnvironments[1].dataReceived;
      }, [{
        'source': senderId,
        'event': 'data',
        'data': 'hello-peer-two',
        'prefix': 'client'
      }], 'Send-to-two: Message was sent from peer one');
    });
  });

  // Assert that the server receives and sends messages
  casper.then(function () {
    // Send
    casper.evaluate(function () {
      window.clearData();
      window.testingEnvironments[0].autoPeer.sendTo('server', 'mirror', 'hello-server');
    });
    // Wait for 100ms
    casper.wait(150);

    casper.then(function () {
      // Test
      test.assertEvalEquals(function () {
        return window.testingEnvironments[0].messageReceived;
      }, ['hello-server'], 'Send-self: Peer one received a message from the server');

    });
  });

  // Assert that the server receives and sends messages
  casper.then(function () {
    // Send
    casper.evaluate(function () {
      window.clearData();
      window.testingEnvironments[0].autoPeer.broadcast('mirror', 'hello-peers-and-server', false);
    });
    // Wait for 100ms
    casper.wait(150);

    casper.then(function () {
      // Test
      test.assertEvalEquals(function () {
        return window.testingEnvironments[0].messageReceived;
      }, ['hello-peers-and-server'], 'Send-self: Peer one received a message from the server');

    });
  });

  // Initialize the parallel testing environment
  casper.then(function () {
    casper.page.close();
    casper.thenOpen('http://127.0.0.1:3001/parallel.html', function () {
      return this.waitForSelector('body.peers-ready', function () {
      }, 20000);
    })
    .then(function(){
      test.assertEvalEquals(function () {
        return window.testingEnvironments.length;
      }, 5, 'Five iframes registered their testing environment in parallel');
    });
  });

  // Launch casper
  casper.run(function () {
    console.log('End');
    setTimeout(function() {
      casper.exit(test.done());
    }, 100);
  });

});

