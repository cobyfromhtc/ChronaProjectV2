/// <reference path="../pb_data/types.d.ts" />
// Add `attachments` (json) field to the `messages` collection so a single
// message can carry multiple image attachments alongside its text content.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2605467279")

  // Idempotency: skip if the field already exists
  let alreadyExists = false
  try {
    collection.fields.getByName("attachments")
    alreadyExists = true
  } catch {}

  if (!alreadyExists) {
    // add field
    collection.fields.add(new Field({
      "hidden": false,
      "id": "json4451781234",
      "maxSize": 5242880,
      "name": "attachments",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "json"
    }))
  }

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2605467279")

  // remove field
  try {
    collection.fields.removeByName("attachments")
  } catch {}

  return app.save(collection)
})
