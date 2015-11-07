module.exports = {
    paths: [
        {
            path: 'Modules/General/Routers',
            addins: [
                {
                    type: 'SubRouter',
                    order: 100,
                    routesPath: 'Modules/Admin/Routers'
                }
            ]
        }
    ]

};