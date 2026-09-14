import { ProfileForm } from "@/components/ProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function PatientProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profileData = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single() as any;
    profileData = data;
  }

  return <ProfileForm role="patient" initialData={profileData} />;
}