define(['backbone', 'backbone.marionette', 'underscore', 'audio', 'q', 'sampleplayer'], function(Backbone, Marionette, _, Audio, Q, SamplePlayer) {


  var GrainPlayer = SamplePlayer.extend({

    initialize: function() {
      console.log('grain player initlaizing')
      this.set('panning', 0.9)
      this.set('density', 0.01)
      this.set('attack', 0.2)
      this.set('release', 0.2)
      this.set('spread', 0.1)
      this.set('disperse', 0.01)
      this.playing = false
      SamplePlayer.prototype.initialize.apply(this, arguments);
    },

    finishedLoading: function(bufferList) {

      SamplePlayer.prototype.finishedLoading.apply(this, arguments);

      this.mixnode = this.context.createGain()
      this.mixnode.gain.value = 1.0
    },

    rewire: function() {
      this.mixnode.disconnect()
      this.distortion.disconnect()
      this.gain.disconnect()
      this.panner.disconnect()
      this.convolver.disconnect()
      this.analyser.disconnect()

      if (this.get('distortion') > 0) {
        this.distortion.curve = this.makeDistortionCurve(this.get('distortion'))
        this.mixnode.connect(this.distortion)
        this.distortion.connect(this.gain)
      } else {
        this.mixnode.connect(this.gain)
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


    grain: function(positionx){

      var grain ={}

      grain.now = this.context.currentTime; //update the time value
      //create the source
      grain.source = this.context.createBufferSource();
      grain.source.playbackRate.value = grain.source.playbackRate.value * this.get('rate') + ((Math.random() * this.get('disperse')) - (this.get('disperse') / 2));
      grain.source.buffer = this.bufferList[0]
      //create the gain for enveloping
      grain.gain = this.context.createGain();
      
      //experimenting with adding a panner node - not all the grains will be panned for better performance
      var yes = 0
      if( yes === 1){
        grain.panner = this.context.createPanner();
        grain.panner.panningModel = "equalpower";
        grain.panner.distanceModel = "linear";
        grain.panner.setPosition(p.random(this.get("panning") * -1,this.get('panning')),0,0);
        //connections
        grain.source.connect(grain.panner);
        grain.panner.connect(grain.gain);
      }else{
        grain.source.connect(grain.gain);
      }
      
      
      grain.gain.connect(this.mixnode);
      
      //update the position and calcuate the offset
      grain.positionx = positionx;
      grain.offset = grain.positionx * grain.source.buffer.duration
      
      //update and calculate the amplitude
      //grain.positiony = positiony;
      grain.amp = 1; //grain.positiony / h;
      //grain.amp = p.map(this.amp,0.0,1.0,1.0,0.0) * 0.7;
      
      //parameters
      grain.attack = this.get('attack');
      grain.release =  this.get('release');
      
      if(grain.release < 0){
        grain.release = 0.1; // 0 - release causes mute for some reason
      }
      grain.spread = this.get('spread'); //spread;

      grain.randomoffset = (Math.random() * grain.spread) - (grain.spread / 2); //in seconds
      ///envelope

      grain.source.start(grain.now, Math.max(0.001, grain.offset + grain.randomoffset), grain.attack + grain.release); //parameters (when,offset,duration)
      grain.gain.gain.setValueAtTime(0.0, grain.now);
      grain.gain.gain.linearRampToValueAtTime(grain.amp,grain.now + grain.attack);
      grain.gain.gain.linearRampToValueAtTime(0,grain.now + (grain.attack +  grain.release) );
      
      //garbage collection
      grain.source.stop(grain.now + grain.attack + grain.release + 0.1); 
      var tms = (grain.attack + grain.release) * 1000; //calculate the time in miliseconds
      setTimeout(function(){
        grain.gain.disconnect();
        if(yes === 1){
          grain.panner.disconnect();
        }
      },tms + 200);
    },


    play: function() {
      // var context = this.context
      // if (this.bufferSource) {
      //   this.bufferSource.stop()
      // }
      // this.bufferSource = context.createBufferSource()
      // this.bufferSource.buffer = this.bufferList[0]
      // this.bufferSource.playbackRate.value = this.get('rate')
      // this.bufferSource.loop = false
      // this.bufferSource.onended = _.bind(function() {
      //   this.trigger('change:play', false)
      // }, this)
      this.rewire()
      this.playing = true
      this.trigger('change:play', true)

      // this.bufferSource.start(0)
      // this.trigger('change:play', true)
      this.playGrain()
      //push to the array
      // that.grains[that.graincount] = g;
      // that.graincount+=1;
          
      // if(that.graincount > 20){
      //   that.graincount = 0;
      // }
      //next interval
      //this.interval = (this.get('density') * 500) + 70;
      //this.timeout = setTimeout(this.play, this.interval);


    },


    stop: function() {
      this.playing = false
      this.trigger('change:play', false)
    },

    playGrain: function() {
      this.grain(0.5);
      this.interval = (this.get('density') * 500) + 70;
      if (this.playing) {
        this.timeout = setTimeout(_.bind(this.playGrain, this), this.interval);
      }
    },

    xmakeDistortionCurve: function(amount) {
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
  return GrainPlayer;

});
