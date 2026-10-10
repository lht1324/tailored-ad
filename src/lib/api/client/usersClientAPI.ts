import {User} from "@/lib/api/types/supabase/Users";
import {deleteFetch, getFetch, patchFetch, postFormFetch} from "@/lib/api/client/baseFetch";

export interface UserUsageSummary {
    plan?: string | null;
    mode: 'balance';
    used: number;
    granted: number;
    remaining: number;
    hasPaid: boolean;
    periodStart: string | null;
    periodEnd?: string | null;
}

export interface ProfileLogo {
    signedUrl: string;
    fileName: string;
    imageFileExtension: string;
}

export const usersClientAPI = {
    async getUserByUserId(userId: string): Promise<User | null> {
        try {
            const response = await getFetch(`/api/user/${userId}`);
            const getUserByUserIdResult = await response.json();

            if (!getUserByUserIdResult.success || !getUserByUserIdResult.data) {
                throw new Error(getUserByUserIdResult.error ?? 'User not found');
            }

            return getUserByUserIdResult.data.user;
        } catch (error) {
            console.error('Error fetching user by userId:', error);
            return null;
        }
    },

    // Auth 이관용 — 세션 email로 우리 행 조회 (Better Auth ID는 UUID가 아니라서 ID 직조회 불가)
    async getUserByEmail(email: string): Promise<User | null> {
        try {
            const response = await getFetch(`/api/user/by-email?email=${encodeURIComponent(email)}`);
            const result = await response.json();

            if (!result.success || !result.data) {
                throw new Error(result.error ?? 'User not found');
            }

            return result.data.user;
        } catch (error) {
            console.error('Error fetching user by email:', error);
            return null;
        }
    },

    async getUserUsageSummary(userId: string): Promise<UserUsageSummary | null> {
        try {
            const response = await getFetch(`/api/user/${userId}`);
            const result = await response.json();
            if (!result.success || !result.data) {
                throw new Error(result.error ?? 'Usage not found');
            }
            return (result.data as { usage?: UserUsageSummary }).usage ?? null;
        } catch (error) {
            console.error('Error fetching user usage:', error);
            return null;
        }
    },
    
    async patchUserByUserId(userId: string, user: Partial<User>): Promise<User | null> {
        try {
            const response = await patchFetch(`/api/user/${userId}`, user);
            const patchUserByUserIdResult = await response.json();

            if (!patchUserByUserIdResult.success || !patchUserByUserIdResult.data) {
                throw new Error(patchUserByUserIdResult.error ?? 'User update failed');
            }

            return patchUserByUserIdResult.data.user;
        } catch (error) {
            console.error('Error patching user by userId:', error);
            return null;
        }
    },

    async patchUserApiKey(userId: string, falAiApiKey: string): Promise<{ success: boolean; message?: string; error?: string }>
    {
        try {
            const response = await patchFetch(`/api/user/${userId}/api-key`, { fal_ai_api_key: falAiApiKey });
            const patchUserApiKeyResult = await response.json();
            return patchUserApiKeyResult;
        } catch (error) {
            console.error('Error patching user API key:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    },

    async getProfileLogo(): Promise<ProfileLogo | null> {
        try {
            const response = await getFetch(`/api/profile/logo`);
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Profile logo not found');
            }
            return (result.data as { profileLogo?: ProfileLogo | null }).profileLogo ?? null;
        } catch (error) {
            console.error('Error fetching profile logo:', error);
            return null;
        }
    },

    async uploadProfileLogo(file: File): Promise<ProfileLogo | null> {
        try {
            const formData = new FormData();
            formData.append('logo', file);
            const response = await postFormFetch(`/api/profile/logo`, formData);
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Profile logo upload failed');
            }
            return (result.data as { profileLogo?: ProfileLogo | null }).profileLogo ?? null;
        } catch (error) {
            console.error('Error uploading profile logo:', error);
            return null;
        }
    },

    async deleteProfileLogo(): Promise<boolean> {
        try {
            const response = await deleteFetch(`/api/profile/logo`);
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Profile logo delete failed');
            }
            return true;
        } catch (error) {
            console.error('Error deleting profile logo:', error);
            return false;
        }
    },
}