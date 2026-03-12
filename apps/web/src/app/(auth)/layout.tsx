import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - Hammer',
  description: 'Sign in or create an account to get started',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
