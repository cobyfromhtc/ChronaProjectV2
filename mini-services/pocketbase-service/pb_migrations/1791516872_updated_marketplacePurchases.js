/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_530420665")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_1441732300",
    "hidden": false,
    "id": "relation584985120",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "marketplacePersonaId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": true,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation511800956",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "buyerId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number1169888883",
    "max": null,
    "min": null,
    "name": "pricePaid",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number1417407003",
    "max": null,
    "min": null,
    "name": "creatorEarnings",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1454072509",
    "max": 0,
    "min": 0,
    "name": "copiedPersonaId",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_530420665")

  // remove field
  collection.fields.removeById("relation584985120")

  // remove field
  collection.fields.removeById("relation511800956")

  // remove field
  collection.fields.removeById("number1169888883")

  // remove field
  collection.fields.removeById("number1417407003")

  // remove field
  collection.fields.removeById("text1454072509")

  return app.save(collection)
})
