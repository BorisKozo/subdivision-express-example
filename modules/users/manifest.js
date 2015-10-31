module.exports = {
    paths: [
        {
            path: 'Express/Routes',
            addins: [
                {
                    id: 'verifyUser',
                    type: 'ExpressRoute', //this should be same as the builder that is going to read this addin
                    order: 0, //This can be any number or can be omitted if you don't care about the order
                    verb: 'use',
                    routeHandler: function (req, res, next) {
                        console.log('Verified User');
                        next();
                    }
                },
                {
                    id: 'doSomethingWithUser',
                    order: '>verifyUser',
                    type: 'ExpressRoute',
                    verb: 'use',
                    routeHandler: function (req, res, next) {
                        console.log('did something with user');
                        next();
                    }
                },
                {
                    type: 'ExpressRoute', //this should be same as the builder that is going to read this addin
                    order: '>>doSomethingWithUser', //This can be any number or can be omitted if you don't care about the order
                    route: '/user',
                    verb: 'get',
                    routeHandler: function (req, res) {
                        res.send('User info');
                    }
                }
            ]
        }
    ]
};
