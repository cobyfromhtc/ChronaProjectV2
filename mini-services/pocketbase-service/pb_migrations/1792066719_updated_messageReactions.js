/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2198586084")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "ad_created_messageR",
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
    "id": "ad_updated_messageR",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2198586084")

  // remove field
  collection.fields.removeById("ad_created_messageR")

  // remove field
  collection.fields.removeById("ad_updated_messageR")

  return app.save(collection)
})
