/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4031511185")

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
    "collectionId": "pbc_1020016744",
    "hidden": false,
    "id": "relation2584369023",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "personaId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number2392944706",
    "max": null,
    "min": null,
    "name": "amount",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "date730627375",
    "max": "",
    "min": "",
    "name": "expiresAt",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4031511185")

  // remove field
  collection.fields.removeById("relation4063227767")

  // remove field
  collection.fields.removeById("relation2584369023")

  // remove field
  collection.fields.removeById("number2392944706")

  // remove field
  collection.fields.removeById("date730627375")

  return app.save(collection)
})
