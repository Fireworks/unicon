
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var mongoose = require('mongoose');
var AWS = require('aws-sdk'); 

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.favicon(__dirname + '/public/favicon.ico'));
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.json());
app.use(express.urlencoded());
app.use(require('connect-multiparty')({uploadDir: './'})); //connect-multipart deprecated
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

AWS.config.loadFromPath('./config.json');

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
mongoose.connect(process.env.MONGOHQ_URL);

app.get('/', routes.index);
app.get('/images/:key', routes.image);
app.post('/add', routes.add); //todo: ajax'ify
app.post('/remove', routes.remove); //todo: ajax'ify

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});