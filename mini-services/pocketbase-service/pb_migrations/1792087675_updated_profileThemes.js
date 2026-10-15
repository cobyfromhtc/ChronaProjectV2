/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2251717079")

  // add field
  collection.fields.addAt(15, new Field({
    "hidden": false,
    "id": "bool_isPublic_r13",
    "name": "isPublic",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2251717079")

  // remove field
  collection.fields.removeById("bool_isPublic_r13")

  return app.save(collection)
})
