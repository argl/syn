define(['backbone', 'backbone.marionette'], function(Backbone, Marionette) {

  var Camera = Backbone.Model.extend({
    url: '/camera_settings'
  })
  
  return Camera;
});
