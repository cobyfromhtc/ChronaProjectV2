/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_585217319")

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
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1689669068",
    "max": 0,
    "min": 0,
    "name": "userId",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "date996872734",
    "max": "",
    "min": "",
    "name": "lastReadAt",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "bool52532114",
    "name": "hasUnread",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_585217319")

  // remove field
  collection.fields.removeById("relation2676332270")

  // remove field
  collection.fields.removeById("text1689669068")

  // remove field
  collection.fields.removeById("date996872734")

  // remove field
  collection.fields.removeById("bool52532114")

  return app.save(collection)
})
