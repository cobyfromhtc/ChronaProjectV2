/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_304804294")

  // remove field
  collection.fields.removeById("text4040589309")

  // add field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_1020016744",
    "hidden": false,
    "id": "f_senderId_rel",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "senderId",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_304804294")

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text4040589309",
    "max": 0,
    "min": 0,
    "name": "senderId",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("f_senderId_rel")

  return app.save(collection)
})
