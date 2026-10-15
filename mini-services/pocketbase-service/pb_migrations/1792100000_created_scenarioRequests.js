/// <reference path="../pb_data/types.d.ts" />
// Scenario Requests (Discover > Personas chat flow): when a user wants to chat
// with another user's persona from the Personas tab, they must first craft a
// scenario and send it as a request. The target persona's owner receives a
// Blorp notification with the scenario details and can Accept (creates the
// conversation, seeds the scenario's opening messages) or Decline.
migrate((app) => {
  let existing = null
  try { existing = app.findCollectionByNameOrId("scenarioRequests") } catch (e) { /* not found */ }
  if (existing) return

  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1782114501",
        "max": 20,
        "min": 0,
        "name": "status",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_4145231549",
        "hidden": false,
        "id": "relation2481095231",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "scenarioId",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_1020016744",
        "hidden": false,
        "id": "relation3110588740",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "fromPersonaId",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_1020016744",
        "hidden": false,
        "id": "relation1524809297",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "toPersonaId",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation3294170562",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "fromUserId",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation3992708145",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "toUserId",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1219337208",
        "max": 500,
        "min": 0,
        "name": "message",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "date3179289046",
        "max": "",
        "min": "",
        "name": "respondedAt",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "autodate2914362611",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": true,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3497134286",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": true,
        "type": "autodate"
      }
    ],
    "id": "pbc_3925810477",
    "indexes": [],
    "listRule": null,
    "name": "scenarioRequests",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3925810477");

  return app.delete(collection);
})
