var express = require('express');
var subdivision = require('subdivision');

var app = express();

subdivision.readManifestFilesSync(__dirname + '/modules/**/manifest.js');

subdivision.start().then(function () {
    subdivision.addBuilder({
        target: 'SubRouter',
        build: function (addin) {
            var router = express.Router();
            var addins = subdivision.getAddins(addin.routesPath);
            addins.forEach(function (innerAddin) {
                var route = innerAddin.route || '/';
                if (innerAddin.type === 'ExpressRoute') {
                    router[innerAddin.verb](innerAddin.route, innerAddin.routeHandler);
                } else {
                    router.use(innerAddin.route, subdivision.getBuilder(innerAddin.type).build(innerAddin)); //I will add a function for this, this is silly
                }

            });
            return router;
        }
    });

    subdivision.build('Modules/General/Routers').forEach(function (router) {
        app.use('/foo', router);
    });
    //var rr = express.Router();
    //rr.get('/bar', function (req, res) {
    //    res.send('Foobar!');
    //});
    //app.use('/bar', rr);
    var server = app.listen(9000, function () {
        var host = server.address().address;
        var port = server.address().port;

        console.log('Example app listening at http://%s:%s', host, port);
    });
});