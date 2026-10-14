/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1020016744")

  // add field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "number295481369",
    "max": null,
    "min": null,
    "name": "displayId",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": true,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation1689669068",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "userId",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation2883382308",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "originalCreatorId",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1579384326",
    "max": 0,
    "min": 0,
    "name": "name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text742587758",
    "max": 0,
    "min": 0,
    "name": "avatarUrl",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3258191437",
    "max": 0,
    "min": 0,
    "name": "bannerUrl",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "bool2323052248",
    "name": "isActive",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "bool1599779888",
    "name": "isOnline",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1843675174",
    "max": 0,
    "min": 0,
    "name": "description",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3788881123",
    "max": 0,
    "min": 0,
    "name": "archetype",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3343321666",
    "max": 0,
    "min": 0,
    "name": "gender",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1848168473",
    "max": 0,
    "min": 0,
    "name": "pronouns",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "number2704281778",
    "max": null,
    "min": null,
    "name": "age",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "hidden": false,
    "id": "json1874629670",
    "maxSize": 5242880,
    "name": "tags",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(15, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2715565872",
    "max": 0,
    "min": 0,
    "name": "personalityDescription",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(16, new Field({
    "hidden": false,
    "id": "json885169470",
    "maxSize": 5242880,
    "name": "personalitySpectrums",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(17, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2479893516",
    "max": 0,
    "min": 0,
    "name": "strengths",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(18, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1103582187",
    "max": 0,
    "min": 0,
    "name": "flaws",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(19, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text984042726",
    "max": 0,
    "min": 0,
    "name": "values",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(20, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1102637092",
    "max": 0,
    "min": 0,
    "name": "fears",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2769286930",
    "max": 0,
    "min": 0,
    "name": "species",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(22, new Field({
    "hidden": false,
    "id": "json1237995133",
    "maxSize": 5242880,
    "name": "likes",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(23, new Field({
    "hidden": false,
    "id": "json770948625",
    "maxSize": 5242880,
    "name": "dislikes",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(24, new Field({
    "hidden": false,
    "id": "json952775709",
    "maxSize": 5242880,
    "name": "hobbies",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(25, new Field({
    "hidden": false,
    "id": "json3576764016",
    "maxSize": 5242880,
    "name": "skills",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(26, new Field({
    "hidden": false,
    "id": "json2698072953",
    "maxSize": 5242880,
    "name": "languages",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(27, new Field({
    "hidden": false,
    "id": "json2772508986",
    "maxSize": 5242880,
    "name": "habits",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(28, new Field({
    "hidden": false,
    "id": "json1017204383",
    "maxSize": 5242880,
    "name": "speechPatterns",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(29, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2110015341",
    "max": 0,
    "min": 0,
    "name": "backstory",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(30, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2863891088",
    "max": 0,
    "min": 0,
    "name": "appearance",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(31, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1004292655",
    "max": 0,
    "min": 0,
    "name": "mbtiType",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(32, new Field({
    "hidden": false,
    "id": "json946391956",
    "maxSize": 5242880,
    "name": "bigFive",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(33, new Field({
    "hidden": false,
    "id": "json1895086432",
    "maxSize": 5242880,
    "name": "hexaco",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(34, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1897999847",
    "max": 0,
    "min": 0,
    "name": "discType",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(35, new Field({
    "hidden": false,
    "id": "json45045040",
    "maxSize": 5242880,
    "name": "disc",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(36, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2915325852",
    "max": 0,
    "min": 0,
    "name": "enneagramType",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(37, new Field({
    "hidden": false,
    "id": "json1689619614",
    "maxSize": 5242880,
    "name": "strengthsFinder",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(38, new Field({
    "hidden": false,
    "id": "bool4288614280",
    "name": "nsfwEnabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(39, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3909387973",
    "max": 0,
    "min": 0,
    "name": "nsfwBodyType",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(40, new Field({
    "hidden": false,
    "id": "json3396811100",
    "maxSize": 5242880,
    "name": "nsfwKinks",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(41, new Field({
    "hidden": false,
    "id": "json2486183542",
    "maxSize": 5242880,
    "name": "nsfwContentWarnings",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(42, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3419364986",
    "max": 0,
    "min": 0,
    "name": "nsfwOrientation",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(43, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1272803819",
    "max": 0,
    "min": 0,
    "name": "nsfwRolePreference",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(44, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2251717079",
    "hidden": false,
    "id": "relation3691653460",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "themeId",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(45, new Field({
    "hidden": false,
    "id": "bool3058651623",
    "name": "themeEnabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(46, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3655824334",
    "max": 0,
    "min": 0,
    "name": "rpStyle",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(47, new Field({
    "hidden": false,
    "id": "json2019833873",
    "maxSize": 5242880,
    "name": "rpPreferredGenders",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(48, new Field({
    "hidden": false,
    "id": "json2042288172",
    "maxSize": 5242880,
    "name": "rpGenres",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(49, new Field({
    "hidden": false,
    "id": "json2274493825",
    "maxSize": 5242880,
    "name": "rpLimits",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(50, new Field({
    "hidden": false,
    "id": "json3289583588",
    "maxSize": 5242880,
    "name": "rpThemes",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(51, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2869525880",
    "max": 0,
    "min": 0,
    "name": "rpExperienceLevel",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(52, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2626984854",
    "max": 0,
    "min": 0,
    "name": "rpResponseTime",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1020016744")

  // remove field
  collection.fields.removeById("number295481369")

  // remove field
  collection.fields.removeById("relation1689669068")

  // remove field
  collection.fields.removeById("relation2883382308")

  // remove field
  collection.fields.removeById("text1579384326")

  // remove field
  collection.fields.removeById("text742587758")

  // remove field
  collection.fields.removeById("text3258191437")

  // remove field
  collection.fields.removeById("bool2323052248")

  // remove field
  collection.fields.removeById("bool1599779888")

  // remove field
  collection.fields.removeById("text1843675174")

  // remove field
  collection.fields.removeById("text3788881123")

  // remove field
  collection.fields.removeById("text3343321666")

  // remove field
  collection.fields.removeById("text1848168473")

  // remove field
  collection.fields.removeById("number2704281778")

  // remove field
  collection.fields.removeById("json1874629670")

  // remove field
  collection.fields.removeById("text2715565872")

  // remove field
  collection.fields.removeById("json885169470")

  // remove field
  collection.fields.removeById("text2479893516")

  // remove field
  collection.fields.removeById("text1103582187")

  // remove field
  collection.fields.removeById("text984042726")

  // remove field
  collection.fields.removeById("text1102637092")

  // remove field
  collection.fields.removeById("text2769286930")

  // remove field
  collection.fields.removeById("json1237995133")

  // remove field
  collection.fields.removeById("json770948625")

  // remove field
  collection.fields.removeById("json952775709")

  // remove field
  collection.fields.removeById("json3576764016")

  // remove field
  collection.fields.removeById("json2698072953")

  // remove field
  collection.fields.removeById("json2772508986")

  // remove field
  collection.fields.removeById("json1017204383")

  // remove field
  collection.fields.removeById("text2110015341")

  // remove field
  collection.fields.removeById("text2863891088")

  // remove field
  collection.fields.removeById("text1004292655")

  // remove field
  collection.fields.removeById("json946391956")

  // remove field
  collection.fields.removeById("json1895086432")

  // remove field
  collection.fields.removeById("text1897999847")

  // remove field
  collection.fields.removeById("json45045040")

  // remove field
  collection.fields.removeById("text2915325852")

  // remove field
  collection.fields.removeById("json1689619614")

  // remove field
  collection.fields.removeById("bool4288614280")

  // remove field
  collection.fields.removeById("text3909387973")

  // remove field
  collection.fields.removeById("json3396811100")

  // remove field
  collection.fields.removeById("json2486183542")

  // remove field
  collection.fields.removeById("text3419364986")

  // remove field
  collection.fields.removeById("text1272803819")

  // remove field
  collection.fields.removeById("relation3691653460")

  // remove field
  collection.fields.removeById("bool3058651623")

  // remove field
  collection.fields.removeById("text3655824334")

  // remove field
  collection.fields.removeById("json2019833873")

  // remove field
  collection.fields.removeById("json2042288172")

  // remove field
  collection.fields.removeById("json2274493825")

  // remove field
  collection.fields.removeById("json3289583588")

  // remove field
  collection.fields.removeById("text2869525880")

  // remove field
  collection.fields.removeById("text2626984854")

  return app.save(collection)
})
