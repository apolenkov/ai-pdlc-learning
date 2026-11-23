# Product context

## Product boundary

The training product calculates a monthly annuity payment from principal, annual interest rate, and term. It does not issue a loan, identify a customer, or store personal data.

## Domain language

| Term | Meaning |
| --- | --- |
| Principal | Initial amount used in the calculation |
| Annual rate | Nominal annual percentage rate |
| Term | Number of monthly payments |
| Monthly payment | Rounded annuity payment for the selected inputs |

## Context boundaries

- `calculator-ui` owns user input and result presentation.
- `calculator-core` owns validation and the annuity formula.
- No corporate data or external service is part of this example.
