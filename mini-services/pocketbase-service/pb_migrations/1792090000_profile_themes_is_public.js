/// <reference path="../pb_data/types.d.ts" />
// Theme Designer (round 13): profileThemes.isPublic marks a user-designed
// custom theme as listed in the public shop catalog, so other users can
// purchase it (the creator earns 90%, mirroring the marketplace fee split).
// Idempotent: only adds the field when missing, so it no-ops on instances
// where the live schema was already patched via the superuser API.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("profileThemes")

  let hasField = false
  for (const f of collection.fields) {
    if (f.name === "isPublic") { hasField = true; break }
  }
  if (!hasField) {
    collection.fields.add(new Field({
      "hidden": false,
      "id": "bool_isPublic_r13",
      "name": "isPublic",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "bool"
    }))
    app.save(collection)
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("profileThemes")
  const field = collection.fields.getByName("isPublic")
  if (field) {
    collection.fields.removeById(field.id)
    app.save(collection)
  }
})
