import React from 'react';
import './StatusBadge.css';

/**
 * StatusBadge — Reusable enterprise status badge.
 *
 * Types:
 * - 'healthy' / 'running' / 'applied' / 'live' → Success (Green)
 * - 'warning' / 'degraded' → Warning (Amber)
 * - 'error' / 'failed' / 'destroy_failed' → Error (Red)
 * - 'pending' / 'building' / 'destroying' / 'applying' → Info / Processing (Blue/Indigo)
 * - 'neutral' / 'draft' / 'idle' → Neutral (Slate)
 */

const STATUS_MAP = {
  // Success
  healthy:        { variant: 'success', icon: 'fa-solid fa-circle-check',       label: 'Healthy' },
  running:        { variant: 'success', icon: 'fa-solid fa-circle-check',       label: 'Running' },
  applied:        { variant: 'success', icon: 'fa-solid fa-circle-check',       label: 'Live' },
  live:           { variant: 'success', icon: 'fa-solid fa-circle-check',       label: 'Live' },

  // Warning
  warning:        { variant: 'warning', icon: 'fa-solid fa-triangle-exclamation', label: 'Warning' },
  degraded:       { variant: 'warning', icon: 'fa-solid fa-triangle-exclamation', label: 'Degraded' },

  // Error
  error:          { variant: 'danger',  icon: 'fa-solid fa-circle-xmark',       label: 'Failed' },
  failed:         { variant: 'danger',  icon: 'fa-solid fa-circle-xmark',       label: 'Failed' },
  destroy_failed: { variant: 'danger',  icon: 'fa-solid fa-circle-xmark',       label: 'Destroy Failed' },

  // Info / Processing
  pending:        { variant: 'info',    icon: 'fa-solid fa-spinner fa-spin',    label: 'Pending' },
  building:       { variant: 'info',    icon: 'fa-solid fa-rotate fa-spin',     label: 'Building' },
  applying:       { variant: 'info',    icon: 'fa-solid fa-arrows-rotate fa-spin', label: 'Applying' },
  destroying:     { variant: 'info',    icon: 'fa-solid fa-spinner fa-spin',    label: 'Destroying' },

  // Neutral
  draft:          { variant: 'neutral', icon: 'fa-solid fa-circle-notch',       label: 'Draft' },
  idle:           { variant: 'neutral', icon: 'fa-solid fa-minus',              label: 'Idle' },
};

export default function StatusBadge({ status = 'idle', customLabel, size = 'md' }) {
  const normalizedKey = String(status).toLowerCase();
  const config = STATUS_MAP[normalizedKey] || {
    variant: 'neutral',
    icon: 'fa-solid fa-circle-dot',
    label: status || 'Unknown',
  };

  const labelText = customLabel || config.label;

  return (
    <span className={`status-badge status-badge--${config.variant} status-badge--${size}`}>
      <i className={`status-badge__icon ${config.icon}`} aria-hidden='true' />
      <span className='status-badge__label'>{labelText}</span>
    </span>
  );
}
