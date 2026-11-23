(() => {
  const form = document.querySelector<HTMLFormElement>('#calculator');
  const output = document.querySelector<HTMLOutputElement>('#payment');
  const context = document.querySelector<HTMLElement>('#payment-context');
  const error = document.querySelector<HTMLElement>('#form-error');
  const principalField = document.querySelector<HTMLInputElement>('#principal');
  const rateField = document.querySelector<HTMLInputElement>('#rate');
  const monthsField = document.querySelector<HTMLInputElement>('#months');
  const summaryPrincipal = document.querySelector<HTMLElement>('#summary-principal');
  const summaryRate = document.querySelector<HTMLElement>('#summary-rate');
  const summaryMonths = document.querySelector<HTMLElement>('#summary-months');

  if (
    !form ||
    !output ||
    !context ||
    !error ||
    !principalField ||
    !rateField ||
    !monthsField ||
    !summaryPrincipal ||
    !summaryRate ||
    !summaryMonths
  ) {
    throw new Error('Credit calculator markup is incomplete');
  }

  const fields = [principalField, rateField, monthsField] as const;
  const money = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });
  const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  const rateNumber = new Intl.NumberFormat('ru-RU', { maximumSignificantDigits: 17 });
  const tinyRateNumber = new Intl.NumberFormat('ru-RU', {
    notation: 'scientific',
    maximumSignificantDigits: 17,
  });

  const clearErrors = (): void => {
    fields.forEach((field) => field.removeAttribute('aria-invalid'));
    error.textContent = '';
  };
  const fail = (field: HTMLInputElement): void => {
    clearErrors();
    field.setAttribute('aria-invalid', 'true');
    error.textContent = 'Проверьте введённые значения';
    field.focus();
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const principal = Number(principalField.value);
    const annualRate = Number(rateField.value);
    const months = Number(monthsField.value);
    if (!Number.isFinite(principal) || principal <= 0) {
      fail(principalField);
      return;
    }
    if (
      rateField.value.trim() === '' ||
      !Number.isFinite(annualRate) ||
      annualRate < 0 ||
      annualRate > 100
    ) {
      fail(rateField);
      return;
    }
    if (!Number.isInteger(months) || months < 1) {
      fail(monthsField);
      return;
    }

    clearErrors();
    const monthlyRate = annualRate / 1_200;
    const payment =
      monthlyRate === 0
        ? principal / months
        : principal * (monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate)));
    if (!Number.isFinite(payment)) {
      fail(principalField);
      return;
    }
    output.textContent = money.format(payment);
    output.removeAttribute('data-state');
    context.textContent =
      annualRate === 0
        ? 'Сумма делится на количество месяцев без начисления процентов.'
        : 'Расчёт по аннуитетной формуле с постоянным платежом.';
    summaryPrincipal.textContent = money.format(principal);
    summaryRate.textContent = `${(annualRate > 0 && annualRate < 0.000001 ? tinyRateNumber : rateNumber).format(annualRate)}%`;
    summaryMonths.textContent = `${number.format(months)} мес.`;
  });
})();
