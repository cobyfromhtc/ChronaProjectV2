/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2198586084")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX idx_msg_reaction_unique ON messageReactions (messageId, personaId, emoji)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2198586084")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
