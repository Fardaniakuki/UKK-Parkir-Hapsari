"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { FaCar, FaUser, FaLock, FaSignInAlt } from "react-icons/fa"

export default function Login() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from("tb_user")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single()

    console.log("DATA:", data)
    console.log("ERROR:", error)

    if (!data) {
      alert("Login gagal. Periksa username dan password Anda.")
      setLoading(false)
      return
    }

    if (data.role === "admin") {
      router.push("/admin")
    } else if (data.role === "petugas") {
      router.push("/petugas")
    } else if (data.role === "owner") {
      router.push("/owner")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      {/* Pola Latar Belakang */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full opacity-20 blur-3xl"></div>
      </div>

      {/* Kartu Login */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 pt-8 pb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-4 rounded-full">
              <FaCar className="text-white text-4xl" />
            </div>
          </div>
          <h1 className="text-white text-3xl font-bold text-center">Sistem Parkir</h1>
          <p className="text-blue-100 text-center mt-2">Masuk ke akun Anda</p>
        </div>

        {/* Form Login */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="username">
                Nama Pengguna
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">
                  <FaUser />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Masukkan nama pengguna"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
                Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">
                  <FaLock />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <FaSignInAlt />
                  Masuk
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}