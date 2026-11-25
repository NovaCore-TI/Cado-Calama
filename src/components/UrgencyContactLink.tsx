'use client';

import type { ComponentPropsWithoutRef } from 'react';

export function UrgencyContactLink({ channel, children, ...props }: ComponentPropsWithoutRef<'a'> & {
  channel: 'telefono' | 'whatsapp';
}) {
  function recordChannel() {
    void fetch('/api/urgencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canal: channel }),
      keepalive: true,
    }).catch(() => {});
  }
  return <a {...props} onClick={recordChannel}>{children}</a>;
}
