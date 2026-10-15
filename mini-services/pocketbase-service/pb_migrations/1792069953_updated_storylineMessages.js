/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3502366346")

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "f_attachmentsmv9k6hp3",
    "maxSize": 2000000,
    "name": "attachments",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3502366346")

  // remove field
  collection.fields.removeById("f_attachmentsmv9k6hp3")

  return app.save(collection)
})
