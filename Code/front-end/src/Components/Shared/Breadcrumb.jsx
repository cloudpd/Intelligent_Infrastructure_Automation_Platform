import React from 'react';
import { Link } from 'react-router-dom';
import './Breadcrumb.css';

/**
 * Breadcrumb — context-aware navigation trail.
 *
 * @param {Array<{ label: string, to?: string }>} crumbs
 *   Pass `to` for every crumb except the last (active) one.
 */
export default function Breadcrumb({ crumbs = [] }) {
  if (!crumbs.length) return null;
  return (
    <nav className='breadcrumb' aria-label='Breadcrumb'>
      <ol className='breadcrumb__list'>
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={idx} className='breadcrumb__item'>
              {!isLast && crumb.to ? (
                <Link to={crumb.to} className='breadcrumb__link'>
                  {crumb.label}
                </Link>
              ) : (
                <span className={`breadcrumb__current${isLast ? ' breadcrumb__current--active' : ''}`}>
                  {crumb.label}
                </span>
              )}
              {!isLast && <span className='breadcrumb__sep' aria-hidden='true'>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
