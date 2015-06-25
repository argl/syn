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
var tts = require("../lib/tts")

router.get('/', function(req, res, next) {
  // text=bla&voice=en_1&pitch=1.0
  if (!req.query.text) {
    return res.status(422).send(JSON.stringify({error: 'insufficient parameters'}))
  }
  var text = req.query.text.substring(0, 255)
  var voice = (req.query.voice || "us_1").substring(0, 255).replace(/[^a-z_0-9]/, '')
  var pitch = req.query.pitch || "0"
  var speed = req.query.speed || "0"
  var params = {
  	text: text,
  	voice: voice,
  	pitch: pitch,
  	speed: speed
  }
  res.set('Content-Type', 'audio/mp3')
  tts.mp3(params)
  .then(function(stream) {
  	stream.pipe(res)
  })
	// .catch(function(err) {
	// 	console.log(JSON.stringify(err))
	// 	return err
	// }) 

});


module.exports = router;
