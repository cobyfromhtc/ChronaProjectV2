/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1286664760")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX idx_conv_pref_user_conv ON conversationPreferences (userId, conversationId)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1286664760")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
