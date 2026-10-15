/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_663736766")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "ad_created_pinnedMe",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "ad_updated_pinnedMe",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_663736766")

  // remove field
  collection.fields.removeById("ad_created_pinnedMe")

  // remove field
  collection.fields.removeById("ad_updated_pinnedMe")

  return app.save(collection)
})
