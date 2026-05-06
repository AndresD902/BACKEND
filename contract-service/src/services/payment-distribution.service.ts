import { PaymentFrequency } from "../shared/enums/payment-frequency.enum";
import { ValidationError } from "../shared/errors/validation.error";

export interface PaymentDistribution {
    baseMonthlySalary: number;
    paymentFrequency: PaymentFrequency;
    paymentsPerMonth: number;
    amountPerPayment: number;
}

const PAYMENTS_PER_MONTH: Record<PaymentFrequency, number> = {
    [PaymentFrequency.MONTHLY]: 1,
    [PaymentFrequency.BIWEEKLY]: 2,
    [PaymentFrequency.WEEKLY]: 4,
};

function roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculatePaymentDistribution(
    baseMonthlySalary: number | string,
    paymentFrequency?: string | null,
): PaymentDistribution {
    const salary = Number(baseMonthlySalary);

    if (!Number.isFinite(salary) || salary <= 0) {
        throw new ValidationError("Base monthly salary must be greater than zero");
    }

    const frequency = (paymentFrequency ?? PaymentFrequency.MONTHLY) as PaymentFrequency;
    const paymentsPerMonth = PAYMENTS_PER_MONTH[frequency];

    if (!paymentsPerMonth) {
        throw new ValidationError("Payment frequency is invalid");
    }

    return {
        baseMonthlySalary: roundCurrency(salary),
        paymentFrequency: frequency,
        paymentsPerMonth,
        amountPerPayment: roundCurrency(salary / paymentsPerMonth),
    };
}
