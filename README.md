Organizing your Express application with Subdivision
======

I have recently read an enlightening [blog post](http://derickbailey.com/2015/10/19/clean-up-node-app-initialization-w-nanit/) by Derick Bailey
 where he talks about cleaning up your initialization code with a library he developed called [_nanit_](https://github.com/derickbailey/nanit).
 After reading the post I thought about the general problem of arranging a Node.js application in a modular and decoupled way and then I 
 realized that my library [_Subdivision_](https://github.com/BorisKozo/subdivision) can be the perfect solution for this problem.
 At the time, Subdivision was not a node module but after couple of hours of tweaking it, I made it work in node and published it
 as a node module. This repository shows a very simple example on how you might arrange your express route handlers into decoupled modules
 instead of just adding everything to the ````app.js```` file. I will explain the basic concepts of Subdivision using the code examples
 from this repository but you may want to read the full documentation in the Subdivision repository.
 
## Routing in the app.js file
 In a small Express based application, routing can be done directly within the ````app.js```` file. As the application grows
 we want to separate it into decoupled modules, each performing its function autonomously without mixing code with the other
 modules. We assume that the project structure has a ````modules```` directory which contains a directory for every module.
 In this example we have two modules: ````admin```` and ````users```` so our structure looks roughly like this

````

|---modules
|   |---admin
|   |     |- <files of the admin module and maybe more subdirectories>
|   |---users
|   |     |- <files of the users module and maybe more subdirectories>
|--- app.js
 
````

In one of my previous applications I created a _routes loader_. The routes loader searches the subdirectories within the ````modules````
directory and looks for files named ````routes.js````. When such a file is found, the loader ````require```` it
and pass the Express ````app```` as an argument (assuming ````routes.js```` exports a function that takes the 
Express ````app```` as an argument and registers all the routes of that module into it. Subdivision allows us to use its _registry_
 to reverse the roles of the loader and the routes provider (in a specific module). If you are unsure what is this registry 
 then here is the short explanation. The registry is a tree like structure of nodes. Each node holds a set of addins which are
 just regular JavaScript objects with a fancy name. Each node within the tree can be reached via a registry _path_ (a concatenation of
 all the node names from the root of the tree to the requested node). If trees is something you want to see in a park and not in your code
 then you can think of a registry path as a unique place where you can store objects with the same meaning.
 
 
 In this example we use the path "Express/Routes" to store our addins. Each path is a sort of contract between the path consumer,
   in our case ````app.js```` file and the providers, in our case the various modules. The consumer defines this contract via a _Builder_.
   A builder takes an addin and transforms it in some way to make it compatible with the consumer. We define our builder as follows
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
   It can be any string (we will see where it is used later, when we define our addins). 
   The builder must have a build function which takes the addin as the argument and does something with it. 
   This is also where the contract comes into play. In our example we expect each addin built with this builder 
   to have an optional ````route```` property that we use as the Express route, 
   the ````verb````, and the handler for this route as a function named ````routeHandler```` which will 
   be passed to the Express ````app````. Note that since we define our builder directly in the ````app.js```` file 
   we do not send the ````app```` variable to various other required files as in the aforementioned solution.
   
   Now all that remains is to load all the addins from the modules. To do this we use the ````readManifestFilesSync```` function
   which takes glob arguments and tries to load all the found files as manifests (more on manifests in the next section).
   In our example we assume that each module exposes its manifest in a file named ````manifest.js```` (it can be any name but I like this convention).
   The code to load the manifests is therefore:
   
   ```js
     subdivision.readManifestFilesSync(__dirname + '/modules/**/manifest.js');
   ```
   
   Once all the manifests are loaded and subdivision was started (see the documentation) we can build the path. Building the path simply
   runs all the builders which are required to build the addins within this path. In our example we have only one builder which adds each
   addin to the Express ````app````.
    
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
   
   Now that the consumer is ready it is time to provide it with some routes. Subdivision defines a concept called manifest.
   The manifest is yet another fancy name for an object with a specific structure that can be read by the manifest reader and 
   automatically fill the registry. In our example the manifest of the admin module looks like this:
   
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

Basically it is just an array of paths. Each path object contains the actual path and an array of addins to add to that path.
With this structure you can add addins to multiple path with the same manifest. Each addin is a simple JavaScript object that
conforms to the contract represented by the path. In this example we define that each addin on the "Express/Routes" path contains
 the route, verb, and routeHandler. To allow our addins be built by the builder defined in the ````app.js```` file, we must
 specify its type as the target of the builder. The id and order fields are used by the registry. Each addin within a path
  must have a unique id within that path (two different paths may contain addins with identical ids). The ids allow us to use
  the advanced ordering features of the registry (see section about sorting in the library documentation). To understand 
  ordering lets look at the manifest of the users module.
  
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

This manifest contains three addins but this time we have middleware that works on all the routes of our application. 
The ordering applies to all the addins within the "Express/Routes" path. This allows us to define the "verifyUser" addin
with order 0 which makes it the first addin to be built. Next we define the "doSomethingWithUser" addin but the fact that 
it comes right after the "verifyUser" addin in the manifest does not guarantee its position in the build process. We specify
its order as "right after" (> symbol) the addin with id "verifyUser". When the path is built in ````app.js````, the ordering 
algorithm makes sure that the actual order is as specified by the ````order```` property of all the addins in the built path.
The third addin in the manifest uses the "somewhere after" (>> symbol) to specify that it must be after the addin with id "doSomethingWithUser"
but not necessarily right after it.
  