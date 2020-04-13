---
path: /real-world-unit-testing-nodejs
date: 2020-04-13T12:04:17.164Z
title: Real World Unit Testing with NodeJS
description: >-
  A look at unit testing a MongoDB Aggregation Query using NodeJS, Mocha and
  Chai
---
When I first got a job as a JavaScript Developer (which was not too long ago), all I had was some self-taught coding knowledge gathered from around the internet/books as well as the bits and pieces of JavaScript that I used during my previous job as a WordPress developer. My studies helped me get a general understanding of JavaScript but it had not prepared me for many of the everyday developer tasks with which I was now faced. For example, the first task I was given was to develop a test suite for some MongoDB aggregation queries to ensure that they yielded the correct results. I knew some mongo (thankfully), but I had done zero software testing. Testing, as it turns out, is ridiculously important when writing code and I literally have to write tests with every new piece of code I produce! 

It is my hope that this article (and this blog in general) gives its readers a closer look at how to apply generalized JavaScript knowledge to something more akin to the everyday things that a developer has to do on the job. Also, since I've come to realize how important testing your code is, I think that's a great place to start so without further ado, here is the scenario on what we're going to build together.

#### The Project

We'll be working with a fictitious membership site called Max Fitness. This website uses a freemium business model in which some of its fitness content is available for free while the rest is behind a pay-wall. It uses NodeJS on the server and stores data using MongoDB.

We're tasked to create unit tests for the validation of one of this website's MongoDB queries. A partial view of our website's directory structure is shown below and will be used as a reference when we import various files in our code:

``` 
src
│
│
└───queries
│   │   getActiveSubscribers.json
│   
│
└───tests
    |
    |
    └───unit
    |    |
    |    |
    |    └───queries
    |        | getActiveSubscribers.js
    |   
    | db.js
    | helper.js
    | test-setup.js
```

The database collections that we'll be querying are the _member_ and _subscription_ collections and a sample of the documents stored in each are shown below

**Member Document**

``` 
{
    "_id": "HUYR12Qi9PLqa",
    "firstName": "Bob",
    "lastName": "Williams",
    "email": "bobwilliams@gmail.com",
    "phone": "(800)-123-4321",
    "gender": "male",
    "active": true,
    "address": [
        {
            "type": "home",
            "text" : "534 Erewhon St PleasantVille, Rainbow, Vic  3999",
            "line" : [
                "534 Erewhon St"
            ],
            "city" : "PleasantVille",
            "district" : "Rainbow",
            "state" : "Vic",
            "postalCode" : "3999"
        },
        {
            "type": "work",
            "text" : "500 Erewhon St PleasantVille, Rainbow, Vic  3999",
            "line" : [
                "534 Erewhon St"
            ],
            "city" : "PleasantVille",
            "district" : "Rainbow",
            "state" : "Vic",
            "postalCode" : "3999"
        }
    ]
}
```

**Subscription Document**

``` 
{
    "_id": "HJDYET61WihQW",
    "active": true,
    "startDate": "03/21/2019"
    "endDate": "03/21/2020"
    "member": {
        "reference": "HUYR12Qi9PLqa"
    }
}
```

To make it easier to follow along with the specific tasks I'm about to outline below, I've created this [repo](https://github.com/imanuelgittens/max-fitness-test-suite) which contains a `start` and a `complete` branch. I encourage you to clone it and begin working from the `start` branch to get a better feel of writing the code yourself.

_TODOS_

* ensure MongoDB is installed and running
* create test setup and helper files ( `db.js` , `helper.js` and `test-setup.js` )
* create a unit test for our query

##### Prerequisites

Before we begin, I'd just like to mention that this project assumes that you already know JavaScript and are familiar with concepts like `async/await` , Git, as well as a bit of NodeJS. If you see a concept that you aren't sure about and can't find a great explanation online, feel free to create an issue on the repo and I'll be happy to explain.

* Ensure you have `NodeJS` and `npm` installed on your machine
* Ensure you've cloned this [repo](https://github.com/imanuelgittens/max-fitness-test-suite) and are on the `start` branch
* from the root directory of the repo run `npm install` . This command installs MongoDb, Mocha and Chai from NPM. MongoDB is the NodeJS driver for interacting with the database, Chai is an assertion library and Mocha is our testing framework.

### Getting started

We'll need to have the following things covered before we write any code: 

**MongoDB**
Please follow the instructions at this [link](https://docs.mongodb.com/manual/installation/) based on your operating system. You'll want to ensure that MongoDB is up and running in the background before we get started with actually writing the code to test our queries.

**Queries**
We'll be testing one query:

* `getActiveSubscribers` looks for all members whose `active` property has a value of `true` that also have a subscription with an `active` property set to `true` 

This query uses MongoDB's aggregation framework and while we won't go into the details of MongoDB Aggregation queries, you can just assume that it works for the purpose of this article. If you'd like more information on MongoDB aggregation queries, they have some great documentation [here](https://docs.mongodb.com/manual/aggregation/) and their [University](https://university.mongodb.com/) has some awesome learning materials as well.

### Our Approach

At a high level, the idea for these tests will be to insert various combinations of `member` and `subscription` documents into our database then run the query against those documents. Since we know what our queries are supposed to return, we can enter combinations of valid and invalid documents and assert that they return the correct result for valid data and no result for invalid data.

### Setup for Testing

**Creating our Database Connection Function**

Working from the `start` branch of our repo, the first thing we'll need to do is create a folder called `test` and in that folder, we create a file called `db.js` and start with the following lines of code.

``` js
const {
    MongoClient
} = require('mongodb');
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/maxfitness';
const clientCache = {};
```

Here we're requiring the `MongoClient` object from the `MongoDB` package and setting up the url we'll be using the connect to our database. Notice the pattern used for the defined the url - first we check whether we have an environment variable called DB_URL and if that exists we use it; if not, we use our local connections string. It's done this way because you may have a situation where you want to test this code on a staging server on the internet where the database URL isn't something you'd want to have hardcoded for malicious eyes to potentially see. In that case, the code will use the url that you've defined in your server's environment variables.

Lastly, we've defined a `clientCache` variable for reasons which will become apparent in a bit.

Now that we've done the initial setup, let's write the function to be used for connecting to our Mongo database.

``` js
async function createClient(url, options) {
    const cacheKey = url;

    // old url parser is deprecated
    // unifiedTopology now required by MongoDB driver
    const connectionOpts = {
        ...options,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    };

    if (clientCache[cacheKey]) {
        return clientCache[cacheKey];
    }
    const client = await MongoClient.connect(url, connectionOpts);
    const db = client.db();
    clientCache[cacheKey] = {
        client,
        db
    };
    return {
        client,
        db
    };
}
```

Above we've written the `createClient` function which accepts a url and some options. We then set the `cacheKey` to equal the url and create a connectionOptions variable that will include everything from the `options` object that we passed to the function as well as the `useNewUrlParser: true` and `useUnifiedTopology: true` which are necessary for newer versions of Mongo. Notice that this function returns the mongoClientCache if it has already been defined. This is a nice optimization and is the reason why we defined our `clientCache` variable above. What happens here, is that we'll connect and get a reference to our database once and from there on we can just use the cached version of that connection and db.

If we've got nothing in the clientCache object, we define our client using the `MongoClient.connect` function and passing in our database url and connection options. We then store a reference to the db using the `db()` method of our connection. We then create an object containing the client and db references and set it equal to the the clientCache. We then return an object with our client and db references.

The last thing we do in this file is export our createClient function and dbUrl.

``` js
module.exports = {
    dbUrl,
    createClient
}
```

Now that we have a function that can be used for connecting to the database let's do just that.

**Connecting to the database**

Create a file in the test folder called `test-setup.js` and let's explore the following code: 

``` js
const {
    createClient,
    dbUrl
} = require('./db');

let client;

before(async () => {
    ({
        client
    } = await createClient(dbUrl));
});

after(() => {
    client.close();
});
```

We import the `createClient` function and `dbUrl` that were just created and define a `client` variable. We then create a function called `before` which is specific to Mocha, and which runs the function passed to it before all tests are executed. We pass an anonymous function that assigns our `client` variable defined above the the result of the `createClient` function.

**Note**: the code pattern used here is called [destructuring assignment](https://javascript.info/destructuring-assignment) and is used to assign a variable to the destructured result of a function when both the variable and result have the same name.

This means that before any of our tests run, we have access to `client` .

Next we have our `after` function. As you may have guessed, any functions passed to this `after` function will be executed after our tests are run. Here we simply close the mongo connection using the `client` variable that we assigned in our `before` function.

Before we move forward, we'd just like to ensure everything is working as expected so ever so often, be sure to open up the terminal and run `npm run test` .

**Helper Functions**

So far, we're able to connect to our database and we've configured our `before` and `after` functions to fun before and after our tests. What we need now are a two helper functions -

* a function to insert stuff into the database
* a function to remove stuff from the database

Why? As mentioned in _Our Approach_ above, we'll need to add stuff to the database to test against and then we'll remove it when the tests are all done. Let's get started by taking a look at the function to insert stuff into the database. Create a file in the `test` directory called `helper.js` and add the following code.

``` js
async function insertResource(db, collectionName, resource) {
    if (Array.isArray(resource)) {
        await db.collection(collectionName).insertMany(resource);
    } else {
        await db.collection(collectionName).insertOne(resource);
    }
}
```

Here we define a function that takes the database, the name of the collection to insert into, and the resource that we'd like to add to that collection. Mongo allows us to add an entire array of documents at once so we do a check to see if the `resource` variable passed in is an array and if it is, we use the `insertMany` method on the collection and if not, we use `insertOne` method. Now we can use this function in our tests to insert documents to query and validate against.

Next we must create a method to remove things from the database. In this case, the way we do that is fairly straightforward - we just drop the entire collection. For testing we want a clean slate every time we run the tests to ensure we don't get things like duplicate ID errors. We do this with the following function

``` js
async function dropResourceCollections(db, collections) {
    for (const collection of collections) {
        await db.dropCollection(collection);
    }
}
```

This function accepts the database and an array of collections. We then iterate over the array of collections and drop each one. Note the use of the `for-of` loop. This loop must be used for asynchronous tasks as it waits for the task to be complete before moving on. A regular `for` or `forEach` loop will not work here.

Lastly, we need a function that will run the queries and give us a result. MongoDb has a powerful query feature called the aggregation framework that we're making use of here so we're going to create a function that gives us the result of those aggregation queries.

``` js
async function aggregate(db, collectionName, pipeline) {
    return await db.collection(collectionName).aggregate(pipeline).toArray();
}
```

We then export these functions for use in our tests 

``` js
module.exports = {
    insertResource,
    dropResourceCollections,
    aggregate,
};
```

And with that, we've done all the groundwork and can now we can start writing the tests themselves and see how this all comes together!

### Writing the Tests

Now that we've set things up, it's time to write some tests. Create a folder called `unit` and in that folder create another called `queries` . It is done this way because we are writing unit tests and we create the `queries` folder to match the structure found in our `src` directory. The rule of thumb is to follow the directory structure and naming of whatever you're testing as it exists in your codebase.

Following that sentiment, let create the file for testing our first - `getActiveSubscribers.js` 

``` js
const {
    expect
} = require('chai');
const {
    aggregate,
    insertResource,
    dropResourceCollections,
} = require('../../helper');
const {
    dbUrl,
    createClient
} = require('../../db');
```

We start by importing the necessary modules and our helper functions created earlier. Let's now write our initial `describe` function.

The Mocha testing framework allows us to write a series of `describe` and `it` functions to identify what is being tested and what is the expected result. Let start writing the test and everything will become a lot clearer as we go.

First we get a reference to the query that we want to test

``` js
const getActiveSubscribers = require('../../../src/queries/getActiveSubscribers.json');
```

Then we can start adding our first `describe` function. Now the way in which these are written are a personal preference so while I share the way that I write them below, you should write them in a way that makes logical sense to you.

``` js
describe("Query for finding all active subscribers", () => {});
```

What we're saying here is that all the tests written in this `describe` function relates to the active subscribers query. Next we define a variable for our database and write a second (inner) describe function.

``` js
describe("Query for finding all active subscribers", () => {
    let db = null;
    describe("When a member is not active, the query", () => {})
})
```

So now we're getting a little more into the expected behavior of our query - we're saying that when a member is not active and we run this query, something (which we haven't defined as yet) should happen.

Here is where things get interesting as we can now enter values in the database before we run the queries then test that the query returns the correct result for those values. Let's take a look at how this is done.

Hint - we use our handy helper functions

``` js
describe("Query for finding all active subscribers", () => {
    let db = null
    describe("When a member is not active, the query", () => {
        before(async () => {
            ({
                db
            } = await createClient(dbUrl));
            const member = {
                _id: 'HUYR12Qi9PLqa',
                firstName: 'Bob',
                lastName: 'Williams',
                email: 'bobwilliams@gmail.com',
                phone: '(800)-123-4321',
                gender: 'male',
                active: false,
            };
            await insertResource(db, 'member', member);
        });
    })
})
```

So inside our inner `describe` function we add a `before` function. As seen in our `test-setup.js` file, anything in a `before` function runs before everything else in that function's scope. So here we're saying that before we doing anything in this inner describe function, let's insert a `member` document into our database. Notice this member's `active` property is set to false which is in keeping with the text in our `describe` function.

Note: We expect that the query should not return a result if the member is inactive.

We can test this using the following code which makes use of the `it` function mentioned briefly above, as well as the `expect` functionality of the `chai` assertion library.

``` js
it('should return an empty result', async () => {
    const result = await aggregate(db, 'member', getActiveSubscribers);
    expect(result).to.be.empty;
});
```

This test uses our aggregate function to get the result of the `getActiveSubscribers` query imported above. We then use `expect` to assert that the result is empty. Notice how the description in our `describe` and `it` functions help them to read like natural language.

``` 
Query for finding all active subscribers
  When a member is not active, the query
    should return an empty result
```

That's my approach to writing all tests so that they read as closely as possible to what a person would say when speaking.

There is one more thing we need to do before we can wrap up this test - we need to remove the data from the database. If we don't remove the stuff we added, then the next time we run the test, we'll get a duplicate ID error so to remove stuff from the database after our tests are run, we use the `after` function

``` js
after(async () => {
    await dropResourceCollections(db, ['member']);
});
```

and drop the entire collection. Ww can run `npm run test` to see the results. All should be passing so far.

**Entire Code**

``` js
const {
    expect
} = require('chai');
const {
    aggregate,
    insertResource,
    dropResourceCollections,
} = require('../../helper');
const {
    dbUrl,
    createClient
} = require('../../db');

// query
const getActiveSubscribers = require('../../../src/queries/getActiveSubscribers.json');

describe('Query for finding all active subscribers', () => {
    let db = null;
    describe('When a member is not active, the query', () => {
        before(async () => {
            ({
                db
            } = await createClient(dbUrl));
            const member = {
                _id: 'HUYR12Qi9PLqa',
                firstName: 'Bob',
                lastName: 'Williams',
                email: 'bobwilliams@gmail.com',
                phone: '(800)-123-4321',
                gender: 'male',
                active: false,
            };
            await insertResource(db, 'member', member);
        });

        after(async () => {
            await dropResourceCollections(db, ['member']);
        });

        it('should return an empty result', async () => {
            const result = await aggregate(db, 'member', getActiveSubscribers);
            expect(result).to.be.empty;
        });
    });
});
```

Before we finish up, I'd just like to showcase the code for the positive case where the member is active and has as active subscription. After the first inner `describe` function, we add this second inner `describe` .

``` js
describe('When a member is active', () => {
    before(async () => {
        const member = {
            _id: 'HUYR12Qi9PLqa',
            firstName: 'Bob',
            lastName: 'Williams',
            email: 'bobwilliams@gmail.com',
            phone: '(800)-123-4321',
            gender: 'male',
            active: true,
        };

        await insertResource(db, 'member', member);
    });

    after(async () => {
        await dropResourceCollections(db, ['member']);
    });

    describe('and they have an active subscription', () => {
        before(async () => {
            const subscription = {
                _id: 'HJDYET61WihQW',
                active: true,
                startDate: '03/21/2019',
                endDate: '03/21/2020',
                member: {
                    reference: 'HUYR12Qi9PLqa',
                },
            };
            await insertResource(db, 'subscription', subscription);
        });

        after(async () => {
            await dropResourceCollections(db, ['subscription']);
        });
        it('the query should return the ID of that member', async () => {
            const result = await aggregate(db, 'member', getActiveSubscribers);
            expect(result).to.eql([{
                _id: 'HUYR12Qi9PLqa'
            }]);
        });
    });
});
```

Notice how we insert the necessary documents into the database in its matching `describe` function i.e.when we describe the member, we insert the member documents in a `before` function and remove all the documents in an `after` function. We do the same when describing subscriptions. As opposed to the previous test, our `it` function expects the query to return a result because we inserted an active member who has an active subscription.

Run `npm run test` and that should give a passing result as well.

### Conclusion

Hopefully you now have a better understanding of how software testing is done using a real-world example. The same concept can be applied to testing much of your code. If you expect that the code should return some result, you just need to follow the pattern defined here - 

1. Setup the tests
2. Run your functions and store the result
3. Assert that the result is what you expect

A final note is that testing can be quite complicated at times so this is just an introduction to the topic, Hit me up on twitter if you're interested in going deeper on the topic. Once the interest is there, I'll do another article.

