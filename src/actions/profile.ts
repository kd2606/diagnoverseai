'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ProfileFormData {
  fullName: string;
  phone: string;
  address: string;
  bloodGroup: string;
  dob: string;
}

export type ProfileUpdateResult =
  | { success: true }
  | { success: false; error: string };

export async function updateProfile(formData: ProfileFormData): Promise<ProfileUpdateResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'You must be logged in to update your profile.' };
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
      return { success: false, error: 'Failed to save profile changes. Please try again.' };
    }

    // Refresh both portals to be safe
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error updating profile:', err);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
