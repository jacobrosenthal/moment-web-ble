var gulp = require('gulp'),
    closureCompiler = require('google-closure-compiler').gulp();

gulp.task('compile', function () {
  return closureCompiler([
        '--js', './src/moment-web-ble.js',
        '--language_in', 'ECMASCRIPT6_STRICT',
        '--language_out', 'ECMASCRIPT5_STRICT',
        '--warning_level', 'VERBOSE',
        '--output_wrapper', '(function(){\n%output%\n}).call(this)',
        '--compilation_level', 'ADVANCED',
        '--js_output_file', 'moment-web-ble.min.js'
      ])
      .src() // needed to force the plugin to run without gulp.src
      .pipe(gulp.dest('./dist'));
});
