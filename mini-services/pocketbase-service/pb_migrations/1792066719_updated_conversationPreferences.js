/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1286664760")

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "ad_created_conversa",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "ad_updated_conversa",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1286664760")

  // remove field
  collection.fields.removeById("ad_created_conversa")

  // remove field
  collection.fields.removeById("ad_updated_conversa")

  return app.save(collection)
})
