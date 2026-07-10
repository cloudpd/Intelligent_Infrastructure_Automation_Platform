import React, { useContext, useState } from 'react'
import { useFormik } from 'formik';
import axios from 'axios';
import { baseUrl } from '../Shared/baseUrl';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authContext } from '../../Context/AuthContext';
import { toast } from 'react-toastify'

export default function Register() {
  const [errMsg, setErrMsg] = useState('');
  const [sucMsg, setSucMsg] = useState('');
  const [spin, setSpin] = useState(false);
  const { token } = useContext(authContext);
  const navigate = useNavigate();

  const notify = () => {
    toast.success('Registered successfully', { position: 'top-center', theme: 'colored' })
  }

  const myFormik = useFormik({
    initialValues: { name: '', email: '', password: '', rePassword: '' },
    onSubmit: async (values) => {
      setSpin(true)
      setErrMsg('')

      await axios.post(baseUrl + 'auth/signup', values)
        .then(() => {
          notify();
          setSucMsg('Registered successfully');
          setTimeout(() => { navigate('/login'); }, 1200);
        })
        .catch(({ response }) => {
          setErrMsg(response?.data?.message || 'Registration failed');
          setSpin(false);
        });
    },
    validate: (values) => {
      const errors = {}

      if (values.name.length < 4) {
        errors.name = 'Name must be more than 4 characters'
      }

      const regEmail = /^[a-zA-z0-9]{5,20}@(gmail|yahoo|outlook).(com|org)$/;

      if (!regEmail.test(values.email)) {
        errors.email = 'Email is invalid';
      }

      if (!values.password.match(/^[a-zA-z0-9]{5,15}$/)) {
        errors.password = 'Password is invalid';
      }
      if (!values.rePassword.match(values.password)) {
        errors.rePassword = 'Passwords do not match'
      }

      return errors
    }
  })

  if (token) {
    return <Navigate to={'/home'} />
  }

  return (
    <div className='auth-shell'>

          <div className='auth-brand'>
          <div className='auth-brand__mark'>D</div>
          <span>DeployHub</span>
        </div>


      
      <div className='auth-card'>

        <h1>Create your account</h1>
        <p>Join DeployHub and start shipping faster.</p>

        <form className='auth-form' onSubmit={myFormik.handleSubmit}>
          <label className='auth-label'>
            Name
            <input onBlur={myFormik.handleBlur} id='name' onChange={myFormik.handleChange} value={myFormik.values.name} name='name' type='text' className='auth-input' placeholder='Enter your name' />
          </label>
          {myFormik.errors.name && myFormik.touched.name ? <div className='auth-alert auth-alert--danger'>{myFormik.errors.name}</div> : null}

          <label className='auth-label'>
            Email
            <input onBlur={myFormik.handleBlur} onChange={myFormik.handleChange} value={myFormik.values.email} name='email' type='email' className='auth-input' placeholder='Enter your email' />
          </label>
          {myFormik.errors.email && myFormik.touched.email ? <div className='auth-alert auth-alert--danger'>{myFormik.errors.email}</div> : null}

          <label className='auth-label'>
            Password
            <input onBlur={myFormik.handleBlur} onChange={myFormik.handleChange} value={myFormik.values.password} name='password' type='password' className='auth-input' placeholder='Choose a password' />
          </label>
          {myFormik.errors.password && myFormik.touched.password ? <div className='auth-alert auth-alert--danger'>{myFormik.errors.password}</div> : null}

          <label className='auth-label'>
            Confirm password
            <input onBlur={myFormik.handleBlur} onChange={myFormik.handleChange} value={myFormik.values.rePassword} name='rePassword' type='password' className='auth-input' placeholder='Confirm your password' />
          </label>
          {myFormik.errors.rePassword && myFormik.touched.rePassword ? <div className='auth-alert auth-alert--danger'>{myFormik.errors.rePassword}</div> : null}

          <button type='submit' disabled={(myFormik.isValid === false || myFormik.dirty === false || spin)} className='auth-btn auth-submit'>
            {spin ? <i className='fa fa-spin fa-spinner'></i> : 'Create account'}
          </button>
        </form>

        {errMsg ? <div className='auth-alert auth-alert--danger mt-3'>{errMsg}</div> : null}
        {sucMsg ? <div className='auth-alert auth-alert--success mt-3'>{sucMsg}</div> : null}

        <p className='auth-footer'>
          Already have an account? <Link to={'/login'} className='auth-link'>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
