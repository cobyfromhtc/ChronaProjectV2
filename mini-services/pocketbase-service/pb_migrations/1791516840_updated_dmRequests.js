/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2412507505")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_1020016744",
    "hidden": false,
    "id": "relation4040589309",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "senderId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_1020016744",
    "hidden": false,
    "id": "relation3920141533",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "receiverId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1623671928",
    "max": 0,
    "min": 0,
    "name": "firstMessage",
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
    "id": "text2548032275",
    "max": 0,
    "min": 0,
    "name": "imageUrl",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2063623452",
    "max": 0,
    "min": 0,
    "name": "status",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2412507505")

  // remove field
  collection.fields.removeById("relation4040589309")

  // remove field
  collection.fields.removeById("relation3920141533")

  // remove field
  collection.fields.removeById("text1623671928")

  // remove field
  collection.fields.removeById("text2548032275")

  // remove field
  collection.fields.removeById("text2063623452")

  return app.save(collection)
})
