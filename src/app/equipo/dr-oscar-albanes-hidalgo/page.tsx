import { DoctorProfile, doctorMetadata, profiles } from '@/components/DoctorProfile';

const profile = profiles.oscar;
export const metadata = doctorMetadata(profile);

export default function Page() {
  return <DoctorProfile profile={profile} />;
}
