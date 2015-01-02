var casper = require('casper').create({
  logLevel: 'info'
});

casper.test.begin('auto peer', 10, function (test) {

  // Initialize the testing environment
  casper
    .start('http://127.0.0.1:3001/', function () {
      return this.waitForSelector('body.peers-ready', function () {
      });
    }, 10000);

  casper.wait(5000);

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
        messages.concat(testingEnvironment.dataReceived);
      });
      return messages;
    }, [], 'No messages received');
  });

  // Send
  casper.evaluate(function () {
    window.testingEnvironments[0].autoPeer.send('hello-peers');
  });

  // Assert that sending a message from the first peer will be received by the second and the third peer
  casper.then(function () {
    // Send
    casper.evaluate(function () {
      window.testingEnvironments[0].autoPeer.send('hello-peers');
    });
    // Wait for 100ms
    casper.wait(100);

    casper.then(function () {
      // Test
      test.assertEvalEquals(function () {
        return window.testingEnvironments[0].dataReceived;
      }, [], 'Peer one did not receive its own message');
      test.assertEvalEquals(function () {
        return window.testingEnvironments[1].dataReceived;
      }, ['hello-peers'], 'Peer two received the message');
      test.assertEvalEquals(function () {
        return window.testingEnvironments[2].dataReceived;
      }, ['hello-peers'], 'Peer three received the message');

    });
  });

  // Assert that the send self option works
  casper.then(function () {
    // Send
    casper.evaluate(function () {
      window.clearData();
      window.testingEnvironments[0].autoPeer.send('hello-peers-send-self', true);
    });
    // Wait for 100ms
    casper.wait(100);

    casper.then(function () {
      // Test
      test.assertEvalEquals(function () {
        return window.testingEnvironments[0].dataReceived;
      }, ['hello-peers-send-self'], 'Send-self: Peer one did receive its own message');
      test.assertEvalEquals(function () {
        return window.testingEnvironments[1].dataReceived;
      }, ['hello-peers-send-self'], 'Send-self: Peer two received the message');
      test.assertEvalEquals(function () {
        return window.testingEnvironments[2].dataReceived;
      }, ['hello-peers-send-self'], 'Send-self: Peer three received the message');

    });
  });


  // Assert that no client side javascript errors occurred
  casper.then(function () {
    var errors = casper.evaluate(function () {
      var errors = [];
      window.testingEnvironments.forEach(function (testingEnvironment) {
        errors.concat(testingEnvironment.errors);
      });
      return errors;
    });
    test.assertEquals(errors, [], 'No client side javascript errors received');
  });

  // Launch casper
  casper.run(function () {
    this.exit(test.done());
  });

});

