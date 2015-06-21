/*jshint -W025 */

function(doc) {
  var docuri = require('views/lib/docuri');

  docuri.route('armed_code/:booth_id', 'armed_code');

  if (docuri.armed_code(doc._id)) {
    emit("armed_code", doc.code)
  }
}
