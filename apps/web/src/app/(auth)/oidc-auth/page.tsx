'use client';

import { useParams } from 'next/navigation';

export default function OidcAuth() {
  // Grab route params
  const params = useParams();

  return (
    <div>
      <h1>OIDC Auth Page</h1>
      <pre>{JSON.stringify(params, null, 2)}</pre>
    </div>
  );
}
