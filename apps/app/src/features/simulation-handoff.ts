import type { LoanInput } from '@finora/contracts';
import { requestId } from '../services/request-id';
import { parseScenario, type ScenarioFields } from './simulation-model';

type HandoffOrigin = 'ai' | 'document';

let draft:
  | { id: string; owner: string; fields: ScenarioFields; origin: HandoffOrigin; expires: number }
  | undefined;

export function prepareSimulationHandoff(
  owner: string,
  input: LoanInput,
  origin: HandoffOrigin = 'ai',
): string | undefined {
  const fields = {
    principal: String(input.principal),
    months: String(input.months),
    annualRate: String(input.annualRate),
    firstDue: input.firstDue,
    method: input.method,
    fee: input.fee === null ? '' : String(input.fee),
  };
  if (!parseScenario(null, fields)) return;
  const id = requestId();
  draft = { id, owner, fields, origin, expires: Date.now() + 60_000 };
  return id;
}

export function readSimulationHandoffContext(owner?: string, id?: string) {
  if (draft && draft.expires > Date.now() && draft.id === id && draft.owner === owner)
    return { fields: { ...draft.fields }, origin: draft.origin };
}

export function readSimulationHandoff(owner?: string, id?: string): ScenarioFields | undefined {
  return readSimulationHandoffContext(owner, id)?.fields;
}

export function clearSimulationHandoff(owner?: string, id?: string) {
  if (draft && (draft.expires <= Date.now() || (draft.owner === owner && draft.id === id)))
    draft = undefined;
}
