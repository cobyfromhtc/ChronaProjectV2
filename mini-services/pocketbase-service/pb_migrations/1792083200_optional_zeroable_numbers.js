/// <reference path="../pb_data/types.d.ts" />
// PocketBase treats 0 as "blank" for REQUIRED number fields, so a required
// number field can never store a legitimate zero. Real code paths hit this:
// chronosTransactions.amount = 0 on the first-purchase 100% bonus (-cost + bonus),
// chronosTransactions.balance = 0 when a user spends their entire balance,
// marketplacePurchases.pricePaid/creatorEarnings = 0 for free listings.
// Fix: make these number fields optional (0 is then stored as a real value).
migrate((app) => {
  const patches = [
    ["chronosTransactions", ["amount", "balance"]],
    ["imageRecords", ["fileSize"]],
    ["marketplacePurchases", ["pricePaid", "creatorEarnings"]],
    ["storylineBoosts", ["amount"]],
    ["storylineReviews", ["rating"]],
  ]

  for (const [colName, fieldNames] of patches) {
    const collection = app.findCollectionByNameOrId(colName)
    for (const fieldName of fieldNames) {
      const field = collection.fields.getByName(fieldName)
      if (field) {
        field.required = false
      }
    }
    app.save(collection)
  }
}, (app) => {
  const patches = [
    ["chronosTransactions", ["amount", "balance"]],
    ["imageRecords", ["fileSize"]],
    ["marketplacePurchases", ["pricePaid", "creatorEarnings"]],
    ["storylineBoosts", ["amount"]],
    ["storylineReviews", ["rating"]],
  ]

  for (const [colName, fieldNames] of patches) {
    const collection = app.findCollectionByNameOrId(colName)
    for (const fieldName of fieldNames) {
      const field = collection.fields.getByName(fieldName)
      if (field) {
        field.required = true
      }
    }
    app.save(collection)
  }
})
