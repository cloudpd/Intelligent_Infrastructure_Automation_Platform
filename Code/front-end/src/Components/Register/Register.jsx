import React, { useContext, useState } from 'react';
import { useFormik } from 'formik';
import axios from 'axios';
import { baseUrl } from '../Shared/baseUrl';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authContext } from '../../Context/AuthContext';

export default function Register() {
  const [errMsg, setErrMsg] = useState('');
  const [sucMsg, setSucMsg] = useState('');
  const [spin, setSpin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { token } = useContext(authContext);
  const navigate = useNavigate();

  const myFormik = useFormik({
    initialValues: { name: '', email: '', password: '', rePassword: '' },
    onSubmit: async (values) => {
      setSpin(true);
      setErrMsg('');

      await axios
        .post(baseUrl + '/auth/signup', values)
        .then(() => {
          setSucMsg('Registration successful! Redirecting to sign in...');
          setTimeout(() => {
            navigate('/login');
          }, 1000);
        })
        .catch(({ response }) => {
          setErrMsg(response?.data?.message || 'Registration failed');
          setSpin(false);
        });
    },
    validate: (values) => {
      const errors = {};

      if (!values.name || values.name.length < 4) {
        errors.name = 'Full name must be at least 4 characters';
      }

      const regEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!values.email || !regEmail.test(values.email)) {
        errors.email = 'Please enter a valid email address';
      }

      if (!values.password || values.password.length < 5) {
        errors.password = 'Password must be at least 5 characters';
      }
      if (values.rePassword !== values.password) {
        errors.rePassword = 'Passwords do not match';
      }

      return errors;
    },
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

      {/* Main Register Card */}
      <div className='auth-card' style={{ width: '100%', maxWidth: '460px', borderTop: '3px solid #38bdf8' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: '800', marginBottom: '8px' }}>Create your account</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.95rem', marginBottom: '24px' }}>
          Get started with DeployHub in less than 2 minutes.
        </p>

        <form className='auth-form' onSubmit={myFormik.handleSubmit}>
          <label className='auth-label'>
            Full Name
            <div style={{ position: 'relative' }}>
              <input
                onBlur={myFormik.handleBlur}
                id='name'
                onChange={myFormik.handleChange}
                value={myFormik.values.name}
                name='name'
                type='text'
                className='auth-input'
                placeholder='John Doe'
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
                className='fa-solid fa-user'
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
          {myFormik.errors.name && myFormik.touched.name && (
            <div className='auth-alert auth-alert--danger'>{myFormik.errors.name}</div>
          )}

          <label className='auth-label' style={{ marginTop: '6px' }}>
            Email Address
            <div style={{ position: 'relative' }}>
              <input
                onBlur={myFormik.handleBlur}
                onChange={myFormik.handleChange}
                value={myFormik.values.email}
                name='email'
                type='email'
                className='auth-input'
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
          {myFormik.errors.email && myFormik.touched.email && (
            <div className='auth-alert auth-alert--danger'>{myFormik.errors.email}</div>
          )}

          <label className='auth-label' style={{ marginTop: '6px' }}>
            Password
            <div style={{ position: 'relative' }}>
              <input
                onBlur={myFormik.handleBlur}
                onChange={myFormik.handleChange}
                value={myFormik.values.password}
                name='password'
                type={showPassword ? 'text' : 'password'}
                className='auth-input'
                placeholder='Choose a strong password'
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
          {myFormik.errors.password && myFormik.touched.password && (
            <div className='auth-alert auth-alert--danger'>{myFormik.errors.password}</div>
          )}

          <label className='auth-label' style={{ marginTop: '6px' }}>
            Confirm Password
            <div style={{ position: 'relative' }}>
              <input
                onBlur={myFormik.handleBlur}
                onChange={myFormik.handleChange}
                value={myFormik.values.rePassword}
                name='rePassword'
                type={showPassword ? 'text' : 'password'}
                className='auth-input'
                placeholder='Confirm your password'
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
            </div>
          </label>
          {myFormik.errors.rePassword && myFormik.touched.rePassword && (
            <div className='auth-alert auth-alert--danger'>{myFormik.errors.rePassword}</div>
          )}

          <button
            type='submit'
            disabled={!myFormik.isValid || !myFormik.dirty || spin}
            className='project-button project-button--primary project-button--lg'
            style={{
              width: '100%',
              height: '48px',
              marginTop: '16px',
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
                Creating account...
              </>
            ) : (
              <>
                Create Enterprise Account
                <i className='fa-solid fa-arrow-right' style={{ marginLeft: '10px' }} />
              </>
            )}
          </button>
        </form>

        {errMsg && <div className='auth-alert auth-alert--danger mt-3'>{errMsg}</div>}
        {sucMsg && <div className='auth-alert auth-alert--success mt-3'>{sucMsg}</div>}

        <p className='auth-footer' style={{ marginTop: '28px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          Already have an account?{' '}
          <Link to='/login' className='auth-link' style={{ fontWeight: '700', color: '#60a5fa' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
