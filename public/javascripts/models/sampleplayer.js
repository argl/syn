define(['backbone', 'backbone.marionette', 'underscore', 'audio', 'q'], function(Backbone, Marionette, _, Audio, Q) {

  var app = window.app = window.app || {}

  var SamplePlayer = Backbone.Model.extend({

    initialize: function() {
      var params  = this.get('params')
      var url
      if (params.speech) {
        url = app.soundserver.url + "/speech_api?text="+encodeURIComponent(params.text)+"&pitch="+encodeURIComponent(params.pitch)+"&speed="+encodeURIComponent(params.speed)+"&voice="+encodeURIComponent(params.voice)+""
        this.set('speech', true)
        this.set('text', params.text)
        this.set('pitch', params.pitch)
        this.set('speed', params.speed)
        this.set('voice', params.voice)
      } else {
        url = app.soundserver.url + "/sounds/bank/" + encodeURIComponent(params.file)
        this.set('file', params.file)
      }
      this.set('url', url)

      this.set('gain', -3)
      this.set('distortion', 0)
      this.set('pan_x', 0)
      this.set('rate', 1)
      this.set('reverb_type', 0)
      this.set('clean_gain', 0)
      this.set('reverb_gain', -60)

      this.listenTo(this, 'change:pan_x', function() {
        this.panner.pan.value = this.get('pan_x')
      })

      this.listenTo(this, 'change:rate', function() {
        this.bufferSource.playbackRate.value = this.get('rate')
      })

      this.listenTo(this, 'change:distortion', function() {
        this.rewire()
      })

      this.listenTo(this, 'change:gain', function() {
        this.gain.gain.value = Math.pow(10, (this.get('gain')/10));
      })
      this.listenTo(this, 'change:clean_gain', function() {
        this.cleanGain.gain.value = Math.pow(10, (this.get('clean_gain')/10));
      })
      this.listenTo(this, 'change:reverb_gain', function() {
        this.reverbGain.gain.value = Math.pow(10, (this.get('reverb_gain')/10));
      })

      this.listenTo(this, 'change:reverb_type', function() {
        this.convolver.buffer = app.impulseResponseBuffers[this.get('reverb_type')];
      })
    },

    rewire: function() {
      this.bufferSource.disconnect()
      this.distortion.disconnect()
      this.gain.disconnect()
      this.panner.disconnect()
      this.convolver.disconnect()
      this.analyser.disconnect()

      if (this.get('distortion') > 0) {
        this.distortion.curve = this.makeDistortionCurve(this.get('distortion'))
        this.bufferSource.connect(this.distortion)
        this.distortion.connect(this.gain)
      } else {
        this.bufferSource.connect(this.gain)
      }
      this.gain.connect(this.panner)
      this.panner.connect(this.convolver)

      this.panner.connect(this.cleanGain)
      this.cleanGain.connect(this.get('destination'))

      this.convolver.connect(this.reverbGain)
      this.reverbGain.connect(this.get('destination'))

      this.cleanGain.connect(this.analyser)
      this.reverbGain.connect(this.analyser)
      this.analyser.connect(this.get('destination'))

    },

    stop: function() {
      if (this.bufferSource) {
        this.bufferSource.stop()
        this.trigger('change:play', false)
      }
    },

    prepare: function(context) {
      this.context = context
      var bufferLoader = new Audio.BufferLoader(context, [this.get('url')], _.bind(this.finishedLoading, this));
      this.deferred = Q.defer();
      bufferLoader.load();
      return this.deferred.promise
    },

    finishedLoading: function(bufferList) {
      var context = this.context
      var model = this
      this.bufferList = bufferList


      this.distortion = context.createWaveShaper()
      this.distortion.oversample = '4x';

      this.gain = context.createGain();
      this.gain.gain.value = Math.pow(10, (this.get('gain')/10));

      this.panner = context.createStereoPanner();

      this.analyser = context.createScriptProcessor(2048,2,2);
      this.analyser.onaudioprocess = function(e){
        var out_l = e.outputBuffer.getChannelData(0);
        var out_r = e.outputBuffer.getChannelData(1);
        var in_l = e.inputBuffer.getChannelData(0);
        var in_r = e.inputBuffer.getChannelData(1);
        var max_l = 0, max_r = 0;
        max_l = Math.max.apply(null, in_l)
        max_r = Math.max.apply(null, in_r)
        max_l = 20*Math.log(Math.max(max_l,Math.pow(10,-72/20)))/Math.LN10;
        max_r = 20*Math.log(Math.max(max_r,Math.pow(10,-72/20)))/Math.LN10;
        model.trigger('change:meter', max_l, max_r)
      }

      this.convolver = context.createConvolver();
      this.convolver.buffer = app.impulseResponseBuffers[this.get('reverb_type')];

      this.cleanGain = context.createGain();
      this.cleanGain.gain.value = Math.pow(10, (this.get('clean_gain')/10));
      this.reverbGain = context.createGain();
      this.reverbGain.gain.value = Math.pow(10, (this.get('reverb_gain')/10));

      //this.rewire()
      
      //this.bufferSource.start(0)
      this.deferred.resolve(this)
    },

    play: function() {
      var context = this.context
      if (this.bufferSource) {
        this.bufferSource.stop()
      }
      this.bufferSource = context.createBufferSource()
      this.bufferSource.buffer = this.bufferList[0]
      this.bufferSource.playbackRate.value = this.get('rate')
      this.bufferSource.loop = false
      this.bufferSource.onended = _.bind(function() {
        this.trigger('change:play', false)
      }, this)
      this.rewire()
      this.bufferSource.start(0)
      this.trigger('change:play', true)

    },

    makeDistortionCurve: function(amount) {
      var k = typeof amount === 'number' ? amount : 50
      var n_samples = 44100
      var curve = new Float32Array(n_samples)
      var deg = Math.PI / 180
      var i = 0
      var x

      for ( ; i < n_samples; ++i ) {
        x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
      }
      return curve;
    }


  })
  return SamplePlayer;

});
