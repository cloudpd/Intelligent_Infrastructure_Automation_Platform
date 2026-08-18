import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import { authContext } from '../../Context/AuthContext';
import StatusBadge from '../Shared/StatusBadge';

export default function LandingPage() {
  const { token } = useContext(authContext);

  return (
    <div className='landing-shell'>
      {/* Background ambient lighting */}
      <div className='landing-bg-glow' />

      {/* Top Public Navigation Navbar */}
      <nav className='landing-nav'>
        <Link to='/' className='landing-nav__brand'>
          <div className='landing-nav__mark'>
            <i className='fa-solid fa-paper-plane' />
          </div>
          <span>DeployHub</span>
        </Link>

        <div className='landing-nav__links'>
          <a href='#pipeline' className='landing-nav__link'>Pipeline Engine</a>
          <a href='#features' className='landing-nav__link'>Platform Features</a>
        </div>

        <div className='landing-nav__actions'>
          {token ? (
            <Link to='/home' className='project-button project-button--primary'>
              Go to Workspace <i className='fa-solid fa-arrow-right' style={{ marginLeft: '6px' }} />
            </Link>
          ) : (
            <>
              <Link to='/login' className='project-button project-button--ghost'>
                Sign In
              </Link>
              <Link to='/register' className='project-button project-button--primary'>
                Get Started <i className='fa-solid fa-arrow-right' style={{ marginLeft: '6px' }} />
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Hero Section */}
      <section className='landing-hero'>
        <div className='landing-hero__badge'>
          <i className='fa-solid fa-bolt' />
          <span>Next-Generation Infrastructure Automation</span>
        </div>

        <h1 className='landing-hero__title'>
          The Intelligent Platform to Provision <span>AWS &amp; Kubernetes</span> in Minutes.
        </h1>

        <p className='landing-hero__subtitle'>
          DeployHub automates your entire cloud lifecycle — from VPC networks and Docker container registries to GitHub CI pipelines and production EKS Kubernetes clusters.
        </p>

        <div className='landing-hero__cta'>
          <Link to='/register' className='project-button project-button--primary project-button--lg'>
            Start Free Trial <i className='fa-solid fa-rocket' style={{ marginLeft: '8px' }} />
          </Link>
          <Link to='/login' className='project-button project-button--ghost project-button--lg'>
            Explore Control Center
          </Link>
        </div>

        {/* Executive Platform Stats Counter */}
        <div className='landing-stats'>
          <div className='landing-stat-item'>
            <span className='landing-stat-value' style={{ color: '#38bdf8' }}>10x</span>
            <span className='landing-stat-label'>Faster Release Speed</span>
          </div>
          <div className='landing-stat-item'>
            <span className='landing-stat-value' style={{ color: '#34d399' }}>99.98%</span>
            <span className='landing-stat-label'>Platform SLA Uptime</span>
          </div>
          <div className='landing-stat-item'>
            <span className='landing-stat-value' style={{ color: '#c084fc' }}>5-Step</span>
            <span className='landing-stat-label'>Automated Delivery Pipeline</span>
          </div>
          <div className='landing-stat-item'>
            <span className='landing-stat-value' style={{ color: '#fbbf24' }}>Zero</span>
            <span className='landing-stat-label'>Downtime Deployment</span>
          </div>
        </div>
      </section>

      {/* 1. FIRST: 5-Step Delivery Pipeline Section */}
      <section id='pipeline' className='landing-section'>
        <div className='landing-section__header'>
          <h2 className='landing-section__title'>
            The <span>5-Step Delivery Lifecycle</span>
          </h2>
          <p className='landing-section__subtitle'>
            Sequential pipeline stage guards ensure every service is properly configured and verified before going live.
          </p>
        </div>

        <div className='landing-steps'>
          <div className='landing-step-card'>
            <span className='landing-step-badge landing-step-badge--1'>
              <i className='fa-solid fa-server' /> Stage 1
            </span>
            <h4 className='landing-step-title'>Terraform Setup</h4>
            <p className='landing-step-desc'>Configure AWS backend S3 buckets and remote state lock tables.</p>
          </div>

          <div className='landing-step-card'>
            <span className='landing-step-badge landing-step-badge--2'>
              <i className='fa-solid fa-cloud' /> Stage 2
            </span>
            <h4 className='landing-step-title'>Terraform Apply</h4>
            <p className='landing-step-desc'>Provision VPC networks, security groups, and cloud infrastructure.</p>
          </div>

          <div className='landing-step-card'>
            <span className='landing-step-badge landing-step-badge--3'>
              <i className='fa-brands fa-docker' /> Stage 3
            </span>
            <h4 className='landing-step-title'>Dockerize</h4>
            <p className='landing-step-desc'>Select container image configuration and build specifications.</p>
          </div>

          <div className='landing-step-card'>
            <span className='landing-step-badge landing-step-badge--4'>
              <i className='fa-solid fa-dharmachakra' /> Stage 4 &amp; 5
            </span>
            <h4 className='landing-step-title'>CI &amp; Kubernetes</h4>
            <p className='landing-step-desc'>Push GitHub Actions CI pipeline &amp; generate production K8s manifests.</p>
          </div>
        </div>
      </section>

      {/* 2. SECOND: Core Platform Features Section */}
      <section id='features' className='landing-section'>
        <div className='landing-section__header'>
          <h2 className='landing-section__title'>Built for Enterprise Reliability</h2>
          <p className='landing-section__subtitle'>
            Everything your team needs to transform raw source code into scalable, production-grade cloud infrastructure.
          </p>
        </div>

        <div className='landing-features-grid'>
          <div className='landing-feature-card'>
            <div className='landing-feature-icon landing-feature-icon--tf'>
              <i className='fa-solid fa-server' />
            </div>
            <h3 className='landing-feature-title'>Automated AWS VPC Topologies</h3>
            <p className='landing-feature-desc'>
              Generate and execute production-ready Terraform modules for VPC networks, subnets, route tables, and gateways across AWS regions.
            </p>
          </div>

          <div className='landing-feature-card'>
            <div className='landing-feature-icon landing-feature-icon--docker'>
              <i className='fa-brands fa-docker' />
            </div>
            <h3 className='landing-feature-title'>Container Registries (ECR)</h3>
            <p className='landing-feature-desc'>
              Provision private Amazon ECR repositories and generate optimized Dockerfiles for NodeJS, Python, Go, and Java microservices.
            </p>
          </div>

          <div className='landing-feature-card'>
            <div className='landing-feature-icon landing-feature-icon--ci'>
              <i className='fa-solid fa-rotate' />
            </div>
            <h3 className='landing-feature-title'>GitHub CI/CD Automation</h3>
            <p className='landing-feature-desc'>
              Push automated GitHub Actions workflows directly into your repository with automatic secret injection for AWS credentials.
            </p>
          </div>

          <div className='landing-feature-card'>
            <div className='landing-feature-icon landing-feature-icon--k8s'>
              <i className='fa-solid fa-dharmachakra' />
            </div>
            <h3 className='landing-feature-title'>Kubernetes &amp; EKS Orchestration</h3>
            <p className='landing-feature-desc'>
              Generate multi-manifest K8s configurations (Deployments, Services, Ingress, Autoscaling) tailored to your cloud resources.
            </p>
          </div>

          <div className='landing-feature-card'>
            <div className='landing-feature-icon landing-feature-icon--vault'>
              <i className='fa-solid fa-shield-halved' />
            </div>
            <h3 className='landing-feature-title'>Encrypted Credential Storage</h3>
            <p className='landing-feature-desc'>
              AES-256 encrypted vaults for Personal Access Tokens and AWS credentials to guarantee bank-grade security across all projects.
            </p>
          </div>

          <div className='landing-feature-card'>
            <div className='landing-feature-icon landing-feature-icon--control'>
              <i className='fa-solid fa-chart-pie' />
            </div>
            <h3 className='landing-feature-title'>Real-Time Project Control</h3>
            <p className='landing-feature-desc'>
              Track active deployments, service states, and infrastructure health from a single consolidated executive dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Public Landing Page Footer */}
      <footer className='landing-footer'>
        <div className='landing-footer__copy'>
          &copy; {new Date().getFullYear()} DeployHub Intelligent Infrastructure Platform. All rights reserved.
        </div>
        <div>
          <StatusBadge status='healthy' customLabel='System Online 2.4' size='sm' />
        </div>
      </footer>
    </div>
  );
}
