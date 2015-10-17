var express = require('express');
var router = express.Router();
var _ = require('underscore');
var config = require('config');
var nano = require('nano')({
  url: config.couch.url.replace(/:\/\//, '://'+config.couch.username+':'+config.couch.password+'@')
});
var prom = require('nano-promises');
var db = prom(nano).db.use(config.couch.db);
var ndb = nano.use(config.couch.db)
var docuri = require("docuri")
var moment = require("moment")

router.get('/', function(req, res, next) {
  res.render('index', { 
    title: 'SYN', 
    config: config 
  });
});

module.exports = router;
