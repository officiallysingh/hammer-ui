import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - Oxneer',
  description: 'Sign in or create an account to get started',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
