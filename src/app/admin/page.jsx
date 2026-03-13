"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { 
  FaUsers, 
  FaMoneyBill, 
  FaParking, 
  FaCar, 
  FaChartBar,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaUserTie,
  FaSave,
  FaTimes,
  FaHistory,
  FaMotorcycle,
  FaTruck,
  FaIdCard,
  FaPalette,
  FaUser,
  FaClock,
  FaFileAlt
} from "react-icons/fa"

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [searchTerm, setSearchTerm] = useState("")
  
  // State untuk data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalArea: 0,
    totalKendaraan: 0,
    totalKendaraanAktif: 0,
    totalTransaksiHariIni: 0,
    pendapatanHariIni: 0,
    totalLog: 0
  })

  // State untuk CRUD
  const [users, setUsers] = useState([])
  const [areas, setAreas] = useState([])
  const [tarifs, setTarifs] = useState([])
  const [kendaraans, setKendaraans] = useState([])
  const [logs, setLogs] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingData, setEditingData] = useState(null)
  const [modalType, setModalType] = useState("")

  // Form state
  const [formData, setFormData] = useState({
    // User fields
    nama_lengkap: "",
    username: "",
    password: "",
    role: "petugas",
    status_aktif: true,
    // Area fields
    nama_area: "",
    kapasitas: 0,
    // Tarif fields
    jenis_kendaraan: "mobil",
    tarif_per_jam: 0,
    // Kendaraan fields
    plat_nomor: "",
    warna: "",
    pemilik: ""
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchAreas(),
      fetchTarifs(),
      fetchKendaraans(),
      fetchLogs()
    ])
    setLoading(false)
  }

  const fetchStats = async () => {
    try {
      const { count: usersCount } = await supabase
        .from("tb_user")
        .select("*", { count: 'exact', head: true })

      const { count: areasCount } = await supabase
        .from("tb_area_parkir")
        .select("*", { count: 'exact', head: true })

      const { count: kendaraanCount } = await supabase
        .from("tb_kendaraan")
        .select("*", { count: 'exact', head: true })

      const { count: aktifCount } = await supabase
        .from("tb_transaksi")
        .select("*", { count: 'exact', head: true })
        .eq("status", "masuk")

      const { count: logCount } = await supabase
        .from("tb_log_aktivitas")
        .select("*", { count: 'exact', head: true })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: transaksiHariIni } = await supabase
        .from("tb_transaksi")
        .select("biaya_total")
        .gte("waktu_masuk", today.toISOString())
        .eq("status", "keluar")

      const pendapatan = transaksiHariIni?.reduce((sum, item) => sum + (item.biaya_total || 0), 0) || 0

      setStats({
        totalUsers: usersCount || 0,
        totalArea: areasCount || 0,
        totalKendaraan: kendaraanCount || 0,
        totalKendaraanAktif: aktifCount || 0,
        totalTransaksiHariIni: transaksiHariIni?.length || 0,
        pendapatanHariIni: pendapatan,
        totalLog: logCount || 0
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_user")
        .select("*")
        .order("id_user", { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchAreas = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_area_parkir")
        .select("*")
        .order("id_area", { ascending: true })

      if (error) throw error
      setAreas(data || [])
    } catch (error) {
      console.error("Error fetching areas:", error)
    }
  }

  const fetchTarifs = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_tarif")
        .select("*")
        .order("id_tarif", { ascending: true })

      if (error) throw error
      setTarifs(data || [])
    } catch (error) {
      console.error("Error fetching tarifs:", error)
    }
  }

  const fetchKendaraans = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_kendaraan")
        .select("*")
        .order("id_kendaraan", { ascending: false })

      if (error) throw error
      setKendaraans(data || [])
    } catch (error) {
      console.error("Error fetching kendaraans:", error)
    }
  }

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_log_aktivitas")
        .select(`
          id_log,
          aktivitas,
          waktu_aktivitas,
          id_user,
          tb_user (
            nama_lengkap,
            username
          )
        `)
        .order("waktu_aktivitas", { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error("Error fetching logs:", error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
  }

  const openModal = (type, data = null) => {
    setModalType(type)
    if (data) {
      setEditingData(data)
      setFormData(data)
    } else {
      setEditingData(null)
      setFormData({
        nama_lengkap: "",
        username: "",
        password: "",
        role: "petugas",
        status_aktif: true,
        nama_area: "",
        kapasitas: 0,
        jenis_kendaraan: "mobil",
        tarif_per_jam: 0,
        plat_nomor: "",
        warna: "",
        pemilik: ""
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingData(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let result
      let aktivitas = ""
      
      switch(modalType) {
        case "user":
          if (editingData) {
            result = await supabase
              .from("tb_user")
              .update({
                nama_lengkap: formData.nama_lengkap,
                username: formData.username,
                password: formData.password,
                role: formData.role,
                status_aktif: formData.status_aktif
              })
              .eq("id_user", editingData.id_user)
            aktivitas = `Mengupdate user: ${formData.username}`
          } else {
            result = await supabase
              .from("tb_user")
              .insert([{
                nama_lengkap: formData.nama_lengkap,
                username: formData.username,
                password: formData.password,
                role: formData.role,
                status_aktif: formData.status_aktif
              }])
            aktivitas = `Menambah user baru: ${formData.username}`
          }
          break

        case "area":
          if (editingData) {
            result = await supabase
              .from("tb_area_parkir")
              .update({
                nama_area: formData.nama_area,
                kapasitas: formData.kapasitas
              })
              .eq("id_area", editingData.id_area)
            aktivitas = `Mengupdate area: ${formData.nama_area}`
          } else {
            result = await supabase
              .from("tb_area_parkir")
              .insert([{
                nama_area: formData.nama_area,
                kapasitas: formData.kapasitas,
                terisi: 0
              }])
            aktivitas = `Menambah area baru: ${formData.nama_area}`
          }
          break

        case "tarif":
          if (editingData) {
            result = await supabase
              .from("tb_tarif")
              .update({
                jenis_kendaraan: formData.jenis_kendaraan,
                tarif_per_jam: formData.tarif_per_jam
              })
              .eq("id_tarif", editingData.id_tarif)
            aktivitas = `Mengupdate tarif ${formData.jenis_kendaraan}`
          } else {
            result = await supabase
              .from("tb_tarif")
              .insert([{
                jenis_kendaraan: formData.jenis_kendaraan,
                tarif_per_jam: formData.tarif_per_jam
              }])
            aktivitas = `Menambah tarif baru: ${formData.jenis_kendaraan}`
          }
          break

        case "kendaraan":
          if (editingData) {
            result = await supabase
              .from("tb_kendaraan")
              .update({
                plat_nomor: formData.plat_nomor,
                jenis_kendaraan: formData.jenis_kendaraan,
                warna: formData.warna,
                pemilik: formData.pemilik
              })
              .eq("id_kendaraan", editingData.id_kendaraan)
            aktivitas = `Mengupdate kendaraan: ${formData.plat_nomor}`
          } else {
            result = await supabase
              .from("tb_kendaraan")
              .insert([{
                plat_nomor: formData.plat_nomor,
                jenis_kendaraan: formData.jenis_kendaraan,
                warna: formData.warna,
                pemilik: formData.pemilik
              }])
            aktivitas = `Menambah kendaraan baru: ${formData.plat_nomor}`
          }
          break
      }

      if (result.error) throw result.error

      // Log aktivitas
      await supabase
        .from("tb_log_aktivitas")
        .insert([{
          id_user: 1, // Ganti dengan ID user yang login
          aktivitas: aktivitas,
          waktu_aktivitas: new Date()
        }])

      alert("Data berhasil disimpan")
      closeModal()
      await fetchAllData()
    } catch (error) {
      console.error("Error saving data:", error)
      alert("Gagal menyimpan data")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (type, id, nama) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${nama}?`)) return

    setLoading(true)
    try {
      let result
      let aktivitas = ""
      
      switch(type) {
        case "user":
          result = await supabase
            .from("tb_user")
            .delete()
            .eq("id_user", id)
          aktivitas = `Menghapus user: ${nama}`
          break
        case "area":
          result = await supabase
            .from("tb_area_parkir")
            .delete()
            .eq("id_area", id)
          aktivitas = `Menghapus area: ${nama}`
          break
        case "tarif":
          result = await supabase
            .from("tb_tarif")
            .delete()
            .eq("id_tarif", id)
          aktivitas = `Menghapus tarif: ${nama}`
          break
        case "kendaraan":
          result = await supabase
            .from("tb_kendaraan")
            .delete()
            .eq("id_kendaraan", id)
          aktivitas = `Menghapus kendaraan: ${nama}`
          break
      }

      if (result.error) throw result.error

      // Log aktivitas
      await supabase
        .from("tb_log_aktivitas")
        .insert([{
          id_user: 1, // Ganti dengan ID user yang login
          aktivitas: aktivitas,
          waktu_aktivitas: new Date()
        }])

      alert("Data berhasil dihapus")
      await fetchAllData()
    } catch (error) {
      console.error("Error deleting data:", error)
      alert("Gagal menghapus data")
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka)
  }

  const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getJenisIcon = (jenis) => {
    switch(jenis?.toLowerCase()) {
      case 'mobil': return <FaCar className="text-blue-500" />
      case 'motor': return <FaMotorcycle className="text-green-500" />
      case 'lainnya': return <FaTruck className="text-orange-500" />
      default: return <FaCar />
    }
  }

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: FaChartBar },
    { id: "users", label: "Kelola User", icon: FaUsers },
    { id: "areas", label: "Area Parkir", icon: FaParking },
    { id: "tarifs", label: "Tarif Parkir", icon: FaMoneyBill },
    { id: "kendaraan", label: "Data Kendaraan", icon: FaCar },
    { id: "logs", label: "Log Aktivitas", icon: FaHistory }
  ]

  if (loading && !showModal) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaParking className="text-2xl" />
              <h1 className="text-xl font-bold">Sistem Parkir - Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-lg">
                <FaUserTie className="text-blue-200" />
                <span className="text-sm">Admin</span>
              </div>
              <button
                onClick={() => router.push("/")}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar dan Konten */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-lg min-h-[calc(100vh-64px)]">
          <nav className="mt-5 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 mt-1 rounded-lg transition duration-200 ${
                    activeTab === item.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={activeTab === item.id ? "text-blue-700" : "text-gray-500"} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Konten Utama */}
        <main className="flex-1 p-8">
          {activeTab === "dashboard" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
              
              {/* Statistik Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Total User</p>
                      <p className="text-xl font-bold text-gray-900">{stats.totalUsers}</p>
                    </div>
                    <FaUsers className="text-2xl text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Area Parkir</p>
                      <p className="text-xl font-bold text-gray-900">{stats.totalArea}</p>
                    </div>
                    <FaParking className="text-2xl text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Total Kendaraan</p>
                      <p className="text-xl font-bold text-gray-900">{stats.totalKendaraan}</p>
                    </div>
                    <FaCar className="text-2xl text-purple-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Kendaraan Aktif</p>
                      <p className="text-xl font-bold text-gray-900">{stats.totalKendaraanAktif}</p>
                    </div>
                    <FaMotorcycle className="text-2xl text-yellow-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Transaksi Hari Ini</p>
                      <p className="text-xl font-bold text-gray-900">{stats.totalTransaksiHariIni}</p>
                    </div>
                    <FaFileAlt className="text-2xl text-indigo-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Pendapatan Hari Ini</p>
                      <p className="text-xl font-bold text-gray-900">{formatRupiah(stats.pendapatanHariIni)}</p>
                    </div>
                    <FaMoneyBill className="text-2xl text-red-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Total Log</p>
                      <p className="text-xl font-bold text-gray-900">{stats.totalLog}</p>
                    </div>
                    <FaHistory className="text-2xl text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Ringkasan Area Parkir */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Area Parkir</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {areas.map(area => (
                    <div key={area.id_area} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">{area.nama_area}</span>
                        <span className="text-sm text-gray-600">
                          {area.terisi}/{area.kapasitas} Terisi
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(area.terisi / area.kapasitas) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Log Terbaru */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Aktivitas Terbaru</h3>
                  <button
                    onClick={() => setActiveTab("logs")}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Lihat Semua
                  </button>
                </div>
                <div className="space-y-3">
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id_log} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                      <FaClock className="text-gray-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{log.aktivitas}</p>
                        <p className="text-xs text-gray-500">
                          {log.tb_user?.nama_lengkap} - {formatDateTime(log.waktu_aktivitas)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Kelola User</h2>
                <button
                  onClick={() => openModal("user")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                  <FaPlus />
                  Tambah User
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Tabel User */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Lengkap</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users
                      .filter(user => 
                        user.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map(user => (
                      <tr key={user.id_user}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id_user}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.nama_lengkap}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{user.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status_aktif 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {user.status_aktif ? "Aktif" : "Tidak Aktif"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => openModal("user", user)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete("user", user.id_user, user.username)}
                            className="text-red-600 hover:text-red-900"
                            title="Hapus"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "areas" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Area Parkir</h2>
                <button
                  onClick={() => openModal("area")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                  <FaPlus />
                  Tambah Area
                </button>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Area</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kapasitas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terisi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tersedia</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {areas.map(area => {
                      const tersedia = area.kapasitas - area.terisi
                      const percentage = (area.terisi / area.kapasitas) * 100
                      return (
                        <tr key={area.id_area}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area.id_area}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area.nama_area}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area.kapasitas}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area.terisi}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tersedia}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  percentage > 80 ? "bg-red-500" : percentage > 50 ? "bg-yellow-500" : "bg-green-500"
                                }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => openModal("area", area)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDelete("area", area.id_area, area.nama_area)}
                              className="text-red-600 hover:text-red-900"
                              title="Hapus"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "tarifs" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Tarif Parkir</h2>
                <button
                  onClick={() => openModal("tarif")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                  <FaPlus />
                  Tambah Tarif
                </button>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis Kendaraan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarif per Jam</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tarifs.map(tarif => (
                      <tr key={tarif.id_tarif}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tarif.id_tarif}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{tarif.jenis_kendaraan}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatRupiah(tarif.tarif_per_jam)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => openModal("tarif", tarif)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete("tarif", tarif.id_tarif, tarif.jenis_kendaraan)}
                            className="text-red-600 hover:text-red-900"
                            title="Hapus"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "kendaraan" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Data Kendaraan</h2>
                <button
                  onClick={() => openModal("kendaraan")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                  <FaPlus />
                  Tambah Kendaraan
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari plat nomor atau pemilik..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plat Nomor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warna</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pemilik</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {kendaraans
                      .filter(k => 
                        k.plat_nomor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        k.pemilik?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map(kendaraan => (
                      <tr key={kendaraan.id_kendaraan}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{kendaraan.id_kendaraan}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{kendaraan.plat_nomor}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getJenisIcon(kendaraan.jenis_kendaraan)}
                            <span className="text-sm text-gray-900 capitalize">{kendaraan.jenis_kendaraan}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{kendaraan.warna || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{kendaraan.pemilik || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => openModal("kendaraan", kendaraan)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete("kendaraan", kendaraan.id_kendaraan, kendaraan.plat_nomor)}
                            className="text-red-600 hover:text-red-900"
                            title="Hapus"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Log Aktivitas</h2>
              
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktivitas</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map(log => (
                        <tr key={log.id_log}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateTime(log.waktu_aktivitas)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.tb_user?.nama_lengkap} ({log.tb_user?.username})
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {log.aktivitas}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex justify-between items-center sticky top-0">
              <h3 className="text-lg font-semibold">
                {editingData ? "Edit" : "Tambah"} {
                  modalType === "user" ? "User" : 
                  modalType === "area" ? "Area Parkir" : 
                  modalType === "tarif" ? "Tarif" : "Kendaraan"
                }
              </h3>
              <button onClick={closeModal} className="text-white hover:text-gray-200">
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {modalType === "user" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nama_lengkap"
                      value={formData.nama_lengkap}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Masukkan nama lengkap"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Masukkan username"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Password {!editingData && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder={editingData ? "Kosongkan jika tidak diubah" : "Masukkan password"}
                      required={!editingData}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    >
                      <option value="admin" className="text-gray-900">Admin</option>
                      <option value="petugas" className="text-gray-900">Petugas</option>
                      <option value="owner" className="text-gray-900">Owner</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="status_aktif"
                      checked={formData.status_aktif}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Status Aktif
                    </label>
                  </div>
                </div>
              )}

              {modalType === "area" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Nama Area <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nama_area"
                      value={formData.nama_area}
                      onChange={handleInputChange}
                      placeholder="Contoh: Area A"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Kapasitas <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="kapasitas"
                      value={formData.kapasitas}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Masukkan kapasitas"
                      required
                    />
                  </div>
                </div>
              )}

              {modalType === "tarif" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Jenis Kendaraan <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="jenis_kendaraan"
                      value={formData.jenis_kendaraan}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    >
                      <option value="motor" className="text-gray-900">Motor</option>
                      <option value="mobil" className="text-gray-900">Mobil</option>
                      <option value="lainnya" className="text-gray-900">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Tarif per Jam (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="tarif_per_jam"
                      value={formData.tarif_per_jam}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Masukkan tarif per jam"
                      required
                    />
                  </div>
                </div>
              )}

              {modalType === "kendaraan" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Plat Nomor <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400">
                        <FaIdCard />
                      </span>
                      <input
                        type="text"
                        name="plat_nomor"
                        value={formData.plat_nomor}
                        onChange={handleInputChange}
                        placeholder="Contoh: B 1234 ABC"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Jenis Kendaraan <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="jenis_kendaraan"
                      value={formData.jenis_kendaraan}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    >
                      <option value="mobil" className="text-gray-900">Mobil</option>
                      <option value="motor" className="text-gray-900">Motor</option>
                      <option value="lainnya" className="text-gray-900">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Warna
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400">
                        <FaPalette />
                      </span>
                      <input
                        type="text"
                        name="warna"
                        value={formData.warna}
                        onChange={handleInputChange}
                        placeholder="Contoh: Hitam"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Pemilik
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400">
                        <FaUser />
                      </span>
                      <input
                        type="text"
                        name="pemilik"
                        value={formData.pemilik}
                        onChange={handleInputChange}
                        placeholder="Nama pemilik"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <FaSave />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}