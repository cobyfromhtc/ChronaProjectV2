/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2005991442")

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
    "collectionId": "pbc_3502366346",
    "hidden": false,
    "id": "relation2764284122",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "messageId",
    "presentable": false,
    "required": true,
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
    "id": "text2001557894",
    "max": 0,
    "min": 0,
    "name": "createdById",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "bool4206062621",
    "name": "isArchived",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2005991442")

  // remove field
  collection.fields.removeById("relation2676332270")

  // remove field
  collection.fields.removeById("relation2764284122")

  // remove field
  collection.fields.removeById("text1579384326")

  // remove field
  collection.fields.removeById("text2001557894")

  // remove field
  collection.fields.removeById("bool4206062621")

  return app.save(collection)
})
