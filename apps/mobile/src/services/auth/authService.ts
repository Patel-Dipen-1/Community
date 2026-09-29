import { AppDispatch } from '../../store/store';
import { setCredentials, logout, setAuthLoading, setAuthError } from '../../store/slices/authSlice';
import { authStorage } from '../storage/authStorage';
import { UserProfile } from '../../types/auth.types';

export const authService = {
  /**
   * Initializes authentication state from SecureStore on App launch
   */
  async initAuth(dispatch: AppDispatch): Promise<void> {
    dispatch(setAuthLoading(true));
    try {
      const [token, user] = await Promise.all([
        authStorage.getToken(),
        authStorage.getUser(),
      ]);

      if (token && user) {
        dispatch(setCredentials({ token, user }));
      } else {
        dispatch(logout());
      }
    } catch (error: any) {
      console.error('Failed to restore auth session:', error);
      dispatch(setAuthError('Session expired. Please log in again.'));
      await authStorage.clearAuth();
    }
  },

  /**
   * Saves credentials to SecureStore and updates Redux state
   */
  async saveAuthSession(
    dispatch: AppDispatch,
    token: string,
    user: UserProfile
  ): Promise<void> {
    await Promise.all([
      authStorage.saveToken(token),
      authStorage.saveUser(user),
    ]);
    dispatch(setCredentials({ token, user }));
  },

  /**
   * Clears auth session from SecureStore and resets Redux state
   */
  async logoutUser(dispatch: AppDispatch): Promise<void> {
    await authStorage.clearAuth();
    dispatch(logout());
  },
};
