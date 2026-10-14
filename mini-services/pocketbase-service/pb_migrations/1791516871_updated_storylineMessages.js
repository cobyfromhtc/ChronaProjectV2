/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3502366346")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_4174848682",
    "hidden": false,
    "id": "relation2676332270",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "channelId",
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
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text4274335913",
    "max": 0,
    "min": 0,
    "name": "content",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
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
    "hidden": false,
    "id": "date1549119089",
    "max": "",
    "min": "",
    "name": "editedAt",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3502366346",
    "hidden": false,
    "id": "relation2873854323",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "replyToId",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3502366346")

  // remove field
  collection.fields.removeById("relation2676332270")

  // remove field
  collection.fields.removeById("relation4040589309")

  // remove field
  collection.fields.removeById("text4274335913")

  // remove field
  collection.fields.removeById("text2548032275")

  // remove field
  collection.fields.removeById("date1549119089")

  // remove field
  collection.fields.removeById("relation2873854323")

  return app.save(collection)
})
