/* */ 
(function(process) {
  var request = require("request"),
      _ = require("underscore"),
      fs = require("fs");
  REPO = 'lorenwest/node-config';
  README_FILE = './README.md';
  _.templateSettings = {interpolate: /\{\{(.+?)\}\}/g};
  var TABLE_TEMPLATE = _.template('<table id="contributors">{{rows}}</table>');
  var ROW_TEMPLATE = _.template('<tr>{{people}}</tr>');
  var PERSON_TEMPLATE = _.template('<td><img src={{avatar_url}}><a href="{{html_url}}">{{login}}</a></td>');
  var PEOPLE_PER_ROW = 6;
  function getContributorTable(callback) {
    var options = {
      url: 'https://api.github.com/repos/' + REPO + '/contributors',
      headers: {'User-Agent': 'README.md contributor generator, github/lorenwest'}
    };
    request(options, function(error, response, body) {
      if (error) {
        console.error('Cannot load contributor list', error);
        process.exit(1);
      }
      var contributors;
      try {
        contributors = JSON.parse(body);
      } catch (e) {
        console.error('Error loading contribtor list: ' + body);
      }
      var rows = [];
      var row = [];
      for (var contributorNum in contributors) {
        var contributor = contributors[contributorNum];
        if (row.length === PEOPLE_PER_ROW) {
          rows.push(ROW_TEMPLATE({people: row.join('')}));
          row = [];
        }
        row.push(PERSON_TEMPLATE(contributor));
      }
      rows.push(ROW_TEMPLATE({people: row.join('')}));
      callback(null, TABLE_TEMPLATE({rows: rows.join('')}));
    });
  }
  ;
  getContributorTable(function(error, htmlTable) {
    if (error) {
      console.error('Not complete.  Exiting.');
      process.exit(1);
    }
    var fileLines = fs.readFileSync(README_FILE).toString().split('\n');
    for (var i in fileLines) {
      if (fileLines[i].indexOf('<table id="contributors"') === 0) {
        fileLines[i] = htmlTable;
        fs.writeFileSync(README_FILE, fileLines.join('\n'));
        console.log('Contributor table replaced.');
        process.exit(0);
      }
    }
    console.error('Error: No contributors table found to replace');
  });
})(require("process"));
