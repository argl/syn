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
var fs = require("fs")
var path = require('path');

var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

router.get('/', function(req, res, next) {
  walk("public/sounds/impulse-response", function(err, result) {
    var sounds = []
    _.each(result, function(path) {
      var parts = path.split(/\//)
      var filename = parts[parts.length - 1]
      sounds.push({id:filename, name:filename, path:path.replace(/.*public/, '')})
    })
    res.send(JSON.stringify(sounds))
  })
});

module.exports = router;
