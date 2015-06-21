define(['backbone', 'backbone.marionette'], function(Backbone, Marionette) {
  var Shooting = Backbone.Model.extend({
    url: '/shooting'
  })
  return Shooting;
});
