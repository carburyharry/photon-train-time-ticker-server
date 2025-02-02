var request = require('superagent');
var xml2jsParser = require('superagent-xml2jsparser');
var _ = require('lodash');
var express = require('express');
var app = express();

var port = process.env.PORT || 8080;

var northbound = ['To Malahide','To Howth', 'To Dublin Connolly', 'To Dublin Pearse']
var southbound = ['To Greystones','To Bray', 'To Dublin Connolly', 'To Dublin Pearse', 'Grand Canal Dock']

app.get('/:station/:direction/:time', function (req, res) {
  getTrainTime(req.params.station, req.params.direction, req.params.time, function(err, result){
    if(err){
      res.status(500).send({ error: 'Something went wrong!' });
    } else {
      res.status(200).send(result);
    }
 });
});

var getTrainTime = function(station, direction, time, callback) {
  request.post("http://api.irishrail.ie/realtime/realtime.asmx/getStationDataByNameXML_withNumMins")
    .send('StationDesc=' + station)
    .send('NumMins=' + time)
    .accept('xml')
    .parse(xml2jsParser) // add the parser function
    .end(function(err, res){
      if (err || !res.ok) {
        callback(err);
      } else {
        var data = res.body.ArrayOfObjStationData.objStationData;
        var normalApi = false;
        if(_.includes(data[0].Direction, 'Northbound' || 'Southbound')) {
          normalApi = true;
        }
        if(normalApi) {
          var res = _.chain(data)
                  .filter({'Direction' : [direction]})
                  .transform(function(result, value, key){
                    result[key]= '\n' +value.Destination + ' - ' + value.Duein + ' mins'
                  }).value();
        } else {
          var res = _.chain(data)
                  .sortBy(res, 'Exparrival')
                  .transform(function(result, value, key){
                    if(_.isMatch(direction, 'Northbound')){
                      if(_.includes(northbound, value.Direction[0])){
                        result[key]= '\n' +value.Destination + ' - ' + value.Duein + ' mins'
                      }
                    }
                    else if (_.isMatch(direction, 'Southbound')) {
                      if(_.includes(southbound, value.Direction[0])){
                        result[key]= '\n' +value.Destination + ' - ' + value.Duein + ' mins'
                      }
                    }
                  }).value();
        }
        var resStr = getCurrentTime();
        if(res.length > 0){
          res.forEach(function(value) {
            resStr += value;
          });
        } else {
          resStr += '\n' + 'No data available'
        }
        console.log(resStr)
        callback(null, resStr);
      }
    });
}

function getCurrentTime() {
  var date = new Date();
  return time = ('0' + (date.getHours())).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
}

app.listen(port, function () {
  console.log('Listening on port ' + port);
});
