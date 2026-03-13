"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import {
    FaCar,
    FaMotorcycle,
    FaTruck,
    FaSignInAlt,
    FaSignOutAlt,
    FaSearch,
    FaMoneyBillWave,
    FaClock,
    FaParking,
    FaUserCircle,
    FaHistory,
    FaIdCard,
    FaSave,
    FaTimes,
    FaPrint,
    FaDownload,
    FaQrcode,
    FaCalendarAlt
} from "react-icons/fa"
import { useReactToPrint } from 'react-to-print'

export default function PetugasDashboard() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("masuk")
    const [searchPlate, setSearchPlate] = useState("")

    // State untuk data
    const [areas, setAreas] = useState([])
    const [tarifs, setTarifs] = useState([])
    const [kendaraanAktif, setKendaraanAktif] = useState([])
    const [transaksiHariIni, setTransaksiHariIni] = useState([])
    const [stats, setStats] = useState({
        totalTerisi: 0,
        totalTersedia: 0
    })

    // State untuk form
    const [formData, setFormData] = useState({
        plat_nomor: "",
        jenis_kendaraan: "mobil",
        warna: "",
        pemilik: "",
        id_area: "",
        id_tarif: ""
    })

    // State untuk form keluar
    const [formKeluar, setFormKeluar] = useState({
        jam_keluar: "",
        menit_keluar: "",
        tanggal_keluar: ""
    })

    // State untuk pembayaran dan struk
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showStrukModal, setShowStrukModal] = useState(false)
    const [paymentInfo, setPaymentInfo] = useState({
        id_parkir: null,
        plat_nomor: "",
        jenis_kendaraan: "",
        waktu_masuk: "",
        waktu_keluar: "",
        durasi: 0,
        tarif_per_jam: 0,
        total: 0,
        area: "",
        petugas: "Petugas Shift 1"
    })

    // Ref untuk print struk
    const strukRef = useRef()

    // User session
    const [currentUser, setCurrentUser] = useState({
        id_user: 1,
        nama: "Petugas Shift 1"
    })

    useEffect(() => {
        fetchInitialData()
        // Set default jam keluar ke waktu sekarang
        const now = new Date()
        setFormKeluar({
            jam_keluar: now.getHours().toString().padStart(2, '0'),
            menit_keluar: now.getMinutes().toString().padStart(2, '0'),
            tanggal_keluar: now.toISOString().split('T')[0]
        })
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        await Promise.all([
            fetchAreas(),
            fetchTarifs(),
            fetchKendaraanAktif(),
            fetchTransaksiHariIni()
        ])
        setLoading(false)
    }

    const fetchAreas = async () => {
        try {
            const { data, error } = await supabase
                .from("tb_area_parkir")
                .select("*")
                .order("nama_area", { ascending: true })

            if (error) throw error
            setAreas(data || [])

            const totalTerisi = data?.reduce((sum, area) => sum + area.terisi, 0) || 0
            const totalKapasitas = data?.reduce((sum, area) => sum + area.kapasitas, 0) || 0
            setStats({
                totalTerisi,
                totalTersedia: totalKapasitas - totalTerisi
            })
        } catch (error) {
            console.error("Error fetching areas:", error)
        }
    }

    const fetchTarifs = async () => {
        try {
            const { data, error } = await supabase
                .from("tb_tarif")
                .select("*")
                .order("jenis_kendaraan", { ascending: true })

            if (error) throw error
            setTarifs(data || [])
        } catch (error) {
            console.error("Error fetching tarifs:", error)
        }
    }

    const fetchKendaraanAktif = async () => {
        try {
            const { data, error } = await supabase
                .from("tb_transaksi")
                .select(`
          id_parkir,
          waktu_masuk,
          status,
          id_kendaraan,
          tb_kendaraan (
            plat_nomor,
            jenis_kendaraan,
            warna,
            pemilik
          ),
          id_area,
          tb_area_parkir (
            nama_area
          )
        `)
                .eq("status", "masuk")
                .order("waktu_masuk", { ascending: false })

            if (error) throw error
            setKendaraanAktif(data || [])
        } catch (error) {
            console.error("Error fetching kendaraan aktif:", error)
        }
    }

    const fetchTransaksiHariIni = async () => {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const { data, error } = await supabase
                .from("tb_transaksi")
                .select(`
          id_parkir,
          waktu_masuk,
          waktu_keluar,
          durasi_jam,
          biaya_total,
          status,
          id_kendaraan,
          tb_kendaraan (
            plat_nomor,
            jenis_kendaraan
          )
        `)
                .gte("waktu_masuk", today.toISOString())
                .order("waktu_masuk", { ascending: false })

            if (error) throw error
            setTransaksiHariIni(data || [])
        } catch (error) {
            console.error("Error fetching transaksi hari ini:", error)
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleFormKeluarChange = (e) => {
        const { name, value } = e.target
        setFormKeluar(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleCariKendaraan = async () => {
        if (!searchPlate) return

        try {
            const { data: kendaraan, error: kendaraanError } = await supabase
                .from("tb_kendaraan")
                .select("id_kendaraan, plat_nomor, jenis_kendaraan")
                .ilike("plat_nomor", `%${searchPlate}%`)
                .single()

            if (kendaraanError) throw kendaraanError

            if (kendaraan) {
                const { data: transaksi, error: transaksiError } = await supabase
                    .from("tb_transaksi")
                    .select(`
            id_parkir,
            waktu_masuk,
            id_kendaraan,
            tb_kendaraan (
              plat_nomor,
              jenis_kendaraan
            ),
            id_tarif,
            tb_tarif (
              tarif_per_jam
            ),
            id_area,
            tb_area_parkir (
              nama_area
            )
          `)
                    .eq("id_kendaraan", kendaraan.id_kendaraan)
                    .eq("status", "masuk")
                    .single()

                if (transaksiError) throw transaksiError

                if (transaksi) {
                    // Hitung durasi berdasarkan jam keluar yang diinput
                    const waktuMasuk = new Date(transaksi.waktu_masuk)
                    const waktuKeluar = new Date(`${formKeluar.tanggal_keluar}T${formKeluar.jam_keluar}:${formKeluar.menit_keluar}:00`)

                    // Validasi waktu keluar tidak boleh sebelum waktu masuk
                    if (waktuKeluar < waktuMasuk) {
                        alert("Waktu keluar tidak boleh sebelum waktu masuk")
                        return
                    }

                    const durasiJam = Math.ceil((waktuKeluar - waktuMasuk) / (1000 * 60 * 60))
                    const tarifPerJam = transaksi.tb_tarif?.tarif_per_jam || 0

                    setPaymentInfo({
                        id_parkir: transaksi.id_parkir,
                        plat_nomor: transaksi.tb_kendaraan.plat_nomor,
                        jenis_kendaraan: transaksi.tb_kendaraan.jenis_kendaraan,
                        waktu_masuk: transaksi.waktu_masuk,
                        waktu_keluar: waktuKeluar.toISOString(),
                        durasi: durasiJam,
                        tarif_per_jam: tarifPerJam,
                        total: durasiJam * tarifPerJam,
                        area: transaksi.tb_area_parkir?.nama_area || "-",
                        petugas: currentUser.nama
                    })
                    setShowPaymentModal(true)
                } else {
                    alert("Kendaraan tidak ditemukan atau sudah keluar")
                }
            } else {
                alert("Kendaraan tidak terdaftar")
            }
        } catch (error) {
            console.error("Error searching vehicle:", error)
            alert("Terjadi kesalahan saat mencari kendaraan")
        }
    }

    const handleKendaraanMasuk = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            let id_kendaraan
            const { data: existingKendaraan } = await supabase
                .from("tb_kendaraan")
                .select("id_kendaraan")
                .eq("plat_nomor", formData.plat_nomor)
                .single()

            if (existingKendaraan) {
                id_kendaraan = existingKendaraan.id_kendaraan
            } else {
                const { data: newKendaraan, error: kendaraanError } = await supabase
                    .from("tb_kendaraan")
                    .insert([{
                        plat_nomor: formData.plat_nomor,
                        jenis_kendaraan: formData.jenis_kendaraan,
                        warna: formData.warna,
                        pemilik: formData.pemilik
                    }])
                    .select()

                if (kendaraanError) throw kendaraanError
                id_kendaraan = newKendaraan[0].id_kendaraan
            }

            const { error: transaksiError } = await supabase
                .from("tb_transaksi")
                .insert([{
                    id_kendaraan: id_kendaraan,
                    waktu_masuk: new Date(),
                    id_tarif: formData.id_tarif || null,
                    status: "masuk",
                    id_user: currentUser.id_user,
                    id_area: formData.id_area
                }])

            if (transaksiError) throw transaksiError

            await supabase.rpc('increment_terisi', { area_id: formData.id_area })

            await supabase
                .from("tb_log_aktivitas")
                .insert([{
                    id_user: currentUser.id_user,
                    aktivitas: `Kendaraan masuk: ${formData.plat_nomor}`,
                    waktu_aktivitas: new Date()
                }])

            alert("Kendaraan berhasil masuk")

            setFormData({
                plat_nomor: "",
                jenis_kendaraan: "mobil",
                warna: "",
                pemilik: "",
                id_area: "",
                id_tarif: ""
            })

            await fetchInitialData()
        } catch (error) {
            console.error("Error processing vehicle entry:", error)
            alert("Gagal memproses kendaraan masuk")
        } finally {
            setLoading(false)
        }
    }

    const handlePembayaran = async () => {
        setLoading(true)

        try {
            const { error: updateError } = await supabase
                .from("tb_transaksi")
                .update({
                    waktu_keluar: paymentInfo.waktu_keluar,
                    durasi_jam: paymentInfo.durasi,
                    biaya_total: paymentInfo.total,
                    status: "keluar"
                })
                .eq("id_parkir", paymentInfo.id_parkir)

            if (updateError) throw updateError

            const transaksi = await supabase
                .from("tb_transaksi")
                .select("id_area")
                .eq("id_parkir", paymentInfo.id_parkir)
                .single()

            if (transaksi.data) {
                await supabase.rpc('decrement_terisi', { area_id: transaksi.data.id_area })
            }

            await supabase
                .from("tb_log_aktivitas")
                .insert([{
                    id_user: currentUser.id_user,
                    aktivitas: `Kendaraan keluar: ${paymentInfo.plat_nomor} - Rp ${paymentInfo.total}`,
                    waktu_aktivitas: new Date()
                }])

            // Tutup modal pembayaran dan buka modal struk
            setShowPaymentModal(false)
            setShowStrukModal(true)

            await fetchInitialData()
        } catch (error) {
            console.error("Error processing payment:", error)
            alert("Gagal memproses pembayaran")
        } finally {
            setLoading(false)
        }
    }

    // Fungsi untuk print struk
    const handlePrintStruk = useReactToPrint({
        content: () => strukRef.current,
        documentTitle: `Struk-Parkir-${paymentInfo.plat_nomor}`,
        onAfterPrint: () => {
            setShowStrukModal(false)
        }
    })

    // Fungsi untuk download struk sebagai PDF (simulasi)
    const handleDownloadStruk = () => {
        // Dalam implementasi nyata, ini akan generate PDF
        alert("Fitur download struk akan segera tersedia")
    }

    const getJenisIcon = (jenis) => {
        switch (jenis?.toLowerCase()) {
            case 'mobil': return <FaCar className="text-blue-500" />
            case 'motor': return <FaMotorcycle className="text-green-500" />
            case 'lainnya': return <FaTruck className="text-orange-500" />
            default: return <FaCar />
        }
    }

    const formatDateTime = (datetime) => {
        return new Date(datetime).toLocaleString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const formatTime = (datetime) => {
        return new Date(datetime).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    const formatDate = (datetime) => {
        return new Date(datetime).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    }

    if (loading && !showPaymentModal && !showStrukModal) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Navbar */}
            <nav className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <FaParking className="text-2xl" />
                            <h1 className="text-xl font-bold">Sistem Parkir - Petugas</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-lg">
                                <FaUserCircle className="text-green-200" />
                                <span className="text-sm">{currentUser.nama}</span>
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

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Terisi</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.totalTerisi}</p>
                            </div>
                            <FaCar className="text-3xl text-green-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Tersedia</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.totalTersedia}</p>
                            </div>
                            <FaParking className="text-3xl text-blue-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Transaksi Hari Ini</p>
                                <p className="text-3xl font-bold text-gray-900">{transaksiHariIni.length}</p>
                            </div>
                            <FaHistory className="text-3xl text-purple-500" />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px">
                            <button
                                onClick={() => setActiveTab("masuk")}
                                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === "masuk"
                                        ? "border-green-500 text-green-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <FaSignInAlt />
                                Kendaraan Masuk
                            </button>
                            <button
                                onClick={() => setActiveTab("keluar")}
                                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === "keluar"
                                        ? "border-green-500 text-green-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <FaSignOutAlt />
                                Kendaraan Keluar
                            </button>
                            <button
                                onClick={() => setActiveTab("daftar")}
                                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === "daftar"
                                        ? "border-green-500 text-green-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <FaHistory />
                                Riwayat Hari Ini
                            </button>
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* Tab Kendaraan Masuk */}
                        {activeTab === "masuk" && (
                            <form onSubmit={handleKendaraanMasuk}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-gray-700 text-sm font-semibold mb-2">
                                            Plat Nomor <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-gray-400">
                                                <FaIdCard />
                                            </span>
                                            <input
                                                type="text"
                                                name="plat_nomor"
                                                value={formData.plat_nomor}
                                                onChange={handleInputChange}
                                                placeholder="Contoh: B 1234 ABC"
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
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
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                                            required
                                        >
                                            <option value="mobil" className="text-gray-900">Mobil</option>
                                            <option value="motor" className="text-gray-900">Motor</option>
                                            <option value="lainnya" className="text-gray-900">Lainnya</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 text-sm font-semibold mb-2">
                                            Warna Kendaraan
                                        </label>
                                        <input
                                            type="text"
                                            name="warna"
                                            value={formData.warna}
                                            onChange={handleInputChange}
                                            placeholder="Contoh: Hitam"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 text-sm font-semibold mb-2">
                                            Pemilik
                                        </label>
                                        <input
                                            type="text"
                                            name="pemilik"
                                            value={formData.pemilik}
                                            onChange={handleInputChange}
                                            placeholder="Nama pemilik"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 text-sm font-semibold mb-2">
                                            Area Parkir <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="id_area"
                                            value={formData.id_area}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                                            required
                                        >
                                            <option value="" className="text-gray-500">Pilih Area</option>
                                            {areas
                                                .filter(area => area.terisi < area.kapasitas)
                                                .map(area => (
                                                    <option key={area.id_area} value={area.id_area} className="text-gray-900">
                                                        {area.nama_area} (Tersedia: {area.kapasitas - area.terisi})
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 text-sm font-semibold mb-2">
                                            Tarif (Opsional)
                                        </label>
                                        <select
                                            name="id_tarif"
                                            value={formData.id_tarif}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                                        >
                                            <option value="" className="text-gray-500">Pilih Tarif</option>
                                            {tarifs.map(tarif => (
                                                <option key={tarif.id_tarif} value={tarif.id_tarif} className="text-gray-900">
                                                    {tarif.jenis_kendaraan} - Rp {tarif.tarif_per_jam.toLocaleString()}/jam
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <FaSave />
                                                    Proses Kendaraan Masuk
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* Tab Kendaraan Keluar */}
                        {activeTab === "keluar" && (
                            <div>
                                <div className="mb-6">
                                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                                        Cari Plat Nomor
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-3 text-gray-400">
                                                <FaSearch />
                                            </span>
                                            <input
                                                type="text"
                                                value={searchPlate}
                                                onChange={(e) => setSearchPlate(e.target.value)}
                                                placeholder="Masukkan plat nomor kendaraan"
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Form Input Waktu Keluar - Background Putih */}
                                <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <FaCalendarAlt className="text-green-600" />
                                        Atur Waktu Keluar
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-gray-600 text-sm mb-1">Tanggal Keluar</label>
                                            <input
                                                type="date"
                                                name="tanggal_keluar"
                                                value={formKeluar.tanggal_keluar}
                                                onChange={handleFormKeluarChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-600 text-sm mb-1">Jam Keluar</label>
                                            <input
                                                type="number"
                                                name="jam_keluar"
                                                value={formKeluar.jam_keluar}
                                                onChange={handleFormKeluarChange}
                                                min="0"
                                                max="23"
                                                placeholder="Jam (0-23)"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-600 text-sm mb-1">Menit Keluar</label>
                                            <input
                                                type="number"
                                                name="menit_keluar"
                                                value={formKeluar.menit_keluar}
                                                onChange={handleFormKeluarChange}
                                                min="0"
                                                max="59"
                                                placeholder="Menit (0-59)"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        *Atur tanggal dan jam keluar kendaraan sebelum mencari plat nomor
                                    </p>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Kendaraan Aktif</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {kendaraanAktif.map(item => (
                                            <div key={item.id_parkir} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {getJenisIcon(item.tb_kendaraan?.jenis_kendaraan)}
                                                        <span className="font-semibold text-gray-900">{item.tb_kendaraan?.plat_nomor}</span>
                                                    </div>
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                        {item.tb_area_parkir?.nama_area}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-600">
                                                        <FaClock className="inline mr-1" />
                                                        Masuk: {formatTime(item.waktu_masuk)}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setSearchPlate(item.tb_kendaraan?.plat_nomor)
                                                            handleCariKendaraan()
                                                        }}
                                                        className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-700 transition"
                                                    >
                                                        Proses Keluar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {kendaraanAktif.length === 0 && (
                                            <div className="col-span-full text-center py-8 text-gray-500">
                                                Tidak ada kendaraan aktif
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Riwayat Hari Ini */}
                        {activeTab === "daftar" && (
                            <div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu Masuk</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plat Nomor</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu Keluar</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durasi</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biaya</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {transaksiHariIni.map(item => (
                                                <tr key={item.id_parkir}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatTime(item.waktu_masuk)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {item.tb_kendaraan?.plat_nomor}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="flex items-center gap-2">
                                                            {getJenisIcon(item.tb_kendaraan?.jenis_kendaraan)}
                                                            <span className="capitalize">{item.tb_kendaraan?.jenis_kendaraan}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {item.waktu_keluar ? formatTime(item.waktu_keluar) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {item.durasi_jam ? `${item.durasi_jam} jam` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                        {item.biaya_total ? `Rp ${item.biaya_total.toLocaleString()}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs rounded-full ${item.status === 'masuk'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {item.status === 'masuk' ? 'Masuk' : 'Keluar'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}

                                            {transaksiHariIni.length === 0 && (
                                                <tr>
                                                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                                        Belum ada transaksi hari ini
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Area Parkir */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Area Parkir</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {areas.map(area => {
                            const tersedia = area.kapasitas - area.terisi
                            const percentage = (area.terisi / area.kapasitas) * 100
                            return (
                                <div key={area.id_area} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold text-gray-900">{area.nama_area}</span>
                                        <span className={`text-sm font-medium ${tersedia === 0 ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                            {tersedia} tersedia
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                        <div
                                            className={`h-2.5 rounded-full ${percentage > 80 ? 'bg-red-500' :
                                                    percentage > 50 ? 'bg-yellow-500' :
                                                        'bg-green-500'
                                                }`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>Terisi: {area.terisi}</span>
                                        <span>Total: {area.kapasitas}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Modal Pembayaran */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Detail Pembayaran</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-white hover:text-gray-200">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b">
                                    <span className="text-gray-600">Plat Nomor</span>
                                    <span className="font-semibold text-gray-900">{paymentInfo.plat_nomor}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Jenis Kendaraan</span>
                                    <span className="text-gray-900 capitalize">{paymentInfo.jenis_kendaraan}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Area Parkir</span>
                                    <span className="text-gray-900">{paymentInfo.area}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Waktu Masuk</span>
                                    <span className="text-gray-900">{formatDateTime(paymentInfo.waktu_masuk)}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Waktu Keluar</span>
                                    <span className="text-gray-900">{formatDateTime(paymentInfo.waktu_keluar)}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Durasi</span>
                                    <span className="text-gray-900">{paymentInfo.durasi} Jam</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Tarif per Jam</span>
                                    <span className="text-gray-900">Rp {paymentInfo.tarif_per_jam.toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t text-lg font-bold">
                                    <span className="text-gray-700">Total</span>
                                    <span className="text-green-600">Rp {paymentInfo.total.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handlePembayaran}
                                    disabled={loading}
                                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <FaMoneyBillWave />
                                            Proses Pembayaran
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Struk Parkir */}
            {showStrukModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Struk Parkir</h3>
                            <button onClick={() => setShowStrukModal(false)} className="text-white hover:text-gray-200">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Struk yang bisa di-print */}
                            <div ref={strukRef} className="bg-white p-6 font-mono text-sm border-2 border-gray-200 rounded-lg">
                                <div className="text-center mb-4">
                                    <h4 className="font-bold text-xl text-gray-900">SISTEM PARKIR</h4>
                                    <p className="text-xs text-gray-700">Jl. Contoh No. 123, Jakarta</p>
                                    <p className="text-xs text-gray-700">Telp: (021) 1234-5678</p>
                                </div>

                                <div className="border-t-2 border-b-2 border-gray-400 py-2 mb-2">
                                    <div className="flex justify-between text-gray-900">
                                        <span>No. Transaksi</span>
                                        <span className="font-bold">#{paymentInfo.id_parkir}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-900">
                                        <span>Tanggal</span>
                                        <span>{formatDate(paymentInfo.waktu_keluar)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-900">
                                        <span>Petugas</span>
                                        <span>{paymentInfo.petugas}</span>
                                    </div>
                                </div>

                                <div className="mb-2 text-gray-900">
                                    <div className="flex justify-between">
                                        <span>Plat Nomor</span>
                                        <span className="font-bold">{paymentInfo.plat_nomor}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Jenis</span>
                                        <span className="capitalize">{paymentInfo.jenis_kendaraan}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Area</span>
                                        <span>{paymentInfo.area}</span>
                                    </div>
                                </div>

                                <div className="border-t-2 border-b-2 border-gray-400 py-2 mb-2 text-gray-900">
                                    <div className="flex justify-between">
                                        <span>Waktu Masuk</span>
                                        <span>{formatDateTime(paymentInfo.waktu_masuk)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Waktu Keluar</span>
                                        <span>{formatDateTime(paymentInfo.waktu_keluar)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Durasi</span>
                                        <span>{paymentInfo.durasi} Jam</span>
                                    </div>
                                </div>

                                <div className="mb-4 text-gray-900">
                                    <div className="flex justify-between">
                                        <span>Tarif per Jam</span>
                                        <span>Rp {paymentInfo.tarif_per_jam.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2 mt-2">
                                        <span>TOTAL</span>
                                        <span className="text-green-700">Rp {paymentInfo.total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="text-center text-xs border-t-2 border-gray-400 pt-2 text-gray-700">
                                    <p>Terima kasih telah menggunakan</p>
                                    <p>layanan parkir kami</p>
                                    <div className="flex justify-center mt-2">
                                        <FaQrcode className="text-3xl text-gray-900" />
                                    </div>
                                    <p className="mt-1 text-gray-600">Scan untuk pembayaran online</p>
                                </div>
                            </div>

                            {/* Tombol aksi struk */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleDownloadStruk}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                >
                                    <FaDownload />
                                    Download
                                </button>
                                <button
                                    onClick={handlePrintStruk}
                                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                                >
                                    <FaPrint />
                                    Print
                                </button>
                            </div>
                            <button
                                onClick={() => setShowStrukModal(false)}
                                className="w-full mt-2 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}