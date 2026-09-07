import {User} from "@/lib/api/types/supabase/Users";
import {PostgrestError, PostgrestSingleResponse} from "@supabase/supabase-js";
import {createSupabaseServiceRoleClient} from "@/lib/supabase/supabaseServiceRole";

export const usersServerAPI = {
    async getUserByUserId(userId: string): Promise<User | null> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            const { data, error }: PostgrestSingleResponse<User | null> = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user by userId:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Unexpected error in getUserByUserId:', error);
            return null;
        }
    },

    async postUsers(user: Partial<User>): Promise<User | null> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            const { data, error } = await supabase
                .from('users')
                .insert([user])
                .select()
                .single();

            if (error) {
                console.error('Error inserting user:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Unexpected error in postUsers:', error);
            return null;
        }
    },

    async patchUserByUserId(userId: string, user: Partial<User>): Promise<User | null> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            const { data, error } = await supabase
                .from('users')
                .update(user)
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                console.error('Error updating user:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Unexpected error in patchUserByUserId:', error);
            return null;
        }
    },

    async patchUserCreditCountByUserId(userId: string, patchCreditAmount: number): Promise<User | null> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            const { data, error }: {
                data: User | null;
                error: PostgrestError | null;
            } = await supabase
                .rpc('increment_user_credit', {
                    user_id: userId,
                    credit_delta: patchCreditAmount
                })
                .single();

            if (error) {
                console.error('Error updating user credit:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Unexpected error in patchUserCreditCountByUserId:', error);
            return null;
        }
    }
}