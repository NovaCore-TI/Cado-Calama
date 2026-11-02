export function savPaymentConfiguration(env: Record<string, string | undefined> = process.env) {
  const amount = Number(env.CADO_SAV_PRICE_CLP);
  const priceClp = Number.isSafeInteger(amount) && amount > 0 ? amount : null;
  let paymentUrl: string | null = null;
  try {
    const url = new URL(env.CADO_SAV_PAYMENT_URL || '');
    if (url.protocol === 'https:' && !url.username && !url.password) paymentUrl = url.href;
  } catch {}
  return { priceClp, paymentUrl: priceClp ? paymentUrl : null };
}
