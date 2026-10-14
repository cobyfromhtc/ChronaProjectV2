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
        "collectionId": "pbc_1020016744",
        "hidden": false,
        "id": "relation2584369023",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "personaId",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3058431538",
        "max": 0,
        "min": 0,
        "name": "emoji",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_2198586084",
    "indexes": [],
    "listRule": "",
    "name": "messageReactions",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2198586084");

  return app.delete(collection);
})
