module.exports = function(grunt) {
  
  grunt.loadNpmTasks('grunt-contrib');
  
  grunt.initConfig({
    pkg: '<json:package.json>',
    clean: ['dist'],
    coffee: {
      compile: {
        files: {
          'dist/*.js': 'src/*.coffee'
        }
      }
    },
    min: {
      dist: {
        src: ['dist/<%= pkg.name %>.js'],
        dest: 'dist/<%= pkg.name %>.min.js'
      }
    }
  });
  
  grunt.registerTask('default', ['clean', 'coffee', 'min']);
};
