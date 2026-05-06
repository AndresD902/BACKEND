import { contractService } from '../services/contract.service';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function startExpireEndedContractsJob(): NodeJS.Timeout {
  const run = (): void => {
    contractService.expireEndedContracts().catch((error: Error) => {
      console.warn('[ContractExpirationJob] Could not expire ended contracts:', error.message);
    });
  };

  run();

  return setInterval(run, ONE_DAY_MS);
}
