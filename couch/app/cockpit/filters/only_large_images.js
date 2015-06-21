function(doc, req) {
  var matches = doc._id.match(/images\/\d+\/original$/)
  if (matches) {
    return true
  }
  return false
}
