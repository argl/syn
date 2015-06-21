/*jshint -W025 */

function(doc) {
  var docuri = require('views/lib/docuri');

docuri.route('camera_setting/:booth_name/:id', 'camera_setting');

  if (docuri.camera_setting(doc._id)) {
    emit(doc._id, null)
  }
}
