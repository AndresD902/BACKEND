jest.mock('morgan', () => jest.fn(() => (_req: any, _res: any, next: any) => next()));

jest.mock('../../src/services/contract.service', () => ({
  contractService: {},
}));

jest.mock('../../src/config/env', () => ({
  env: {
    nodeEnv: 'production',
    corsOrigins: ['http://localhost:5173'],
    serviceName: 'contract-service',
  },
}));

import morgan from 'morgan';
import request from 'supertest';
import { app } from '../../src/app';

describe('app — morgan format (production)', () => {
  it('calls morgan with combined format when nodeEnv is production', () => {
    expect(jest.mocked(morgan)).toHaveBeenCalledWith('combined');
  });

  it('GET /health still responds 200 in production mode', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
