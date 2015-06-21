module.exports = function(grunt) {

  grunt.initConfig({
    config: require('config'),
    pkg: grunt.file.readJSON('package.json'),

    express: {
      app: {
        options: {
          script: 'bin/app',
          background: false
        }
      },
      dev: {
        options: {
          script: 'bin/app'
        }
      }
    },

    env: {
      development: {
        NODE_ENV: 'development',
        DEBUG: 'syn*'
      },
      production: {
        NODE_ENV: 'production'
      }
    },
    
    watch: {
      all: {
        files: [
          '*.js',
          'views/*.jade',
          'controllers/**/*.js',
          'lib/**/*.js',
          'routes/*.js',
          'public/**/*.js',
        ],
        tasks: ['express:dev'],
        options: {
          spawn: false
        }
      }
    },

    'couch-compile': {
      app: {
        options: {
          merge: 'couch/app/shared'
        },
        files: {
          'tmp/app.json': 'couch/app/*'
        }
      },

    },

    'couch-push': {
      options: {
        user: "<%= config.couch.username %>",
        pass: "<%= config.couch.password %>",
      },
      app: {
        files: {
          '<%= config.couch.url %>/<%= config.couch.db %>': 'tmp/app.json'
        }
      },
    },

    clean: ['tmp'],

    copy: {
      couch: {
        files: [
          {
            expand: true,
            cwd: 'node_modules/docuri',
            src: 'index.js',
            rename: function(dest, src) { return dest + "/docuri.js" },
            dest: 'couch/app/shared/views/lib'
          },
          {
            expand: true,
            cwd: 'node_modules/moment',
            src: 'moment.js',
            rename: function(dest, src) { return dest + "/moment.js" },
            dest: 'couch/app/shared/views/lib'
          }
        ]
      },
    },



  })

  grunt.loadNpmTasks('grunt-couch')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-express-server')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-env')
  grunt.loadNpmTasks('grunt-contrib-copy')


  grunt.registerTask('build', ['copy:couch', 'couch-compile', 'concat']);
  grunt.registerTask('deploy', ['copy:couch', 'couch-compile', 'couch-push:app']);
  grunt.registerTask('default', ['env:development', 'express:dev', 'watch:all']);

}

