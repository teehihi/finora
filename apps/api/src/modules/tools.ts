import { simulate, compare, affordability } from '@finora/financial-engine';
import type { Estimate } from '@finora/contracts';

// Only server-selected capabilities can be invoked. The provider receives a
// small summary. Account identifiers and raw ledger rows stay on the server.
export const financialTools = {
  simulateRepaymentScenario: simulate,
  compareLoanOptions: compare,
  analyzeFinancialProfile: affordability,
  explainSavedSimulation(result: Estimate) {
    return { firstPayment: result.firstPayment, repayment: result.repayment, total: result.total };
  },
};
