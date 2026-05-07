// report-service has no own database.
// This file re-exports the HTTP clients as a unified "repository" layer
// so the service layer stays decoupled from the HTTP implementation details.
export * as employeeClient  from '../clients/employeeClient';
export * as contractClient  from '../clients/contractClient';
export * as vacationClient  from '../clients/vacationClient';
