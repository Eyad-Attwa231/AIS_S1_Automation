import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile, StaffMember } from '../types/module3';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  employee: StaffMember | null;
  role: 'employee' | 'admin' | 'guest' | null;
  error: string | null;
}

export const authService = {
  /**
   * Get the current session and user profile/employee details
   */
  async getInitialAuthState(): Promise<AuthState> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        profile: null,
        employee: null,
        role: null,
        error: 'Supabase credentials are not configured in environment variables.',
      };
    }

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const user = sessionData.session?.user;
      if (!user) {
        return {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          profile: null,
          employee: null,
          role: null,
          error: null,
        };
      }

      return await this.resolveUserData(user.id, user.email);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        profile: null,
        employee: null,
        role: null,
        error: errorMsg,
      };
    }
  },

  /**
   * Resolve user profile and linked employee record
   */
  async resolveUserData(userId: string, email?: string): Promise<AuthState> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // 1. Fetch profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      return {
        isAuthenticated: true,
        isLoading: false,
        user: { id: userId, email },
        profile: null,
        employee: null,
        role: null,
        error: `Failed to load profile: ${profileErr.message}`,
      };
    }

    const userProfile: Profile = profile || {
      id: userId,
      full_name: email?.split('@')[0] || 'User',
      role: 'guest',
    };

    // 2. Fetch employee record if profile is employee or admin
    let employeeData: StaffMember | null = null;
    if (userProfile.role === 'employee' || userProfile.role === 'admin') {
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select(`
          id,
          profile_id,
          department_id,
          job_title,
          is_active,
          departments:department_id (
            id,
            name,
            description
          )
        `)
        .eq('profile_id', userId)
        .maybeSingle();

      if (!empErr && emp) {
        const dept = emp.departments as any;
        employeeData = {
          id: emp.id,
          profileId: userId,
          name: userProfile.full_name,
          email,
          role: emp.job_title || (userProfile.role === 'admin' ? 'Administrator' : 'Staff Member'),
          departmentId: emp.department_id || '',
          departmentName: dept?.name || 'General Operations',
          isActive: emp.is_active ?? true,
          isOnDuty: true,
          phone: userProfile.phone,
        };
      } else if (userProfile.role === 'admin') {
        // Fallback placeholder for admin who may not have a dedicated employees row
        employeeData = {
          id: `admin-${userId.substring(0, 8)}`,
          profileId: userId,
          name: userProfile.full_name || 'System Admin',
          email,
          role: 'System Administrator',
          departmentId: '',
          departmentName: 'All Departments',
          isActive: true,
          isOnDuty: true,
          phone: userProfile.phone,
        };
      }
    }

    return {
      isAuthenticated: true,
      isLoading: false,
      user: { id: userId, email },
      profile: userProfile,
      employee: employeeData,
      role: userProfile.role,
      error: null,
    };
  },

  /**
   * Sign in with Supabase Auth (email + password)
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Login succeeded but user data not returned' };
      }

      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
  },
};
