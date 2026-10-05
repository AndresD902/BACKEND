import {
  createEmployeeSchema,
  assignContractSchema,
  updateStatusSchema,
  updateIdentitySchema,
} from '../../src/schemas/employee.schema';

describe('employee.schema', () => {
  describe('createEmployeeSchema', () => {
    it('should pass with valid required fields', () => {
      const result = createEmployeeSchema.safeParse({
        cedula: '123456789',
        firstName: 'Ana',
        lastName: 'Lopez',
        gender: 'FEMALE',
        email: 'ana@example.com',
        password: 'secret123',
      });
      expect(result.success).toBe(true);
    });

    it('should fail when email is invalid', () => {
      const result = createEmployeeSchema.safeParse({
        cedula: '1',
        firstName: 'X',
        lastName: 'Y',
        gender: 'MALE',
        email: 'not-an-email',
        password: '123456',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('assignContractSchema', () => {
    const base = {
      position: 'Engineer',
      salary: 5000000,
      contractType: 'INDEFINITE',
      contractStart: '2025-01-01',
      paymentMethod: 'TRANSFER',
      paymentFrequency: 'MONTHLY',
    };

    it('should pass for INDEFINITE contract without contractEnd', () => {
      const result = assignContractSchema.safeParse(base);
      expect(result.success).toBe(true);
    });

    it('should fail for FIXED_TERM contract when contractEnd is missing', () => {
      const result = assignContractSchema.safeParse({
        ...base,
        contractType: 'FIXED_TERM',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('contractEnd');
      }
    });

    it('should pass for FIXED_TERM when contractEnd is provided', () => {
      const result = assignContractSchema.safeParse({
        ...base,
        contractType: 'FIXED_TERM',
        contractEnd: '2026-01-01',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateStatusSchema', () => {
    it('should accept valid status values', () => {
      expect(updateStatusSchema.safeParse({ status: 'ACTIVE' }).success).toBe(true);
      expect(updateStatusSchema.safeParse({ status: 'INACTIVE' }).success).toBe(true);
      expect(updateStatusSchema.safeParse({ status: 'SUSPENDED' }).success).toBe(true);
    });

    it('should reject invalid status values', () => {
      expect(updateStatusSchema.safeParse({ status: 'DELETED' }).success).toBe(false);
    });
  });

  describe('updateIdentitySchema', () => {
    it('should allow all fields to be optional', () => {
      const result = updateIdentitySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept valid identity fields', () => {
      const result = updateIdentitySchema.safeParse({
        cedula: '999',
        firstName: 'Carlos',
        changeReason: 'Name correction',
      });
      expect(result.success).toBe(true);
    });
  });
});
