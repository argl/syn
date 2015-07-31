import _ from 'underscore'
import $ from 'jquery'
import Moment from 'moment'
import 'bootstrap'
import Backbone from "backbone"
import Marionette from "backbone.marionette"
import 'bootstrap-slider'


import audio from './audio'
import SamplePlayer from '../models/sampleplayer'



var PlayerView = Marionette.ItemView.extend({
  template: '#player-view-template',
  className: 'col-xs-4 player',

  events: {
    'click .destroy-btn': function(e) {
      e.preventDefault()
      this.model.stop()
      this.model.destroy()
    },
    'change .gain': function(e) {
      e.preventDefault()
      this.model.set('gain', e.value.newValue)
    },
    'change .distortion': function(e) {
      e.preventDefault()
      this.model.set('distortion', e.value.newValue)
    },
    'change .pan_x': function(e) {
      e.preventDefault()
      this.model.set('pan_x', e.value.newValue)
    },
    'change .pan_y': function(e) {
      e.preventDefault()
      this.model.set('pan_y', e.value.newValue)
    },
  },

  onShow: function() {

    var canvas = this.$('canvas#meter').get(0)
    this.listenTo(this.model, 'change:meter', function(l, r) {
      var ctx = canvas.getContext('2d')
      var w = canvas.width;
      var h = canvas.height;
      ctx.fillStyle = '#555';
      ctx.fillRect(0,0,w,h);
      ctx.fillStyle = '#090';
      var half_height = Math.floor(h / 2)
      ctx.fillRect(0, 0,           Math.floor(w + (w / 72) * l), half_height);
      ctx.fillRect(0, half_height, Math.floor(w + (w / 72) * r), half_height);
    })



    this.gainSlider = this.$('.gain').slider({
      orientation: 'horizontal',
      value: -3,
      min: -60,
      max: 0,
      step: 1,
    })
    this.distortionSlider = this.$('.distortion').slider({
      orientation: 'horizontal',
      value: 0,
      min: 0,
      max: 2000,
      step: 1,
    })
    
    this.panxslider = this.$('.pan_x').slider({
      orientation: 'horizontal',
      value: 0,
      min: -100,
      max: 100,
    })
    this.panxslider = this.$('.pan_y').slider({
      orientation: 'horizontal',
      value: 5,
      min: 1,
      max: 10,
      step: 0.01,
    })


  }
})

var PlayersView = Marionette.CompositeView.extend({
  template: '#players-view-template',
  childView: PlayerView,
  childViewContainer: ".player-container",
})


$(function() {

  var players = new Backbone.Collection()

  var playersview = new PlayersView({
    collection: players
  })

  var app = new Marionette.Application();
  app.addRegions({
    playersRegion: "#running",
  });
  app.start()
  window.app = app

  app.playersRegion.show(playersview)

  // speech form handling
  $('#speech-frm').on('submit', function(e) {
    e.preventDefault()
    var params = {
      speech: true,
      text: $('[name=text]').val(),
      pitch: $('[name=pitch]').val(),
      speed: $('[name=speed]').val(),
      voice: $('[name=voice]').val()
    }
    loadAndPlaySound(params)
  })

  // file input handling
  $('#file-frm').on('submit', function(e) {
    e.preventDefault()
    var params = {
      file: $('[name=file]').val()
    }
    loadAndPlaySound(params)
  })

  function loadAndPlaySound(params) {
    var player = new SamplePlayer({
      params: params,
      destination: context.destination,
    })
    addAndPreparePlayer(player)
  }

  function addAndPreparePlayer(player) {
    player.prepare(context)
    .then(function(player) {
      players.add(player)
    })
  }

  function finishedLoading(bufferList) {
    var convolver = new audio.RoomEffectsSample(context, function(err, efx) {
      var source1 = context.createBufferSource();
      var state = {}
      source1.buffer = bufferList[0];
      source1.connect(context.destination)
      
      state.efx = false
      
      var distortion = context.createWaveShaper();
      function makeDistortionCurve(amount) {
        var k = typeof amount === 'number' ? amount : 50,
        n_samples = 44100,
        curve = new Float32Array(n_samples),
        deg = Math.PI / 180,
        i = 0,
        x;
        for ( ; i < n_samples; ++i ) {
          x = i * 2 / n_samples - 1;
          curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
        }
        return curve;
      };

      distortion.curve = makeDistortionCurve(1000);
      distortion.oversample = '4x';



      source1.loop = true
      source1.start(0)
      state.playing = true
      var $div = $('<div class="col-xs-2 well">')
      var $text = $('<p>').text('VOICE')
      var $efxbtn = $('<button class="btn">').text('EFX').on('click', function(e) {
        e.preventDefault()
        if (state.efx) {
          distortion.disconnect()
          efx.convolver.disconnect()
          source1.disconnect()
          source1.connect(context.destination)
          state.efx = false
        } else {
          source1.disconnect()
          source1.connect(efx.convolver);
          efx.convolver.connect(distortion);
          distortion.connect(context.destination);
          state.efx = true
        }
      })
      var $removebtn = $('<button class="btn">').text('STOP').on('click', function(e) {
        e.preventDefault()
        source1.stop()
        state.playing = false
        source1.disconnect();
        efx.convolver.disconnect();
        $div.remove()
      })
      $div.append($text)
      $div.append($efxbtn)
      $div.append($removebtn)
      $('#running').append($div)
    })
  }

  var context = audio.createContext()
  window.audioContext = context


  // get user inputs
  if (typeof MediaStreamTrack === 'undefined' || typeof MediaStreamTrack.getSources === 'undefined') {
    alert('This browser does not support MediaStreamTrack.\n\nTry Chrome.');
  } else {
    MediaStreamTrack.getSources(gotSources);
  }

  function gotSources(sourceInfos) {
    var audioSelect = document.querySelector('select#audio-sources');
    for (var i = 0; i !== sourceInfos.length; ++i) {
      var sourceInfo = sourceInfos[i];
      var option = document.createElement('option');
      option.value = sourceInfo.id;
      if (sourceInfo.kind === 'audio') {
        option.text = sourceInfo.label || 'microphone ' + (audioSelect.length + 1);
        audioSelect.appendChild(option);
      } else {
        console.log('Some other kind of source: ', sourceInfo);
      }
    }
  }

  // navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;


  // var iphone_enabled = false
  // window.addEventListener('touchstart', function() {
  //   if (!iphone_enabled) {
  //     // create new buffer source for playback with an already
  //     // loaded and decoded empty sound file
  //     var source = context.createOscillator()
  //     // connect to output (your speakers)
  //     source.connect(context.destination);
  //     // play the file
  //     source.noteOn(0);
  //     source.noteOff(context.currentTime + 1000);
  //     iphone_enabled = true;
      
  //   }
  // }, false);

  // // Create the source.
  // var source = context.createBufferSource();
  // // Create the gain node.
  // var gain = context.createGain();
  // // Connect source to filter, filter to destination.
  // source.connect(gain);
  // gain.connect(context.destination);




});



