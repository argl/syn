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
  // text=bla&voice=en_1&pitch=1.0
  if (!req.query.text) {
    return res.status(422).send(JSON.stringify({error: 'insufficient parameters'}))
  }
  var text = req.query.text.substring(0, 255)
  var voice = req.query.voice ? req.query.voice.substring(0, 255).replace(/[^a-z_0-9]/, '') : 'us_1'
  var pitch = req.query.pitch ? parseFloat(req.query.pitch) : 1.0
  res.send(JSON.stringify({ok: true, text: req.query.text}));
});


module.exports = router;
