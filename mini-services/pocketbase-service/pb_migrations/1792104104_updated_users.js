/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // remove field
  collection.fields.removeById("f_onboardedmva323i4")

  // remove field
  collection.fields.removeById("f_onboardingCompletedAtmva323i4")

  // remove field
  collection.fields.removeById("f_preferredVariantmva323i4")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // add field
  collection.fields.addAt(40, new Field({
    "help": "",
    "hidden": false,
    "id": "f_onboardedmva323i4",
    "name": "onboarded",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(41, new Field({
    "help": "",
    "hidden": false,
    "id": "f_onboardingCompletedAtmva323i4",
    "max": "",
    "min": "",
    "name": "onboardingCompletedAt",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(42, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "f_preferredVariantmva323i4",
    "max": 0,
    "min": 0,
    "name": "preferredVariant",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
