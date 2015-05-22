/*global module:false*/
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        // Load package config
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            docs: ["docs"]
        },

        // jsdoc -c jsDocConf.json
        //jsdoc: {
        //    "src": ["src/**/*.js", "README_DOC.md"],
        //    options: {
        //        destination: "docs"
        //    }
        //}
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks("grunt-jsdoc");
    grunt.loadNpmTasks("grunt-contrib-clean");

    // Default task.
    grunt.registerTask("docs", ["clean:docs", "jsdoc"]);
};