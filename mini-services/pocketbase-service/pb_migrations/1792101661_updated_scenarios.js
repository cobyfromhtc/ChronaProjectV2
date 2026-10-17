/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549")

  // add field
  collection.fields.addAt(21, new Field({
    "help": "",
    "hidden": false,
    "id": "f_allowTrendingmva323jm",
    "name": "allowTrending",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(22, new Field({
    "help": "",
    "hidden": false,
    "id": "f_trendingOptInAtmva323jm",
    "max": "",
    "min": "",
    "name": "trendingOptInAt",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549")

  // remove field
  collection.fields.removeById("f_allowTrendingmva323jm")

  // remove field
  collection.fields.removeById("f_trendingOptInAtmva323jm")

  return app.save(collection)
})
