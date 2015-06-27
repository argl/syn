var exec = require('child-process-promise').exec
var fs = require("promised-io/fs");


module.exports = {
	mp3: function(params) {
		var xml = ['<?xml version="1.0"?>',
'<!DOCTYPE SABLE PUBLIC "-//SABLE//DTD SABLE speech mark up//EN" "Sable.v0_2.dtd" []>',
'',
'<SABLE>',
'<SPEAKER NAME="'+params.voice+'">',
'<RATE SPEED="'+params.speed+'%">',
'<PITCH BASE="'+params.pitch+'%">',
params.text,
'</PITCH>',
'</RATE>',
'</SPEAKER>',
'</SABLE>'].join("\n")

		var cmd = 'scripts/t2w -mode sable -o tmp/sable.wav tmp/sable.xml'
		console.log(cmd)
		return fs.writeFile("tmp/sable.xml", xml)
		.then(function() {
			return exec(cmd)
		})
		.then(function (result) {
			// var stdout = result.stdout;
			var stderr = result.stderr;
   		// console.log('stdout: ', stdout);
   		console.log('stderr: ', stderr);
			return 'tmp/sable.wav'
		})
		.then(function(filepath) {
			var cmd = "lame --preset voice tmp/sable.wav tmp/sable.mp3"
			return exec(cmd)
			.then(function() {
				return "tmp/sable.mp3"
			})
		})
		.then(function(filepath) {
			return fs.createReadStream(filepath)
		})
	}

}