var express = require('express');
var subdivision = require('subdivision');

var app = express();

subdivision.readManifestFilesSync(__dirname + '/modules/**/manifest.js');

subdivision.start().then(function () {
    subdivision.addBuilder({
        target: 'ExpressRoute', //This can be any string
        build: function (addin) {
            var route = addin.route || '/'; //default route of express
            app[addin.verb](route, addin.routeHandler);
        }
    });

    subdivision.build('Express/Routes');
    var server = app.listen(9000, function () {
        var host = server.address().address;
        var port = server.address().port;

        console.log('Example app listening at http://%s:%s', host, port);
    });
});