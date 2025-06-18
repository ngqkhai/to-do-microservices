export type Priority = 'high' | 'medium' | 'low';
export type Status = 'pending' | 'in_progress' | 'completed';

// User interface matching the API
export interface User {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
  email_verified: boolean;
  last_login: string;
  created_at: string;
} 