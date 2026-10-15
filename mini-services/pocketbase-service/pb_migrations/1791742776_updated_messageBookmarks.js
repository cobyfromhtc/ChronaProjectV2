/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3282730007")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX idx_bookmark_msg_per ON messageBookmarks (messageId, personaId)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3282730007")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
