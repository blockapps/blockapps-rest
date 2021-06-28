const { dest, series, src, task } = require("gulp");
const ts = require("gulp-typescript");
const babel = require("gulp-babel");
const gulpClean = require("gulp-clean");
const sourcemaps = require("gulp-sourcemaps");
const exec = require("child_process").exec;
const merge = require("merge-stream");

function clean() {
    return merge([
	src('dist', { read: false, allowEmpty: true }).pipe(gulpClean()),
	src('lib', { read: false, allowEmpty: true }).pipe(gulpClean()),
    ]);
}

var tsProject = ts.createProject("tsconfig.json");

function compile() {
    var tsResult = tsProject.src().pipe(tsProject());
    return merge([
	tsResult.js.pipe(dest("lib")),
	tsResult.dts.pipe(dest("lib")),
	src('./src/test/fixtures/**/*').pipe(dest('./lib/test/fixtures')),
	src('./src/util/test/fixtures/**/*').pipe(dest('./lib/util/test/fixtures'))
    ]);
}

function generate() {
    return merge([
	
	src(['lib/**/*.js', '!**/test/', '!**/test/**'])
	    .pipe(sourcemaps.init())
	    .pipe(babel({ presets: ['@babel/preset-env', 'minify'] }))
	    .pipe(sourcemaps.write('.', { sourceRoot: '/lib' }))
	    .pipe(dest('dist')),
	
	src('./lib/**/*.d.ts')
	    .pipe(dest('./dist/'))
    ]);
}

function generateDocs(cb) {
  exec(
    "rm -rf docs && node_modules/.bin/jsdoc -c jsdoc-conf.json -d docs",
    (err, stdout) => {
      console.log(stdout);
      cb(err);
    }
  );
}


exports.clean = clean;
exports.compile = compile;
exports.generate = generate;
exports.build = series(compile, generate);
exports.generateDocs = generateDocs;
exports.default = series(clean, compile, generate, generateDocs);
