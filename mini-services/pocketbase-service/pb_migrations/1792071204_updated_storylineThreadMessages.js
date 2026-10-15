/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_304804294")

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "f_attachmentsmv9kxayu",
    "maxSize": 2000000,
    "name": "attachments",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_304804294")

  // remove field
  collection.fields.removeById("f_attachmentsmv9kxayu")

  return app.save(collection)
})
