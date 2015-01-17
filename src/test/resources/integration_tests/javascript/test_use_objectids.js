/*
 * Copyright 2011-2012 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var container = require("vertx/container");
var vertx = require("vertx")
var vertxTests = require("vertx_tests");
var vassert = require("vertx_assert");

var eb = vertx.eventBus;

var isFake = false;

var persistorConfig =
{
  address: 'test.persistor',
  db_name: java.lang.System.getProperty("vertx.mongo.database", "test_db"),
  host: java.lang.System.getProperty("vertx.mongo.host", "localhost"),
  port: java.lang.Integer.valueOf(java.lang.System.getProperty("vertx.mongo.port", "27017")),
  fake: isFake,
  use_objectids: true,
  use_mongo_types: true
}

var username = java.lang.System.getProperty("vertx.mongo.username");
var password = java.lang.System.getProperty("vertx.mongo.password");
if (username != null) {
  persistorConfig.username = username;
  persistorConfig.password = password;
}

var script = this;
container.deployModule(java.lang.System.getProperty('vertx.modulename'), persistorConfig, 1, function(err, deployID) {
  if (err != null) {
    err.printStackTrace();
  } else {
    eb.send('test.persistor', {
      collection: 'testcoll',
      action: 'delete',
      matcher: {}
    }, function(reply) {
      vassert.assertEquals('ok', reply.status);
      vertxTests.startTests(script);
    });
  }
});

function testSaveWithObjectId() {
  eb.send('test.persistor', {
    collection: 'testcoll',
    action: 'save',
    document: {
      name: 'josephine',
      age: 32,
      pi: 3.14159,
      male: false,
      cheeses: ['mozzarella', 'ricotta']
    }
  }, function(reply) {
    vassert.assertEquals('ok', reply.status);
    var id = reply._id;
    vassert.assertTrue(id != undefined);
    vassert.assertTrue(id.$oid != undefined);
    vassert.assertTrue(typeof id.$oid === "string")

    // Now update it
    eb.send('test.persistor', {
      collection: 'testcoll',
      action: 'save',
      document: {
        _id: id,
        name: 'josephine',
        age: 1000
      }
    }, function(reply) {
      vassert.assertEquals('ok', reply.status);

      eb.send('test.persistor', {
        collection: 'testcoll',
        action: 'findone',
        document: {
          _id: id
        }
      }, function(reply) {
        vassert.assertEquals('ok', reply.status);
        vassert.assertEquals('josephine', reply.result.name);
        vassert.assertEquals(1000, reply.result.age, 0);

        // Do an update with a different WriteConcern
        eb.send('test.persistor', {
          collection: 'testcoll',
          action: 'save',
          writeConcern: "SAFE",
          document: {
            _id: id,
            name: 'fox',
            age: 21
          }
        }, function(reply) {
          vassert.assertEquals('ok', reply.status);
          eb.send('test.persistor', {
            collection: 'testcoll',
            action: 'findone',
            document: {
              _id: id
            }
          }, function(reply) {
            vassert.assertEquals('ok', reply.status);
            vassert.assertEquals('fox', reply.result.name);
            vassert.assertEquals(21, reply.result.age, 0);
            vassert.testComplete();
          });

        });
      });
    });
  });
}
