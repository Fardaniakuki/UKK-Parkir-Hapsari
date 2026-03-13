"use client"

import { useRouter } from "next/navigation"

export default function LogoutButton(){

 const router = useRouter()

 const logout = () => {
  localStorage.removeItem("user_role")
  router.push("/login")
 }

 return(

  <button
   onClick={logout}
   style={{
    padding:"8px 14px",
    background:"#ef4444",
    color:"white",
    border:"none",
    borderRadius:"6px",
    cursor:"pointer"
   }}
  >
   Logout
  </button>

 )

}