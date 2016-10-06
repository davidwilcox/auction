var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');

var routes = require('./routes/index');
//var admin = require('./routes/admin/index');
var users = require('./routes/users');

require('./config/passport');

var app = express();

var multipart = require('connect-multiparty');

app.use(multipart({
    uploadDir: "/tmp"
}));


function ensureSecure(req, res, next){
  if(req.secure){
    // OK, continue
    return next();
  };
  // handle port numbers if you need non defaults
  // res.redirect('https://' + req.host + req.url); // express 3.x
  res.redirect('https://' + req.hostname + req.url); // express 4.x
};
if ( process.env.SSL_PORT )
    app.all('*', ensureSecure);



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//app.use(express.bodyParser());
app.use(passport.initialize());

app.use('/', routes);
//app.use('/admin', admin);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
	console.log(err.stack);
      if ( err.status == 500 ) {
          console.log(err.message);
          console.log(err.stack);
      }
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
} else {

    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
        if ( err.status == 500 ) {
            console.log(err.message);
            console.log(err.stack);
        }
    });
}

module.exports = app;
