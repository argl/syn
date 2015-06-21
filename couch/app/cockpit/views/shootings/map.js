/*jshint -W025 */

function(doc) {
  var docuri = require('views/lib/docuri');

docuri.route('shooting/:booth_name/:id', 'shooting');
docuri.route('shooting/:booth_name/:id/images/:image_id/:version', 'shooting_image');
docuri.route('camera_setting/:booth_name/:id', 'camera_setting');

  if (docuri.shooting(doc._id) || docuri.shooting_image(doc._id)) {
    emit(doc._id, null)
  }
}
