"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { 
  FaCar, 
  FaUser, 
  FaLock, 
  FaSignInAlt,
  FaEye,
  FaEyeSlash
} from "react-icons/fa"

export default function Login() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      console.log("Mencoba login dengan username:", username)
      
      // Cari user berdasarkan username di tb_user
      const { data: userData, error: userError } = await supabase
        .from("tb_user")
        .select("*")
        .eq("username", username)
        .single()

      console.log("Hasil query user:", { userData, userError })
      
      if (userError || !userData) {
        setError("Username tidak ditemukan")
        setLoading(false)
        return
      }

      // Cek status aktif
      if (!userData.status_aktif) {
        setError("Akun Anda tidak aktif. Silakan hubungi administrator.")
        setLoading(false)
        return
      }

      // Cek password (plain text)
      if (userData.password !== password) {
        setError("Password salah")
        setLoading(false)
        return
      }

      // Buat session manual tanpa Supabase Auth
      // Simpan data user ke localStorage
      const userSession = {
        id: userData.id_user,
        username: userData.username,
        nama_lengkap: userData.nama_lengkap,
        role: userData.role,
        status_aktif: userData.status_aktif
      }
      
      localStorage.setItem("currentUser", JSON.stringify(userSession))
      localStorage.setItem("isLoggedIn", "true")
      
      console.log("Login berhasil:", userSession)

      // Redirect berdasarkan role
      if (userData.role === "admin") {
        router.push("/admin")
      } else if (userData.role === "petugas") {
        router.push("/petugas")
      } else if (userData.role === "owner") {
        router.push("/owner")
      } else {
        router.push("/")
      }

    } catch (err) {
      console.error("Login error:", err)
      setError("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
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
          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

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
                  className="absolute right-3 top-3 text-gray-500 hover:text-blue-600 transition-colors"
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
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

          {/* Informasi */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-800 text-center">
               Gunakan akun yang sudah terdaftar untuk masuk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}