ALTER TABLE "FinancialProfile"
  ADD CONSTRAINT "profile_amounts" CHECK ("income" > 0 AND "debt" >= 0 AND "expenses" >= 0);
ALTER TABLE "LoanProduct"
  ADD CONSTRAINT "product_terms" CHECK ("monthsMin" >= 1 AND "monthsMax" BETWEEN "monthsMin" AND 360),
  ADD CONSTRAINT "product_amount" CHECK ("amountMin" > 0 AND "amountMax" >= "amountMin" AND ("fee" IS NULL OR "fee" >= 0)),
  ADD CONSTRAINT "product_rates" CHECK ("rateMin" >= 0 AND "rateMax" BETWEEN "rateMin" AND 100),
  ADD CONSTRAINT "product_method" CHECK ("method" IN ('flat','annuity','equalPrincipal')),
  ADD CONSTRAINT "product_category" CHECK ("category" IN ('personal','education','home'));
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "fixture_size" CHECK ("size" BETWEEN 1 AND 65536);
ALTER TABLE "User" ADD CONSTRAINT "preferences" CHECK ("locale" IN ('vi-VN','en-US') AND "appearance" IN ('light','dark','system'));
