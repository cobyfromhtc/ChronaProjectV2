/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549")

  // add field
  collection.fields.addAt(21, new Field({
    "hidden": false,
    "id": "f_allowTrendingmv9cyvye",
    "name": "allowTrending",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(22, new Field({
    "hidden": false,
    "id": "f_trendingOptInAtmv9cyvye",
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
  collection.fields.removeById("f_allowTrendingmv9cyvye")

  // remove field
  collection.fields.removeById("f_trendingOptInAtmv9cyvye")

  return app.save(collection)
})
