const { dest, series, src } = require("gulp");
const babel = require("gulp-babel");
const gulpClean = require("gulp-clean");
const sourcemaps = require("gulp-sourcemaps");
const uglify = require("gulp-uglify");

function clean() {
  return src("dist", { read: false, allowEmpty: true }).pipe(gulpClean());
}

function build() {
  return src(["lib/**/*.js", "!**/test/", "!**/test/**"])
    .pipe(sourcemaps.init())
    .pipe(babel({ presets: ["@babel/preset-env"] }))
    .pipe(uglify())
    .pipe(sourcemaps.write("."))
    .pipe(dest("dist"));
}

exports.clean = clean;
exports.build = build;
exports.default = series(clean, build);
