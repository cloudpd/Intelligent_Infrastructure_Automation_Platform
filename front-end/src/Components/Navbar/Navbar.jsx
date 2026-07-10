import React, { useContext } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import navImg from '../../finalProject assets/imgs/freshcart-logo.svg'
import { authContext } from '../../Context/AuthContext.jsx'

export default function Navbar() {

    let { token, setToken } = useContext(authContext)
    let navigate = useNavigate()

    function Signout() {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        setToken(null);
        navigate('/login');
    }

    return (
        <>
            <nav className="navbar navbar-expand-lg bg-body-tertiary">
                <div className="container-fluid px-5  py-3">
                    <NavLink className="navbar-brand" to="/home"><h3>DeployHub</h3></NavLink>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon" />
                    </button>
                    <div className="collapse navbar-collapse" id="navbarSupportedContent">
                        {token ?
                            <>
                                <ul className="navbar-nav me-auto mb-2 mb-lg-0">

                                    <li className="nav-item">
                                        <div className='d-flex justify-content-center'>
                                            {/* <NavLink className="nav-link" to="/home">Home <i className="fa-solid fa-house"></i></NavLink> */}
                                            <NavLink className="nav-link" to="/home">Home </NavLink>

                                        </div>
                                    </li>
                                    <li className="nav-item">
                                        <div className='d-flex justify-content-center'>
                                            <NavLink className="nav-link" to="/projects">Projects</NavLink>
                                        </div>

                                    </li>

                                    <li className="nav-item">
                                        <div className='d-flex justify-content-center'>
                                            <NavLink className="nav-link" to="/services">Services</NavLink>
                                        </div>
                                    </li>

                                </ul>
                            </>
                            : null}

                        <ul className="navbar-nav ms-auto mb-2  mb-lg-0">

                            {token ?
                                <>
                                    <li className="nav-item ">
                                        <div className='d-flex justify-content-center'>

                                            <NavLink className="nav-link" to="/profile">Profile <i className="fa-solid fa-user"></i></NavLink>
                                        </div>
                                    </li>
                                    <li className="nav-item ">
                                        <div className='d-flex justify-content-center'>
                                            <span onClick={Signout} className="nav-link cursor-pointer" >Signout<i className="fa-solid fa-right-from-bracket"></i></span>

                                        </div>
                                    </li>
                                </>
                                
                                : <>
                                    <li className="nav-item ">
                                        <div className='d-flex justify-content-center'>
                                            <NavLink className="nav-link" to="/login">Login</NavLink>
                                        </div>
                                    </li>
                                    <li className="nav-item ">
                                        <div className='d-flex justify-content-center'>
                                            <NavLink className="nav-link" to="/register">Register</NavLink>
                                        </div>
                                    </li>
                                </>}
                        </ul>

                    </div>
                </div>
            </nav>


        </>
    )
}