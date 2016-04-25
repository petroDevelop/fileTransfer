/**
 * Created by Administrator on 2016/4/22.
 */

var NwBuilder = require('nw-builder');
var gulp = require('gulp');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var clean = require('gulp-clean');
var useref = require('gulp-useref');
var minifyCss = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var gulpif = require('gulp-if');
var run = require('gulp-run');
const zip = require('gulp-zip');
var runSequence = require('gulp-run-sequence');

/*
var rename = require('gulp-rename');
var watch = require('gulp-watch');
var notify = require('gulp-notify');
var concat = require('gulp-concat');
var filter = require('gulp-filter');

*/


//index.html css、js合并压缩
gulp.task('index', function () {
   // var assets = useref.assets();
    return gulp.src('distribute/app/source/**')
        .pipe(gulpif('**/*.png', imagemin()))
        .pipe(gulpif('**/*.jpg', imagemin()))
        .pipe(gulpif('**/*.gif', imagemin()))
        .pipe(gulpif('**/*.js', uglify()))
        .pipe(gulpif('**/*.css', minifyCss()))
        .pipe(useref())
        .pipe(gulp.dest('distribute/app/compass'));
});

// 语法检查
gulp.task('jshint', function () {
    return gulp.src('package/js/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// 复制文件
gulp.task('copy', function () {
    gulp.src('package.json').pipe(gulp.dest('distribute/app/source/'));
    gulp.src('logo.png').pipe(gulp.dest('distribute/app/source/'));
    gulp.src('loading.gif').pipe(gulp.dest('distribute/app/source/'));
    gulp.src('load.html').pipe(gulp.dest('distribute/app/source/'));
    //gulp.src('package/!*') //只复制单层目录及文件
    return gulp.src('package/**/*').pipe(gulp.dest('distribute/app/source/package/'))

});
gulp.task('clean', function () {
     gulp.src(['distribute/app/source/*'], {read: false})
        .pipe(clean({force: true}));
    gulp.src(['distribute/app/compass/*'], {read: false})
        .pipe(clean({force: true}));
    return true;
});
gulp.task('nw', function () {
    var nw = new NwBuilder({
        version: '0.12.0',
        files: 'distribute/app/compass/**',
        macIcns: 'logo.png',
        macPlist: {mac_bundle_id: 'myPkg'},
        platforms: ['win64']//'win32',, 'osx32', 'osx64'
    });

    // Log stuff you want
    nw.on('log', function (msg) {
        gutil.log('nw-builder', msg);
    });

    // Build returns a promise, return it so the task isn't called in parallel
    return nw.build().catch(function (err) {
        gutil.log('nw-builder', err);
    });
});


gulp.task('zip', function () {
    return gulp.src('./distribute/app/compass/package/*')
        .pipe(zip('package.zip'))
        .pipe(gulp.dest('./distribute/app/compass'));
});
gulp.task('install', function () {
    run('cd distribute/app/compass & npm i').exec()  // prints "Hello World\n".
        .pipe(gulp.dest('output'))
});
//'jshint','clean','copy','index','install','nw'
gulp.task('run', function(cb) {
    runSequence('clean','copy','index','install','nw', cb);
});
gulp.task('default', ['index']);