/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // add field
  collection.fields.addAt(40, new Field({
    "hidden": false,
    "id": "f_onboardedmv9cyvxc",
    "name": "onboarded",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(41, new Field({
    "hidden": false,
    "id": "f_onboardingCompletedAtmv9cyvxc",
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
    "hidden": false,
    "id": "f_preferredVariantmv9cyvxc",
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
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // remove field
  collection.fields.removeById("f_onboardedmv9cyvxc")

  // remove field
  collection.fields.removeById("f_onboardingCompletedAtmv9cyvxc")

  // remove field
  collection.fields.removeById("f_preferredVariantmv9cyvxc")

  return app.save(collection)
})
