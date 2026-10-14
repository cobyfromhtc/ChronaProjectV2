/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2605467279")

  // add field
  collection.fields.addAt(7, new Field({
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
  collection.fields.addAt(8, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2605467279",
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
  const collection = app.findCollectionByNameOrId("pbc_2605467279")

  // remove field
  collection.fields.removeById("date1549119089")

  // remove field
  collection.fields.removeById("relation2873854323")

  return app.save(collection)
})
