define(['backbone', 'backbone.marionette', 'underscore', 'audio', 'q', 'sampleplayer'], function(Backbone, Marionette, _, Audio, Q, SamplePlayer) {


  var GrainPlayer = SamplePlayer.extend({

    initialize: function() {
      console.log('grain player initlaizing')
      this.set('panning', 0.9)
      this.set('density', 50)
      this.set('attack', 35)
      this.set('release', 35)
      this.set('spread', 100)
      this.set('disperse', 10)
      this.playing = false
      SamplePlayer.prototype.initialize.apply(this, arguments);
    },

    finishedLoading: function(bufferList) {
      var player = this
      SamplePlayer.prototype.finishedLoading.apply(this, arguments);

      this.mixnode = this.context.createGain()
      this.mixnode.gain.value = 1.0


      // lfo for riding the sample up and down:
      // create a low-freq oscialltor. connect it to a script node which 
      // gets the current value for us and writes it to an instance variable
      // ... which we can use to calculate a proper offset.
      // wish us luck!
      this.lfonode = this.context.createOscillator()
      this.lfonode.type = 'triangle';
      this.lfonode.frequency.value = 0.2;
      this.lfonode.start();

      this.lfopeek = this.context.createScriptProcessor(1024,1,1);
      this.lfovalue = 0;

      this.lfopeek.onaudioprocess = function(e){
        var o = e.outputBuffer.getChannelData(0);
        var i = e.inputBuffer.getChannelData(0);
        player.lfovalue = i[0]*0.5 + 0.5; // range of 0..1
      }

      this.lfonode.connect(this.lfopeek)
      this.lfopeek.connect(this.get('destination'))
        

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
      var disperse = this.get('disperse') / 1000.0;
      grain.source.playbackRate.value = grain.source.playbackRate.value * this.get('rate') + ((Math.random() * disperse) - (disperse / 2));
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
      grain.attack = this.get('attack') / 1000.0;
      grain.release =  this.get('release') / 1000.0;
      
      if(grain.release < 0.0001){
        grain.release = 0.01; // 0 - release causes mute for some reason
      }
      grain.spread = this.get('spread') / 1000 //spre 

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
      this.rewire()
      this.playing = true
      this.trigger('change:play', true)
      this.playGrain()
    },


    stop: function() {
      this.playing = false
      this.trigger('change:play', false)
    },

    playGrain: function() {
      this.grain(this.lfovalue);
      // this.interval = (this.get('density') * 500) + 70;
      this.interval = this.get('density');
      if (this.playing) {
        this.timeout = setTimeout(_.bind(this.playGrain, this), this.interval);
      }
    },


  })
  return GrainPlayer;

});
