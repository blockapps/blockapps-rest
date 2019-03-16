const {
  dest, 
  series,
  src
} = require('gulp');
const babel = require('gulp-babel');
const gulpClean = require('gulp-clean');
const minify = require('gulp-babel-minify');
const sourcemaps = require('gulp-sourcemaps')

function clean() {
  return src('dist', { read: false, allowEmpty: true })
    .pipe(gulpClean());
}

function build() {
  return src('lib/*.js')
    .pipe(babel({
      presets: [
        [ "@babel/preset-env"
        , { targets: { "node": true }
          , modules: "cjs"
          }
        ]
      ],
      plugins: [ "@babel/plugin-proposal-object-rest-spread"]
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(minify({
      mangle: {
        keepClassName: true
      }
    }))
    .pipe(dest('dist'));
}

exports.clean = clean;
exports.build = build;
exports.default = series(clean, build);
