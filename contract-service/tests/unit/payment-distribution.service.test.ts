import { calculatePaymentDistribution } from '../../src/services/payment-distribution.service';
import { PaymentFrequency } from '../../src/shared/enums/payment-frequency.enum';
import { ValidationError } from '../../src/shared/errors/validation.error';

describe('calculatePaymentDistribution', () => {
  it('keeps the full monthly salary for monthly payments', () => {
    expect(calculatePaymentDistribution(6000000, PaymentFrequency.MONTHLY)).toEqual({
      baseMonthlySalary: 6000000,
      paymentFrequency: PaymentFrequency.MONTHLY,
      paymentsPerMonth: 1,
      amountPerPayment: 6000000,
    });
  });

  it('splits the monthly salary into two biweekly payments', () => {
    expect(calculatePaymentDistribution(6000000, PaymentFrequency.BIWEEKLY)).toEqual({
      baseMonthlySalary: 6000000,
      paymentFrequency: PaymentFrequency.BIWEEKLY,
      paymentsPerMonth: 2,
      amountPerPayment: 3000000,
    });
  });

  it('splits the monthly salary into four weekly payments', () => {
    expect(calculatePaymentDistribution('6000000.00', PaymentFrequency.WEEKLY)).toEqual({
      baseMonthlySalary: 6000000,
      paymentFrequency: PaymentFrequency.WEEKLY,
      paymentsPerMonth: 4,
      amountPerPayment: 1500000,
    });
  });

  it('defaults to monthly distribution when frequency is empty', () => {
    expect(calculatePaymentDistribution(6000000, null).paymentFrequency).toBe(PaymentFrequency.MONTHLY);
  });

  it('rejects invalid base salaries', () => {
    expect(() => calculatePaymentDistribution(0, PaymentFrequency.MONTHLY)).toThrow(ValidationError);
  });

  it('throws when payment frequency is not in the lookup table', () => {
    expect(() => calculatePaymentDistribution(6000000, 'invalid-frequency')).toThrow(ValidationError);
  });
});
