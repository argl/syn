define(['backbone', 'backbone.marionette', 'underscore', 'audio', 'q'], function(Backbone, Marionette, _, Audio, Q) {

  var SamplePlayer = Backbone.Model.extend({

    initialize: function() {
      var params  = this.get('params')
      var url = "/speech_api?text="+encodeURIComponent(params.text)+"&pitch="+encodeURIComponent(params.pitch)+"&speed="+encodeURIComponent(params.speed)+"&voice="+encodeURIComponent(params.voice)+""
      this.set('url', url)

      this.set('text', params.text)
      this.set('pitch', params.pitch)
      this.set('speed', params.speed)
      this.set('voice', params.voice)
      this.set('gain', -3)

      this.set('distort', this.get('distort') || false)
      this.set('distortion_curve', this.get('distortion_curve') || 10)
      this.listenTo(this, 'change:distortion_curve', function() {
        this.distortion.curve = this.makeDistortionCurve(this.get('distortion_curve'));
      })
      this.listenTo(this, 'change:distort', function() {
        this.rewire()
      })
      this.listenTo(this, 'change:gain', function() {
        this.gain.gain.value = Math.pow(10, (this.get('gain')/10));
      })
    },

    rewire: function() {
      this.bufferSource.disconnect()
      this.distortion.disconnect()
      if (this.get('distort')) {
        this.bufferSource.connect(this.distortion)
        this.distortion.connect(this.gain)
      } else {
        this.bufferSource.connect(this.gain)
      }
      this.gain.connect(this.get('destination'))
    },

    stop: function() {
      this.bufferSource.stop()
      this.bufferSource.disconnect()
      this.distortion.disconnect()
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
      this.bufferSource = context.createBufferSource();
      this.bufferSource.buffer = bufferList[0];
      this.bufferSource.loop = true

      this.distortion = context.createWaveShaper()
      this.distortion.curve = this.makeDistortionCurve(this.get('distortion_curve'));
      this.distortion.oversample = '4x';

      this.gain = context.createGain();
      this.gain.gain.value = Math.pow(10, (this.get('gain')/10));

      this.rewire()
      
      this.bufferSource.start(0)
      this.set('playing', true)
      this.deferred.resolve(this)
    },

    makeDistortionCurve: function(amount) {
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
    }


  })
  return SamplePlayer;

});
