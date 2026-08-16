import React from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

const stats = [
  { title: 'Active projects', value: '12', label: 'Live deployments and services' },
  { title: 'Deployments today', value: '4', label: 'Recent workflow updates' },
  { title: 'Successful builds', value: '98%', label: 'Stable delivery rate' },
]

export default function Home() {
  return (
    <div className='home-shell'>
      <section className='home-hero'>
        <div className='home-hero__panel'>
          <div>
            <div className='home-hero__label'>Dashboard overview</div>
            <h1 className='home-hero__title'>Build the future with a clean deployment dashboard.</h1>
            <p className='home-hero__text'>Access your projects, services, and status in one modern control center with a premium dark theme.</p>
          </div>

          <div className='home-hero__actions'>
            <Link className='home-hero__button' to='/projects'>Explore projects</Link>
            <Link className='home-hero__button home-hero__button--ghost' to='/services'>View services</Link>
          </div>
        </div>

        <div className='home-hero__summary'>
          <div className='summary-card'>
            <strong>24/7</strong>
            <span>Production monitoring</span>
          </div>
          <div className='summary-card'>
            <strong>8</strong>
            <span>Enabled environments</span>
          </div>
          <div className='summary-card'>
            <strong>65</strong>
            <span>Open events</span>
          </div>
        </div>
      </section>

      <section className='home-statgrid'>
        {stats.map((item) => (
          <article key={item.title} className='stat-card'>
            <h3>{item.title}</h3>
            <p>{item.label}</p>
            <div className='stat-card__metric'>{item.value}</div>
          </article>
        ))}
      </section>
    </div>
  )
}
