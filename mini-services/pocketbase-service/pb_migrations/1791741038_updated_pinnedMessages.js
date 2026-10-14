/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_663736766")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX idx_pinned_msg_conv ON pinnedMessages (messageId, conversationId)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_663736766")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
