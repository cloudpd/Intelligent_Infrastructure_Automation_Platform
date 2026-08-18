import axios from 'axios';
import { useFormik } from 'formik';
import React, { useContext, useState } from 'react';
import { baseUrl } from '../Shared/baseUrl.js';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { authContext } from '../../Context/AuthContext.jsx';

export default function Login() {
  const { setToken, token } = useContext(authContext);
  const [errMsg, setErrMsg] = useState('');
  const [sucMsg, setSucMsg] = useState('');
  const [spin, setSpin] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const validationSchema = Yup.object({
    email: Yup.string().email('Invalid email address').required('Email address is required'),
    password: Yup.string().required('Password is required'),
  });

  const myformik = useFormik({
    initialValues: { email: '', password: '' },
    onSubmit: async (values) => {
      try {
        setSpin(true);
        setErrMsg('');
        const { data } = await axios.post(baseUrl + '/auth/login', values);

        if (data.success === true) {
          setSucMsg('Authentication successful. Redirecting to workspace...');
          sessionStorage.setItem('token', data.accessToken);
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          setToken(data.accessToken);

          setTimeout(() => {
            navigate('/home');
          }, 800);
        }
      } catch ({ response }) {
        setErrMsg(response?.data?.message || 'Invalid email or password credentials');
        setSpin(false);
        setForgot(true);
      }
    },
    validationSchema,
  });

  if (token) {
    return <Navigate to={'/home'} />;
  }

  return (
    <div className='auth-shell' style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      {/* Home Navigation Button */}
      <Link to='/' className='auth-home-button' title='Go to Home Landing Page'>
        <i className='fa-solid fa-house' />
        <span>Home</span>
      </Link>

      {/* Centered Brand Logo */}
      <Link to='/' className='auth-brand-centered'>
        <div className='auth-brand-logo'>
          <i className='fa-solid fa-paper-plane' />
        </div>
        <span className='auth-brand-name'>DeployHub</span>
      </Link>

      {/* Main Login Card */}
      <div className='auth-card' style={{ width: '100%', maxWidth: '440px', borderTop: '3px solid #6366f1' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: '800', marginBottom: '8px' }}>Sign in to DeployHub</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.95rem', marginBottom: '24px' }}>
          Enter your credentials to access your control dashboard.
        </p>

        <form onSubmit={myformik.handleSubmit} className='auth-form'>
          <label className='auth-label'>
            Email Address
            <div style={{ position: 'relative' }}>
              <input
                onBlur={myformik.handleBlur}
                onChange={myformik.handleChange}
                value={myformik.values.email}
                className='auth-input'
                type='email'
                name='email'
                placeholder='name@company.com'
                style={{
                  paddingLeft: '40px',
                  height: '46px',
                  fontSize: '0.95rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                }}
              />
              <i
                className='fa-solid fa-envelope'
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  fontSize: '0.95rem',
                }}
              />
            </div>
          </label>
          {myformik.errors.email && myformik.touched.email && (
            <div className='auth-alert auth-alert--danger'>{myformik.errors.email}</div>
          )}

          <label className='auth-label' style={{ marginTop: '8px' }}>
            Password
            <div style={{ position: 'relative' }}>
              <input
                onBlur={myformik.handleBlur}
                onChange={myformik.handleChange}
                value={myformik.values.password}
                className='auth-input'
                type={showPassword ? 'text' : 'password'}
                name='password'
                placeholder='••••••••'
                style={{
                  paddingLeft: '40px',
                  paddingRight: '40px',
                  height: '46px',
                  fontSize: '0.95rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                }}
              />
              <i
                className='fa-solid fa-lock'
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  fontSize: '0.95rem',
                }}
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                }}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </label>
          {myformik.errors.password && myformik.touched.password && (
            <div className='auth-alert auth-alert--danger'>{myformik.errors.password}</div>
          )}

          <div className='auth-meta' style={{ marginTop: '8px', marginBottom: '8px' }}>
            <label className='auth-checkbox' style={{ cursor: 'pointer' }}>
              <input type='checkbox' defaultChecked style={{ accentColor: '#6366f1' }} />
              <span>Remember session</span>
            </label>
            {forgot ? (
              <Link to='/account-recovery' className='auth-link'>
                Forgot password?
              </Link>
            ) : null}
          </div>

          <button
            type='submit'
            disabled={!myformik.isValid || !myformik.dirty || spin}
            className='project-button project-button--primary project-button--lg'
            style={{
              width: '100%',
              height: '48px',
              marginTop: '12px',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '1rem',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.45)',
              border: 'none',
            }}
          >
            {spin ? (
              <>
                <i className='fa fa-spin fa-spinner' style={{ marginRight: '8px' }} />
                Authenticating...
              </>
            ) : (
              <>
                Sign in to Control Center
                <i className='fa-solid fa-arrow-right' style={{ marginLeft: '10px' }} />
              </>
            )}
          </button>
        </form>

        {errMsg && <div className='auth-alert auth-alert--danger mt-3'>{errMsg}</div>}
        {sucMsg && <div className='auth-alert auth-alert--success mt-3'>{sucMsg}</div>}

        <p className='auth-footer' style={{ marginTop: '28px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          New to DeployHub?{' '}
          <Link to='/register' className='auth-link' style={{ fontWeight: '700', color: '#60a5fa' }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}