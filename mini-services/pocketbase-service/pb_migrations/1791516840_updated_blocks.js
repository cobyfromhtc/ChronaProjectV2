/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4194232374")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation1045292510",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "blockerId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": true,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation652622364",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "blockedId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4194232374")

  // remove field
  collection.fields.removeById("relation1045292510")

  // remove field
  collection.fields.removeById("relation652622364")

  return app.save(collection)
})
