'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { error } = await (supabase.from('profiles') as any)
    .update({
      full_name: formData.fullName,
      phone: formData.phone,
      address: formData.address,
      blood_group: formData.bloodGroup,
      dob: formData.dob,
    })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }

  // Refresh both portals to be safe
  revalidatePath('/', 'layout');
}
