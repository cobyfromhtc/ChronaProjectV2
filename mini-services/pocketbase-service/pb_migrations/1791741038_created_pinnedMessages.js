/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "",
    "deleteRule": "",
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
        "cascadeDelete": true,
        "collectionId": "pbc_2605467279",
        "hidden": false,
        "id": "relation2764284122",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "messageId",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_728114816",
        "hidden": false,
        "id": "relation1997276196",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "conversationId",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_1020016744",
        "hidden": false,
        "id": "relation1796235291",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "pinnedBy",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      }
    ],
    "id": "pbc_663736766",
    "indexes": [],
    "listRule": "",
    "name": "pinnedMessages",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_663736766");

  return app.delete(collection);
})
