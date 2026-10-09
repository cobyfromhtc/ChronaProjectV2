/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1441732300")

  // add field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "autodate_created",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": true,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "autodate_updated",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": true,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1441732300")

  // remove field
  collection.fields.removeById("autodate_created")

  // remove field
  collection.fields.removeById("autodate_updated")

  return app.save(collection)
})
