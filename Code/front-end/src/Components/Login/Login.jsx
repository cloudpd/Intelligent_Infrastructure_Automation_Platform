import axios from 'axios'
import { useFormik } from 'formik'
import React, { useContext, useState } from 'react'
import { baseUrl } from '../Shared/baseUrl'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import * as Yup from 'yup'
import { authContext } from '../../Context/AuthContext.jsx'

export default function Login() {
    const { setToken, token } = useContext(authContext);
    const [errMsg, setErrMsg] = useState('');
    const [sucMsg, setSucMsg] = useState('');
    const [spin, setSpin] = useState(false);
    const [forgot, setForgot] = useState(false);

    const navigate = useNavigate();

    const validationSchema = Yup.object({
        email: Yup.string().email('Invalid email').required('Email is required'),
        password: Yup.string().matches(/^[a-zA-z0-9]{5,15}$/, 'Password must be 5-15 characters').required('Password is required'),
    });

    const myformik = useFormik({
        initialValues: { email: '', password: '' },
        onSubmit: async (values) => {
            try {
                setSpin(true);
                setErrMsg('');
                const { data } = await axios.post(baseUrl + 'auth/login', values);

                if (data.success === true) {
                    setSucMsg('Welcome back');
                    sessionStorage.setItem('token', data.accessToken);
                    localStorage.setItem('token', data.accessToken);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setToken(data.accessToken);

                    setTimeout(() => {
                        navigate('/home');
                    }, 1000);
                }
            } catch ({ response }) {
                setErrMsg(response?.data?.message || 'Login failed');
                setSpin(false);
                setForgot(true);
            }
        },
        validationSchema,
    });

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
                <h1>Welcome back</h1>
                <p>Sign in to continue to DeployHub.</p>

                <form onSubmit={myformik.handleSubmit} className='auth-form'>
                    <label className='auth-label'>
                        Email
                        <input
                            onBlur={myformik.handleBlur}
                            onChange={myformik.handleChange}
                            value={myformik.values.email}
                            className='auth-input'
                            type='email'
                            name='email'
                            placeholder='Enter your email'
                        />
                    </label>
                    {myformik.errors.email && myformik.touched.email ? <div className='auth-alert auth-alert--danger'>{myformik.errors.email}</div> : null}

                    <label className='auth-label'>
                        Password
                        <input
                            onBlur={myformik.handleBlur}
                            onChange={myformik.handleChange}
                            value={myformik.values.password}
                            className='auth-input'
                            type='password'
                            name='password'
                            placeholder='Enter your password'
                        />
                    </label>
                    {myformik.errors.password && myformik.touched.password ? <div className='auth-alert auth-alert--danger'>{myformik.errors.password}</div> : null}

                    <div className='auth-meta'>
                        <label className='auth-checkbox'>
                            <input type='checkbox' />
                            <span>Remember me</span>
                        </label>
                        {forgot ? (
                            <Link to={'/account-recovery'} className='auth-link'>Forgot password?</Link>
                        ) : null}
                    </div>

                    <button
                        type='submit'
                        disabled={myformik.isValid === false || myformik.dirty === false || spin}
                        className='auth-btn auth-submit'
                    >
                        {spin ? <i className='fa fa-spin fa-spinner'></i> : 'Sign in'}
                    </button>
                </form>

                {errMsg ? <div className='auth-alert auth-alert--danger mt-3'>{errMsg}</div> : null}
                {sucMsg ? <div className='auth-alert auth-alert--success mt-3'>{sucMsg}</div> : null}

                <p className='auth-footer'>
                    New here? <Link to={'/register'} className='auth-link'>Create an account</Link>
                </p>
            </div>
        </div>
    )
}