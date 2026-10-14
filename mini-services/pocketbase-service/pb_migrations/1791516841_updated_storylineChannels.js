/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4174848682")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_2050596915",
    "hidden": false,
    "id": "relation4063227767",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "storylineId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1205916230",
    "hidden": false,
    "id": "relation2620853105",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "categoryId",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1579384326",
    "max": 0,
    "min": 0,
    "name": "name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2363381545",
    "max": 0,
    "min": 0,
    "name": "type",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number1177347317",
    "max": null,
    "min": null,
    "name": "position",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number2936527186",
    "max": null,
    "min": null,
    "name": "slowMode",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2638274075",
    "max": 0,
    "min": 0,
    "name": "topic",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "bool3939682449",
    "name": "locked",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4174848682")

  // remove field
  collection.fields.removeById("relation4063227767")

  // remove field
  collection.fields.removeById("relation2620853105")

  // remove field
  collection.fields.removeById("text1579384326")

  // remove field
  collection.fields.removeById("text2363381545")

  // remove field
  collection.fields.removeById("number1177347317")

  // remove field
  collection.fields.removeById("number2936527186")

  // remove field
  collection.fields.removeById("text2638274075")

  // remove field
  collection.fields.removeById("bool3939682449")

  return app.save(collection)
})
