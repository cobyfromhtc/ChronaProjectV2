/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_530420665")

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number1169888883",
    "max": null,
    "min": null,
    "name": "pricePaid",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number1417407003",
    "max": null,
    "min": null,
    "name": "creatorEarnings",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_530420665")

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number1169888883",
    "max": null,
    "min": null,
    "name": "pricePaid",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number1417407003",
    "max": null,
    "min": null,
    "name": "creatorEarnings",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
