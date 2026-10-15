/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3282730007")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "ad_created_messageB",
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
    "id": "ad_updated_messageB",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3282730007")

  // remove field
  collection.fields.removeById("ad_created_messageB")

  // remove field
  collection.fields.removeById("ad_updated_messageB")

  return app.save(collection)
})
