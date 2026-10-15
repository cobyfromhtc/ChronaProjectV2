/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_227054934")

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
    "collectionId": "pbc_2874780778",
    "hidden": false,
    "id": "relation3099786632",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "roleId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool3172157305",
    "name": "canView",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "bool3835549242",
    "name": "canSend",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_227054934")

  // remove field
  collection.fields.removeById("relation2676332270")

  // remove field
  collection.fields.removeById("relation3099786632")

  // remove field
  collection.fields.removeById("bool3172157305")

  // remove field
  collection.fields.removeById("bool3835549242")

  return app.save(collection)
})
