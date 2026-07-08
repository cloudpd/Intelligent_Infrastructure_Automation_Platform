import jwtDecode from "jwt-decode";
import { createContext, useEffect, useState } from "react";
import React from 'react'


export let authContext = createContext()


export default function AuthProvider({ children }) {


 let [token,setToken] =useState(localStorage.getItem('token'));
 let[userData,setUserData]=useState('');

  useEffect(()=>{
    if(token)
    {let x=jwtDecode(token); 
      setUserData(x)}
    else{
      console.log('Error: Not have token so no jwt');
      return;
    }
  },[token])

  return (
    <authContext.Provider value={{ setToken, token,userData}}>
      {children}
    </authContext.Provider>
  )
}