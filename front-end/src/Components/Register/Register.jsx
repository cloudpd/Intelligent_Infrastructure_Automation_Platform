import React, { useContext, useState } from 'react'
import { useFormik } from 'formik';
import axios from 'axios';
import { baseUrl } from '../Shared/baseUrl';
import { Navigate, useNavigate } from 'react-router-dom';
import { authContext } from '../../Context/AuthContext';
import { toast } from 'react-toastify'

export default function Register() {

  let [errMsg, seterrMsg] = useState('');
  let [sucMsg, setsucMsg] = useState('');
  let [spin, setSpin] = useState(false);
  let { token } = useContext(authContext);
  let navigate = useNavigate();


  let notify = () => {
    toast.success('Registered Successfully', { position: 'top-center', theme: 'colored' })
  }


  const myFormik = useFormik({

    initialValues: { name: '', email: '', password: '', rePassword: ''},

    onSubmit: async (values) => {

      setSpin(true)

      let { data } = await axios.post(baseUrl + 'auth/signup', values)

        .then(() => {
          notify();
          seterrMsg('');
          setsucMsg('Registerd Successfully');

          setTimeout(() => { navigate('/login'); }, 1500);

        })

        .catch(({ response }) => { seterrMsg(response.data.message); setSpin(false) });
      console.log(data);

    },


    validate: (values) => {

      const errors = {}

      if (values.name.length < 4) {
        errors.name = 'name must be more than 4 caraters'
      }

      let regEmail = /^[a-zA-z0-9]{5,20}@(gmail|yahoo|outlook).(com|org)$/;

      if (!regEmail.test(values.email)) {
        errors.email = 'email are invalid';
      }

      if (!values.password.match(/^[a-zA-z0-9]{5,15}$/)) {
        errors.password = 'password is INvalid';
      }
      if (!values.rePassword.match(values.password)) {
        errors.rePassword = 'rePassword not matched'
      }
      // if (!values.phone.match(/^(\+20)?01[0125][0-9]{8}$/)) {
      //   errors.phone = 'Phone is Invalid'
      // }

      return errors
    }

  })

  if (token) {
    return <Navigate to={'/home'} />
  }

  return (
    <>
      <div className="w-50 m-auto my-5 py-5 min-vh-100">
        <form className="form py-5 my-5" onSubmit={myFormik.handleSubmit}>

          <h2>Register Now :</h2>

          <input onBlur={myFormik.handleBlur} id='name' onChange={myFormik.handleChange} value={myFormik.values.name} name='name' type="text" className="form-control my-3" placeholder='Enter Your Name' />
          {myFormik.errors.name && myFormik.touched.name ? <div className="alert alert-danger"> {myFormik.errors.name}</div> : null}

          <input onBlur={myFormik.handleBlur} onChange={myFormik.handleChange} value={myFormik.values.email} name='email' type="email" className="form-control my-3" placeholder='Enter Your email' />
          {myFormik.errors.email && myFormik.touched.email ? <div className="alert alert-danger"> {myFormik.errors.email}</div> : null}

          <input onBlur={myFormik.handleBlur} onChange={myFormik.handleChange} value={myFormik.values.password} name='password' type="password" className="form-control my-3" placeholder='Enter Your Passwore' />
          {myFormik.errors.password && myFormik.touched.password ? <div className="alert alert-danger"> {myFormik.errors.password}</div> : null}

          <input onBlur={myFormik.handleBlur} onChange={myFormik.handleChange} value={myFormik.values.rePassword} name='rePassword' type="password" className="form-control my-3" placeholder='Enter Your rePasswore' />
          {myFormik.errors.rePassword && myFormik.touched.rePassword ? <div className="alert alert-danger"> {myFormik.errors.rePassword}</div> : null}

          {/* <input onBlur={myFormik.handleBlur} onChange={myFormik.handleChange} value={myFormik.values.phone} name='phone' type="tel" className="form-control my-3" placeholder='Enter Your Phone' />
          {myFormik.errors.phone && myFormik.touched.phone ? <div className="alert alert-danger"> {myFormik.errors.phone}</div> : null} */}

          <div className='d-flex  justify-content-end'>

            <button type='submit' disabled={(myFormik.isValid === false || myFormik.dirty === false)} className=' btn bg-dark text-white'>
              {spin && <i className='fa fa-spin  fa-spinner '></i>}
              {spin || 'Register'}
            </button>

          </div>

          {errMsg ? <div className="alert alert-danger my-3">{errMsg}</div> : null}
          {sucMsg ? <div className='alert alert-success'>{sucMsg}</div> : null}




        </form>
        
      </div>
    </>
  )
}
