/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1572859696")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_storyline_member_unique ON storylineMembers (storylineId, userId)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1572859696")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
