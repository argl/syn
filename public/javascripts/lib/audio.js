// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
  window.webkitRequestAnimationFrame || 
  window.mozRequestAnimationFrame    || 
  window.oRequestAnimationFrame      || 
  window.msRequestAnimationFrame     || 
  function( callback ){
  window.setTimeout(callback, 1000 / 60);
  };
})();


function createContext() {
  var contextClass = (window.AudioContext ||
    window.webkitAudioContext ||
    window.mozAudioContext ||
    window.oAudioContext ||
    window.msAudioContext)
  return new contextClass();
}

function playSound(context, buffer, time, loop) {
  var source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.loop = !!loop
  source.start(time);
}

function loadSounds(obj, soundMap) {
  // Array-ify
  var names = [];
  var paths = [];
  for (var name in soundMap) {
    var path = soundMap[name];
    names.push(name);
    paths.push(path);
  }
  bufferLoader = new BufferLoader(context, paths, function(bufferList) {
    for (var i = 0; i < bufferList.length; i++) {
      var buffer = bufferList[i];
      var name = names[i];
      obj[name] = buffer;
    }
  });
  bufferLoader.load();
}

function BufferLoader(context, urlList, callback) {
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferList = new Array();
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {
  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function(buffer) {
        if (!buffer) {
          alert('error decoding file data: ' + url);
          return;
        }
        loader.bufferList[index] = buffer;
        if (++loader.loadCount == loader.urlList.length)
          loader.onload(loader.bufferList);
      },
      function(error) {
        console.error('decodeAudioData error', error);
      }
    );
  }

  request.onerror = function() {
    alert('BufferLoader: XHR error');
  }

  request.send();
};

BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i)
  this.loadBuffer(this.urlList[i], i);
};


function RoomEffectsSample(context, cb) {
  var ctx = this;

  this.impulseResponses = [];
  this.buffer = null;

  // Load all of the needed impulse responses and the actual sample.
  var loader = new BufferLoader(context, [
    "sounds/impulse-response/auto_park.wav",
    "sounds/impulse-response/echo_plate.wav",
    "sounds/impulse-response/echo.wav",
    "sounds/impulse-response/muffler.wav",
    "sounds/impulse-response/spring.wav",
    "sounds/impulse-response/sudden_stop.wav",
    "sounds/impulse-response/telephone.wav",

  ], onLoaded);

  function onLoaded(buffers) {
    ctx.impulseResponses = buffers;
    ctx.impulseResponseBuffer = ctx.impulseResponses[0];
    ctx.convolver = context.createConvolver();
    ctx.convolver.buffer = ctx.impulseResponseBuffer;
    cb(null, ctx)
  }
  loader.load();
}

RoomEffectsSample.prototype.setImpulseResponse = function(index) {
  this.impulseResponseBuffer = this.impulseResponses[index];
  // Change the impulse response buffer.
  this.convolver.buffer = this.impulseResponseBuffer;
};






module.exports = {
  createContext: createContext,
  playSound: playSound,
  loadSounds: loadSounds,
  BufferLoader: BufferLoader,
  RoomEffectsSample: RoomEffectsSample
}
