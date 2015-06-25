import {app_bootstrap} from './app_bootstrap'
app_bootstrap();
import audio from './audio'



$(function() {
  $('#speech-frm').on('submit', function(e) {
    e.preventDefault()
    var params = {
      text: $('[name=text]').val(),
      pitch: $('[name=pitch]').val(),
      speed: $('[name=speed]').val(),
      voice: $('[name=voice]').val()
    }
    console.log(params)
    var url = "/speech_api?text="+encodeURIComponent(params.text)+"&pitch="+encodeURIComponent(params.pitch)+"&speed="+encodeURIComponent(params.speed)+"&voice="+encodeURIComponent(params.voice)+""
    console.log(url)
    loadAndPlaySound(url)
  })

  $('#file-frm').on('submit', function(e) {
    e.preventDefault()
    var params = {
      file: $('[name=file]').val()
    }
    console.log(params)
    var url = "/sounds/test/" + encodeURIComponent(params.file)
    loadAndPlaySound(url)
  })

  function loadAndPlaySound(url) {
    var bufferLoader = new audio.BufferLoader(context, [url], finishedLoading);
    bufferLoader.load();
  }

  function finishedLoading(bufferList) {
    var convolver = new audio.RoomEffectsSample(context, function(err, efx) {
      var source1 = context.createBufferSource();
      var state = {}
      source1.buffer = bufferList[0];
      // if ( $('[name=efx]').is(":checked")) {
      //   source1.connect(efx.convolver);
      //   efx.convolver.connect(context.destination);
      //   state.efx = true
      // } else {
      //   source1.connect(context.destination)
      //   state.efx = false
      // }
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

  // Create the source.
  var source = context.createBufferSource();
  // Create the gain node.
  var gain = context.createGain();
  // Connect source to filter, filter to destination.
  source.connect(gain);
  gain.connect(context.destination);




});



