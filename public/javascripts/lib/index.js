import _ from 'underscore'
import $ from 'jquery'
import Moment from 'moment'
import 'bootstrap'
import Backbone from "backbone"
import Marionette from "backbone.marionette"
import 'bootstrap-slider'


import audio from './audio'
import SamplePlayer from '../models/sampleplayer'
import GrainPlayer from '../models/grainplayer'



var PlayerView = Marionette.ItemView.extend({
  template: '#player-view-template',
  className: 'col-xs-4 player sampleplayer',

  events: {
    'click .destroy-btn': function(e) {
      e.preventDefault()
      this.model.stop()
      this.model.destroy()
    },
    'click .play-btn': function(e) {
      e.preventDefault()
      this.model.play()
    },
    'click .stop-btn': function(e) {
      e.preventDefault()
      this.model.stop()
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
    'change .rate': function(e) {
      e.preventDefault()
      this.model.set('rate', e.value.newValue)
    },

    'change .reverb_gain': function(e) {
      e.preventDefault()
      this.model.set('reverb_gain', e.value.newValue)
    },
    'change .clean_gain': function(e) {
      e.preventDefault()
      this.model.set('clean_gain', e.value.newValue)
    },
    'change .reverb_type': function(e) {
      e.preventDefault()
      this.model.set('reverb_type', parseInt(e.currentTarget.value))
    },

  },

  drawMeter: function() {
    var view = this
    view.meter_state.ctx.fillStyle = '#555';
    view.meter_state.ctx.fillRect(0, 0, view.meter_state.w, view.meter_state.h);
    view.meter_state.ctx.fillStyle = '#090';
    var half_height = Math.floor(view.meter_state.h / 2) - 1
    view.meter_state.ctx.fillRect(0, 0,                Math.floor(72 + view.meter_state.last_l), half_height);
    view.meter_state.ctx.fillRect(0, half_height + 2,  Math.floor(72 + view.meter_state.last_r), half_height);
    requestAnimationFrame(function() {
      view.drawMeter.call(view)
    })
  },

  onShow: function() {
    var view = this
    requestAnimationFrame(function() {
      var canvas = view.$('canvas#meter').get(0)
      view.meter_state = {
        ctx: canvas.getContext('2d'),
        w: canvas.width,
        h: canvas.height,
        last_l: -72,
        last_r: -72,
      }
      view.drawMeter.call(view)
    })

    this.listenTo(view.model, 'change:meter', function(l, r) {
      view.meter_state.last_l = l
      view.meter_state.last_r = r
    })

    this.listenTo(this.model, 'change:play', function(playing) {
      this.$('.play-btn').prop('disabled', !!playing)
      this.$('.stop-btn').prop('disabled', !!!playing)
    })

    this.$('.gain').slider({
      orientation: 'horizontal',
      value: -3,
      min: -60,
      max: 0,
      step: 1,
    })
    this.$('.distortion').slider({
      orientation: 'horizontal',
      value: 0,
      min: 0,
      max: 2000,
      step: 1,
    })
    
    this.$('.pan_x').slider({
      orientation: 'horizontal',
      value: 0,
      min: -1,
      max: 1,
      step: 0.001
    })

     this.$('.rate').slider({
      orientation: 'horizontal',
      value: 1,
      min: 0.1,
      max: 5,
      step: 0.1
    })

    this.$('.clean_gain').slider({
      orientation: 'horizontal',
      value: 0,
      min: -60,
      max: 0,
      step: 1
    })
    this.$('.reverb_gain').slider({
      orientation: 'horizontal',
      value: -60,
      min: -60,
      max: 0,
      step: 1
    })

  }
})

var GrainView = PlayerView.extend({
  template: '#grain-view-template',
  className: 'col-xs-4 player grainplayer',
  events: function() {
    return _.extend({}, PlayerView.prototype.events, {
      'change .grain-density': function(e) {
        e.preventDefault()
        this.model.set('density', e.value.newValue)
      },
      'change .grain-attack': function(e) {
        e.preventDefault()
        this.model.set('attack', e.value.newValue)
      },
      'change .grain-release': function(e) {
        e.preventDefault()
        this.model.set('release', e.value.newValue)
      },
      'change .grain-spread': function(e) {
        e.preventDefault()
        this.model.set('spread', e.value.newValue)
      },
      'change .grain-disperse': function(e) {
        e.preventDefault()
        this.model.set('disperse', e.value.newValue)
      },
    })
  },

  onShow: function() {
    PlayerView.prototype.onShow.call(this);
    this.$('.grain-density').slider({
      orientation: 'horizontal',
      value: this.model.get('density'),
      min: 1,
      max: 500,
      step: 1
    })
    this.$('.grain-attack').slider({
      orientation: 'horizontal',
      value: this.model.get('attack'),
      min: 1,
      max: 500,
      step: 1
    })
    this.$('.grain-release').slider({
      orientation: 'horizontal',
      value: this.model.get('release'),
      min: 1,
      max: 500,
      step: 1
    })
    this.$('.grain-spread').slider({
      orientation: 'horizontal',
      value: this.model.get('spread'),
      min: 1,
      max: 500,
      step: 1
    })
    this.$('.grain-disperse').slider({
      orientation: 'horizontal',
      value: this.model.get('disperse'),
      min: 1,
      max: 1000,
      step: 1
    })
  },
})


var PlayersView = Marionette.CompositeView.extend({
  template: '#players-view-template',
  childView: PlayerView,
  childViewContainer: ".player-container",

  events: {
    'click #start-trigger-btn': function(e) {
      e.preventDefault()
      var self = this
      var triggerfun = function() {
        var p = self.collection.models[Math.floor(Math.random() * self.collection.models.length)]
        p.play()
      }
      this.listenTo(this.collection, 'change:play', function(playing) {
        console.log("heppp", playing)
        if (!playing) {
          triggerfun()
        }
      })
      triggerfun()
    }
  }

})

var GrainsView = Marionette.CompositeView.extend({
  template: '#grains-view-template',
  childView: GrainView,
  childViewContainer: ".grain-container",
  events: {
  }
})


$(function() {

  var players = new Backbone.Collection()
  var grains = new Backbone.Collection()

  var playersview = new PlayersView({
    collection: players
  })

  var grainsview = new GrainsView({
    collection: grains
  })

  var app = new Marionette.Application();
  app.addRegions({
    playersRegion: "#running",
    grainsRegion: '#running-grains'
  });
  app.start()
  window.app = app

  app.playersRegion.show(playersview)
  app.grainsRegion.show(grainsview)

  // speech form handling
  $('#speech-frm button.player').on('click', function(e) {
    e.preventDefault()
    e.stopPropagation()
    var params = {
      speech: true,
      text: $('[name=text]').val(),
      pitch: $('[name=pitch]').val(),
      speed: $('[name=speed]').val(),
      voice: $('[name=voice]').val()
    }
    loadAndPlaySound(params)
  })
  $('#speech-frm button.grain').on('click', function(e) {
    e.preventDefault()
    e.stopPropagation()
    var params = {
      speech: true,
      text: $('[name=text]').val(),
      pitch: $('[name=pitch]').val(),
      speed: $('[name=speed]').val(),
      voice: $('[name=voice]').val()
    }
    loadAndPlayGrain(params)
  })

  // file input handling
  $('#file-frm button.player').on('click', function(e) {
    e.preventDefault()
    e.stopPropagation()
    var params = {
      file: $('[name=file]').val()
    }
    loadAndPlaySound(params)
  })
  $('#file-frm button.grain').on('click', function(e) {
    e.preventDefault()
    e.stopPropagation()
    var params = {
      file: $('[name=file]').val()
    }
    loadAndPlayGrain(params)
  })



  function loadAndPlaySound(params) {
    var player = new SamplePlayer({
      params: params,
      destination: context.destination,
    })
    addAndPreparePlayer(player)
  }
  function loadAndPlayGrain(params) {
    var player = new GrainPlayer({
      params: params,
      destination: context.destination,
    })
    addAndPrepareGrain(player)
  }

  function addAndPreparePlayer(player) {
    player.prepare(context)
    .then(function(player) {
      players.add(player)
    })
  }
  function addAndPrepareGrain(player) {
    player.prepare(context)
    .then(function(player) {
      grains.add(player)
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
  app.context = context

  //load impulse responses
  var loader = new audio.BufferLoader(context, [
    "sounds/impulse-response/auto_park.wav",
    "sounds/impulse-response/echo_plate.wav",
    "sounds/impulse-response/echo.wav",
    "sounds/impulse-response/muffler.wav",
    "sounds/impulse-response/spring.wav",
    "sounds/impulse-response/sudden_stop.wav",
    "sounds/impulse-response/telephone.wav",
  ], function(buffers) {
    app.impulseResponseBuffers = buffers
    console.log("loaded", buffers)
  });
  loader.load();
  fillSampleMenu()


  // get user inputs
  // if (typeof MediaStreamTrack === 'undefined' || typeof MediaStreamTrack.getSources === 'undefined') {
  //   console.log('This browser does not support MediaStreamTrack.\n\nTry Chrome.');
  // } else {
  //   MediaStreamTrack.getSources(gotSources);
  // }

  // function gotSources(sourceInfos) {
  //   var audioSelect = document.querySelector('select#audio-sources');
  //   for (var i = 0; i !== sourceInfos.length; ++i) {
  //     var sourceInfo = sourceInfos[i];
  //     var option = document.createElement('option');
  //     option.value = sourceInfo.id;
  //     if (sourceInfo.kind === 'audio') {
  //       option.text = sourceInfo.label || 'microphone ' + (audioSelect.length + 1);
  //       audioSelect.appendChild(option);
  //     } else {
  //       console.log('Some other kind of source: ', sourceInfo);
  //     }
  //   }
  // }

  function fillSampleMenu() {
    var sampleSelect = document.querySelector('select#sounds')
    $.getJSON( "/samples", function( data ) {
      _.each( data, function(samples, category) {
        var optgroup = document.createElement('optgroup')
        optgroup.label = category
        sampleSelect.appendChild(optgroup);
        _.each(samples, function(sample) {
          var option = document.createElement('option')
          option.value = category + "/" + sample
          option.text = sample
          optgroup.appendChild(option)
        })
      })
    })
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



