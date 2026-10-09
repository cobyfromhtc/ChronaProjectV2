/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4123533339")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_2050596915",
    "hidden": false,
    "id": "relation4063227767",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "storylineId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3502366346",
    "hidden": false,
    "id": "relation2764284122",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "messageId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3459875360",
    "max": 0,
    "min": 0,
    "name": "pinnedById",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4123533339")

  // remove field
  collection.fields.removeById("relation4063227767")

  // remove field
  collection.fields.removeById("relation2764284122")

  // remove field
  collection.fields.removeById("text3459875360")

  return app.save(collection)
})
