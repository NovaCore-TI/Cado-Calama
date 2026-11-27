import BookingWizard from './BookingWizard';

export default async function UnifiedBookingPage({ searchParams }: {
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  const { step } = await searchParams;
  const initialStep = step === '3' ? 3 : 2;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  return <BookingWizard key={initialStep} initialStep={initialStep} today={today} />;
}
