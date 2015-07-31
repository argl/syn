define(['backbone', 'backbone.marionette', 'underscore', 'audio', 'q'], function(Backbone, Marionette, _, Audio, Q) {

  var SamplePlayer = Backbone.Model.extend({

    initialize: function() {
      var params  = this.get('params')
      var url
      if (params.speech) {
        url = "/speech_api?text="+encodeURIComponent(params.text)+"&pitch="+encodeURIComponent(params.pitch)+"&speed="+encodeURIComponent(params.speed)+"&voice="+encodeURIComponent(params.voice)+""
        this.set('speech', true)
        this.set('text', params.text)
        this.set('pitch', params.pitch)
        this.set('speed', params.speed)
        this.set('voice', params.voice)
      } else {
        url = "/sounds/test/" + encodeURIComponent(params.file)
        this.set('file', params.file)
      }
      this.set('url', url)

      this.set('gain', -3)
      this.set('distortion', 0)
      this.set('pan_x', 0)
      this.set('pan_y', 5)
      this.set('pitch', 1.0)

      // this.set('distort', this.get('distort') || false)
      // this.listenTo(this, 'change:distortion_curve', function() {
      //   this.distortion.curve = this.makeDistortionCurve(this.get('distortion_curve'));
      // })
      this.listenTo(this, 'change:pan_x', function() {
        this.panner.setPosition(this.get('pan_x'), this.get('pan_y'), 0);
      })
      this.listenTo(this, 'change:pan_y', function() {
        this.panner.setPosition(this.get('pan_x'), this.get('pan_y'), 0);
      })

      this.listenTo(this, 'change:pitch', function() {
        this.panner.setPosition(this.get('pan_x'), this.get('pan_y'), 0);
      })

      this.listenTo(this, 'change:distortion', function() {
        this.rewire()
      })
      this.listenTo(this, 'change:gain', function() {
        this.gain.gain.value = Math.pow(10, (this.get('gain')/10));
      })
    },

    rewire: function() {
      this.bufferSource.disconnect()
      this.distortion.disconnect()
      if (this.get('distortion') > 0) {
        this.distortion.curve = this.makeDistortionCurve(this.get('distortion'))
        this.bufferSource.connect(this.distortion)
        this.distortion.connect(this.gain)
      } else {
        this.bufferSource.connect(this.gain)
      }
      this.gain.connect(this.panner)
      this.panner.connect(this.get('destination'))
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
      //this.distortion.curve = this.makeDistortionCurve(10);
      this.distortion.oversample = '4x';

      this.gain = context.createGain();
      this.gain.gain.value = Math.pow(10, (this.get('gain')/10));

      this.panner = context.createPanner();
      this.panner.panningModel = 'HRTF';
      this.panner.distanceModel = 'inverse';
      this.panner.refDistance = 1;
      this.panner.maxDistance = 10000;
      this.panner.rolloffFactor = 1;
      this.panner.coneInnerAngle = 180;
      this.panner.coneOuterAngle = 45;
      this.panner.coneOuterGain = 0.001;
      this.panner.setOrientation(0,-1,0);
      this.panner.setPosition(this.get('pan_x'), 0, this.get('pan_y'));

      window.panner = this.panner

      this.rewire()
      
      this.bufferSource.start(0)
      this.set('playing', true)
      this.deferred.resolve(this)
    },

    makeDistortionCurve: function(amount) {
      var k = typeof amount === 'number' ? amount : 50
      var n_samples = 44100
      var curve = new Float32Array(n_samples)
      var deg = Math.PI / 180
      var i = 0
      var x
      console.log(k)

      for ( ; i < n_samples; ++i ) {
        x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
      }
      return curve;
    }


  })
  return SamplePlayer;

});
