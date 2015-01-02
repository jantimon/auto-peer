/* jshint camelcase: false */
module.exports = function (grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      dev: {
        options: {
          plugin: [require('bundle-collapser/plugin')]
        },
        src: ['lib/exports.js', 'node_modules/peerjs/lib/exports.js'],
        dest: 'dist/auto-peer.js'
      }
    },

    uglify: {
      prod: {
        options: { mangle: true, compress: true },
        src: 'dist/auto-peer.js',
        dest: 'dist/auto-peer.min.js'
      }
    },

    concat: {
      dev: {
        options: {
          banner: '/*! <%= pkg.name %> build:<%= pkg.version %>, development. ' +
            'Copyright(c) 2014 <%= pkg.author %>' +
            ' depends on: http://peerjs.com/ and http://socket.io/ */'
        },
        src: 'dist/auto-peer.js',
        dest: 'dist/auto-peer.js'
      },
      prod: {
        options: {
          banner: '/*! <%= pkg.name %> build:<%= pkg.version %>, production. ' +
            'Copyright(c) 2014 <%= pkg.author %>' +
            ' depends on: http://peerjs.com/ and http://socket.io/ */'
        },
        src: 'dist/auto-peer.min.js',
        dest: 'dist/auto-peer.min.js'
      }
    },

    run: {
      test_server: {
        options: {
          wait: false
        },
        args: [
          'tests/fixtures/server.js'
        ]
      }
    },

    casper: {
      options: {
        engine: 'slimerjs',
        'fail-fast': true,
        'log-level': 'info',
        verbose: true,
        parallel: false,
        test: true
      },
      files: ['tests/casperjs/**/*.js']
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      files: [
        'Gruntfile.js',
        'lib/**/*.js',
        'tests/casperjs/**/*.js'
      ]
    }

  });


  grunt.registerTask('default', ['jshint', 'browserify', 'uglify', 'concat']);

  grunt.registerTask('test', ['jshint', 'run:test_server', 'casper']);

};