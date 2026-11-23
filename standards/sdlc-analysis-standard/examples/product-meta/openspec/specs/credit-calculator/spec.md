# Credit calculator product requirement

## Scenario: calculate a monthly payment

- Given a principal, annual rate and integer term in the documented ranges
- When the participant submits the form
- Then the calculator displays a rounded monthly annuity payment

## Scenario: zero rate

- Given a valid principal and term and a zero annual rate
- When the participant submits the form
- Then the principal is divided by the term without interest

The product specification owns observable cross-service behavior. Validation
and implementation contracts remain in the service repositories.
