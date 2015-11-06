Organizing your Express application with Subdivision
======

I have recently read an enlightening [blog post](http://derickbailey.com/2015/10/19/clean-up-node-app-initialization-w-nanit/) by Derick Bailey
 where he talks about cleaning up your initialization code with a node module he developed called [_nanit_](https://github.com/derickbailey/nanit).
 After reading the post I thought about the general problem of arranging code in a Node.js application such that the end result is
 modular and the modules decoupled. I realized that my library [_Subdivision_](https://github.com/BorisKozo/subdivision) can be the
 perfect solution for this task. At the time, Subdivision was not a node module but a library for developing large scale browser applications.
 It took only a couple of hours of tweaking to make it work with node and so I published it as a node module.
 This repository shows a very simple example of arranging express route handlers into decoupled modules instead of
 just adding everything to the ````app.js```` file. This readme explains the basic concepts of Subdivision using the code examples
 from this repository but you should read the full documentation in the Subdivision repository (not required to continue).

 *In the following text I refer to "modules" as independent parts of an application and not node modules.

## Routing in the app.js file
 In a small Express based application, routing can be done directly within the ````app.js```` file. As the application grows
 we want to separate the registration of our route handlers into decoupled modules, each performing its function autonomously
 without mixing code with the other modules. We assume that the project structure has a ````modules```` directory which contains
 a directory for every module of the application. In this example we have two modules: ````admin```` and ````users```` so our
 structure looks roughly like this:

````

|---modules
|   |---admin
|   |     |- <files of the admin module and maybe more subdirectories>
|   |---users
|   |     |- <files of the users module and maybe more subdirectories>
|--- app.js
 
````

In one of my older applications I created a _routes loader_. The routes loader searches the subdirectories within the ````modules````
directory and looks for files named ````routes.js````. When such a file is found, the loader ````require```` it
and passes the Express ````app```` as an argument (assuming ````routes.js```` exports a function that takes the
Express ````app```` as an argument) and registers all the routes of that module into it.

Subdivision allows us to use its _registry_ to reverse the roles of the loader and the routes provider (in a specific module).
If you are unsure what this "registry" is all about then here is the short explanation (otherwise skip to the next paragraph).
The registry is a tree like structure of nodes. Each node holds a set of _addins_ which are just regular JavaScript objects
with a fancy name. Each node within the tree has a name can be reached via a registry _path_ (a concatenation of
all the node names from the root of the tree to the requested node). If trees is something you want to see in a park
and not in your code then you can think of a registry path as a unique place where you can store objects with the same meaning.
 
 
In this example we use the path "Express/Routes" to store our addins. Each path is somewhat like a contract between the path consumer,
in our case ````app.js```` file, and the providers of addins for the path, in our case the various modules. The consumer defines this
contract via a _builder_. Each builder takes an addin and transforms it in some way to make it compatible with the consumer.
We define the builder for our addins that represent express routes as follows:

   ```js
       subdivision.addBuilder({
           target: 'ExpressRoute', //This can be any string
           build: function (addin) {
               var route = addin.route || '/'; //default route of express
               app[addin.verb](route, addin.routeHandler);
           }
       });
   ```
   
   The target of the builder is the type of addin the builder "knows" how to build.  
   It can be any string (we use this type later in the article, when we define our addins).
   The builder must have a ````build```` function which takes the addin as the argument.
   This is the place where the contract comes into play. In our example we expect each addin built with this builder
   to have an optional ````route```` property that we use as the Express route (defaults to the empty route),
   the ````verb````, and the Express handler for this route as a function named ````routeHandler````. This function is
   passed to the Express ````app```` by the builder. Note that since we define our builder directly in the ````app.js```` file
   we do not send the ````app```` variable to various other required files as in the aforementioned solution.
   
   Now all that remains is to load all the addins from the two modules. To do this we use the ````readManifestFilesSync```` function
   which takes glob arguments and tries to load all the found files as manifests (more on manifests in the next section).
   In our example we assume that each module exposes its manifest in a file named ````manifest.js```` (it can be any name but
   I like this convention). The code to load the manifests is therefore:
   
   ```js
     subdivision.readManifestFilesSync(__dirname + '/modules/**/manifest.js');
   ```
   
   Once all the manifests are loaded and subdivision is started via the ````start```` function (see the documentation) we can build the path.
   Building the path simply runs all the builders which are required to build the addins within this path. It can be more than one builder but
   to keep things simple we use only one in this example. In our example the builder adds each addin to the Express ````app```` by using the
   ````verb```` defined on that addin.
    
   The final code for our ````app.js```` is


 ```js
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
 ```

## Providing the routes    
   
   Now that the consumer of our addins is ready it is time to provide it with the actual addins that represent the routes.
   Subdivision defines a concept called _manifest_. The manifest is yet another fancy name for an object with a specific
   structure that can be read by the manifest reader and automatically fill the registry.
   In our example the manifest of the admin module looks like this:
   
```js
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
```

Basically it is just an array of paths within the registry. Each object in the paths array contains the actual path and an
array of addins to add to that path. With this structure you can add addins to multiple paths with the same manifest.
Each addin is a simple JavaScript object that conforms to the contract represented by the builder that is going to build the addin.
In this example we define that each addin on the "Express/Routes" path should have the type "ExpressRoute" and contain
 the route, verb, and routeHandler. To allow our addins be built by the builder defined in the ````app.js```` file, we must
 specify its type to be the same as the target of the builder. The id and order fields are used by the registry.
 Each addin added to a path must have a unique id within that path (two different paths may contain addins with identical ids).
 The ids allow us to use the advanced ordering features of the registry (see section about sorting in the library documentation).
 To better understand how ordering works lets look at the manifest of the "users" module.
  
```js
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
```

This manifest contains three addins, one of the addins is a middleware that works on all the routes of our application
and therefore should come first. The ordering mechanism applies to all the addins within the "Express/Routes" path regardless
of which manifest/function added them to the registry. We define the "verifyUser" addin with order 0 which makes it the first
addin to be built (again, a convention here, you can use any number as "first"). Next we define the "doSomethingWithUser" addin
but the fact that it comes right after the "verifyUser" addin in the manifest does not guarantee its position in the build process.
To make sure it comes after the "verifyUser" addin we specify its order as "right after" (> symbol) the addin with id "verifyUser".
When the path is built in ````app.js```` using the ````build(path)```` function, the ordering algorithm makes sure that the actual
order is as specified by the ````order```` property of all the addins in the built path. The third addin in the manifest uses the
"somewhere after" (>> symbol) to specify that it must be after the addin with id "doSomethingWithUser" but not necessarily right after it.
These ordering capabilities give us full control over the order in which middleware is run without coupling its definition to
a specific place or module.

## Conclusion
Subdivision allows a simple modularization of any application and specifically Express application. We see that the manifests,
ordering capability, and the flexibility of builders are the basic concepts to avoid unnecessary dependencies in the code.
Subdivision contains other useful concepts such as extensible services, commands, and conditions which make development of
common application building blocks easier than ever.

I hope you like this example. Feel free to leave comments (in the issues section) and contribute both to the example
and the library.

Boris.