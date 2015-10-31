module.exports = {
    paths: [
        {
            path: 'Express/Routes',
            addins: [
                {
                    type: 'ExpressRoute', //this should be same as the builder that is going to read this addin
                    order: 100, //This can be any number or can be omitted if you don't care about the order
                    route: '/admin/log',
                    verb: 'get',
                    routeHandler: function (req, res) {
                        res.send('Got the log');
                    }
                },
                {
                    id: 'postAdminLog',
                    order: 100,
                    type: 'ExpressRoute',
                    route: '/admin/log',
                    verb: 'post',
                    routeHandler: function (req, res) {
                        res.send('Posted something to the log');
                    }
                }
            ]
        }
    ]

};