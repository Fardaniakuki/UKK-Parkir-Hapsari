"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { 
  FaChartLine, 
  FaMoneyBillWave, 
  FaCar, 
  FaParking,
  FaDownload,
  FaPrint,
  FaFilePdf,
  FaFileExcel,
  FaChartBar,
  FaUsers,
  FaBuilding,
  FaWallet,
  FaHistory,
  FaFilter,
  FaFileExport
} from "react-icons/fa"
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { useReactToPrint } from 'react-to-print'

export default function OwnerDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [dateRange, setDateRange] = useState("week")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  
  // State untuk data
  const [summary, setSummary] = useState({
    totalPendapatan: 0,
    totalKendaraan: 0,
    rataRataPerHari: 0,
    okupansiRataRata: 0,
    totalUser: 0,
    totalArea: 0
  })

  const [revenueData, setRevenueData] = useState([])
  const [vehicleTypeData, setVehicleTypeData] = useState([])
  const [areaPerformance, setAreaPerformance] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [topAreas, setTopAreas] = useState([])

  // Ref untuk print
  const reportRef = useRef()

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  useEffect(() => {
    fetchReportData()
  }, [dateRange, startDate, endDate])

  const fetchReportData = async () => {
    setLoading(true)

    try {
      await Promise.all([
        fetchSummary(),
        fetchRevenueData(),
        fetchVehicleTypeData(),
        fetchAreaPerformance(),
        fetchRecentTransactions()
      ])
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getDateFilter = () => {
    const now = new Date()
    let start = new Date()

    switch(dateRange) {
      case "today":
        start.setHours(0, 0, 0, 0)
        return { start, end: now }
      
      case "week":
        start.setDate(now.getDate() - 7)
        return { start, end: now }
      
      case "month":
        start.setMonth(now.getMonth() - 1)
        return { start, end: now }
      
      case "year":
        start.setFullYear(now.getFullYear() - 1)
        return { start, end: now }
      
      case "custom":
        return {
          start: startDate ? new Date(startDate) : new Date(now.setMonth(now.getMonth() - 1)),
          end: endDate ? new Date(endDate) : now
        }
      
      default:
        start.setDate(now.getDate() - 7)
        return { start, end: now }
    }
  }

  const fetchSummary = async () => {
    try {
      const dateFilter = getDateFilter()

      const { data: pendapatanData } = await supabase
        .from("tb_transaksi")
        .select("biaya_total")
        .gte("waktu_keluar", dateFilter.start.toISOString())
        .lte("waktu_keluar", dateFilter.end.toISOString())
        .eq("status", "keluar")

      const totalPendapatan = pendapatanData?.reduce((sum, item) => sum + (item.biaya_total || 0), 0) || 0

      const { count: totalKendaraan } = await supabase
        .from("tb_transaksi")
        .select("*", { count: 'exact', head: true })
        .gte("waktu_masuk", dateFilter.start.toISOString())
        .lte("waktu_masuk", dateFilter.end.toISOString())

      const { count: totalUser } = await supabase
        .from("tb_user")
        .select("*", { count: 'exact', head: true })

      const { count: totalArea } = await supabase
        .from("tb_area_parkir")
        .select("*", { count: 'exact', head: true })

      const hariDiff = Math.ceil((dateFilter.end - dateFilter.start) / (1000 * 60 * 60 * 24)) || 1
      const rataRataPerHari = totalPendapatan / hariDiff

      const { data: areas } = await supabase
        .from("tb_area_parkir")
        .select("kapasitas, terisi")

      const totalKapasitas = areas?.reduce((sum, area) => sum + area.kapasitas, 0) || 0
      const totalTerisi = areas?.reduce((sum, area) => sum + area.terisi, 0) || 0
      const okupansiRataRata = totalKapasitas > 0 ? (totalTerisi / totalKapasitas) * 100 : 0

      setSummary({
        totalPendapatan,
        totalKendaraan: totalKendaraan || 0,
        rataRataPerHari,
        okupansiRataRata,
        totalUser: totalUser || 0,
        totalArea: totalArea || 0
      })
    } catch (error) {
      console.error("Error fetching summary:", error)
    }
  }

  const fetchRevenueData = async () => {
    try {
      const dateFilter = getDateFilter()
      
      const { data, error } = await supabase
        .from("tb_transaksi")
        .select("waktu_keluar, biaya_total")
        .gte("waktu_keluar", dateFilter.start.toISOString())
        .lte("waktu_keluar", dateFilter.end.toISOString())
        .eq("status", "keluar")
        .order("waktu_keluar", { ascending: true })

      if (error) throw error

      const groupedData = {}
      data?.forEach(item => {
        const date = new Date(item.waktu_keluar).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
        if (!groupedData[date]) {
          groupedData[date] = { name: date, pendapatan: 0, kendaraan: 0 }
        }
        groupedData[date].pendapatan += item.biaya_total || 0
        groupedData[date].kendaraan += 1
      })

      setRevenueData(Object.values(groupedData))
    } catch (error) {
      console.error("Error fetching revenue data:", error)
    }
  }

  const fetchVehicleTypeData = async () => {
    try {
      const dateFilter = getDateFilter()

      const { data, error } = await supabase
        .from("tb_transaksi")
        .select(`
          id_kendaraan,
          tb_kendaraan (
            jenis_kendaraan
          )
        `)
        .gte("waktu_masuk", dateFilter.start.toISOString())
        .lte("waktu_masuk", dateFilter.end.toISOString())

      if (error) throw error

      const groupedData = {}
      data?.forEach(item => {
        const jenis = item.tb_kendaraan?.jenis_kendaraan || 'lainnya'
        if (!groupedData[jenis]) {
          groupedData[jenis] = { name: jenis, value: 0 }
        }
        groupedData[jenis].value += 1
      })

      setVehicleTypeData(Object.values(groupedData))
    } catch (error) {
      console.error("Error fetching vehicle type data:", error)
    }
  }

  const fetchAreaPerformance = async () => {
    try {
      const dateFilter = getDateFilter()

      const { data: areas, error: areasError } = await supabase
        .from("tb_area_parkir")
        .select("*")

      if (areasError) throw areasError

      const performance = await Promise.all(areas.map(async (area) => {
        const { data: transaksi } = await supabase
          .from("tb_transaksi")
          .select("biaya_total")
          .eq("id_area", area.id_area)
          .eq("status", "keluar")
          .gte("waktu_keluar", dateFilter.start.toISOString())
          .lte("waktu_keluar", dateFilter.end.toISOString())

        const pendapatan = transaksi?.reduce((sum, item) => sum + (item.biaya_total || 0), 0) || 0
        const okupansi = (area.terisi / area.kapasitas) * 100

        return {
          ...area,
          pendapatan,
          okupansi
        }
      }))

      setAreaPerformance(performance)

      const top5 = [...performance]
        .sort((a, b) => b.pendapatan - a.pendapatan)
        .slice(0, 5)
      setTopAreas(top5)
    } catch (error) {
      console.error("Error fetching area performance:", error)
    }
  }

  const fetchRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_transaksi")
        .select(`
          id_parkir,
          waktu_masuk,
          waktu_keluar,
          durasi_jam,
          biaya_total,
          status,
          tb_kendaraan (
            plat_nomor,
            jenis_kendaraan
          ),
          tb_area_parkir (
            nama_area
          )
        `)
        .order("waktu_masuk", { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentTransactions(data || [])
    } catch (error) {
      console.error("Error fetching recent transactions:", error)
    }
  }

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateForExport = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getDateRangeText = () => {
    const filter = getDateFilter()
    const start = formatDateForExport(filter.start)
    const end = formatDateForExport(filter.end)
    
    switch(dateRange) {
      case "today": return `Hari Ini (${start})`
      case "week": return `7 Hari Terakhir (${start} - ${end})`
      case "month": return `30 Hari Terakhir (${start} - ${end})`
      case "year": return `Tahun Ini (${start} - ${end})`
      case "custom": return `Kustom (${start} - ${end})`
      default: return `${start} - ${end}`
    }
  }

  // Fungsi Export ke Excel (CSV)
  const handleExportExcel = () => {
    setExporting(true)
    try {
      // Data untuk diexport
      const exportData = [
        // Summary Data
        ['LAPORAN SISTEM PARKIR'],
        [`Periode: ${getDateRangeText()}`],
        [`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`],
        [],
        ['RINGKASAN'],
        ['Total Pendapatan', formatRupiah(summary.totalPendapatan)],
        ['Total Kendaraan', summary.totalKendaraan],
        ['Rata-rata per Hari', formatRupiah(summary.rataRataPerHari)],
        ['Okupansi Rata-rata', `${summary.okupansiRataRata.toFixed(1)}%`],
        ['Total User', summary.totalUser],
        ['Total Area', summary.totalArea],
        [],
        ['PERFORMA AREA PARKIR'],
        ['Area', 'Kapasitas', 'Terisi', 'Okupansi', 'Pendapatan']
      ]

      // Add area performance data
      areaPerformance.forEach(area => {
        exportData.push([
          area.nama_area,
          area.kapasitas,
          area.terisi,
          `${area.okupansi.toFixed(1)}%`,
          formatRupiah(area.pendapatan)
        ])
      })

      exportData.push([], ['TRANSAKSI TERBARU'])
      exportData.push(['No', 'Waktu', 'Plat Nomor', 'Jenis', 'Area', 'Durasi', 'Biaya', 'Status'])

      // Add transaction data
      recentTransactions.forEach((item, index) => {
        exportData.push([
          index + 1,
          formatDate(item.waktu_masuk),
          item.tb_kendaraan?.plat_nomor || '-',
          item.tb_kendaraan?.jenis_kendaraan || '-',
          item.tb_area_parkir?.nama_area || '-',
          item.durasi_jam ? `${item.durasi_jam} jam` : '-',
          item.biaya_total ? formatRupiah(item.biaya_total) : '-',
          item.status === 'masuk' ? 'Masuk' : 'Keluar'
        ])
      })

      // Convert to CSV
      const csvContent = exportData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')

      // Download file
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.setAttribute('download', `laporan_parkir_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      alert('Laporan berhasil diexport ke Excel (CSV)')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Gagal mengexport laporan')
    } finally {
      setExporting(false)
    }
  }

  // Fungsi Export ke PDF (print to PDF)
  const handlePrintPdf = useReactToPrint({
    content: () => reportRef.current,
    documentTitle: `Laporan_Parkir_${new Date().toISOString().split('T')[0]}`,
    onBeforePrint: () => setExporting(true),
    onAfterPrint: () => setExporting(false),
    onPrintError: () => {
      alert('Gagal mencetak laporan')
      setExporting(false)
    }
  })

  // Fungsi Print biasa
  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg print:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaBuilding className="text-2xl" />
              <h1 className="text-xl font-bold">Sistem Parkir - Owner Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4 print:hidden">
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-lg">
                <FaUsers className="text-purple-200" />
                <span className="text-sm">Owner</span>
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

      {/* Main Content untuk Print */}
      <div ref={reportRef}>
        {/* Header untuk Print */}
        <div className="hidden print:block text-center mb-8">
          <h1 className="text-2xl font-bold">Laporan Sistem Parkir</h1>
          <p>Periode: {getDateRangeText()}</p>
          <p>Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter Section - Hidden saat print */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Laporan & Analitik</h2>
                <p className="text-gray-600 mt-1">Ringkasan kinerja parkir</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <FaFilter className="text-gray-400" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  >
                    <option value="today" className="text-gray-900">Hari Ini</option>
                    <option value="week" className="text-gray-900">7 Hari Terakhir</option>
                    <option value="month" className="text-gray-900">30 Hari Terakhir</option>
                    <option value="year" className="text-gray-900">Tahun Ini</option>
                    <option value="custom" className="text-gray-900">Kustom</option>
                  </select>
                </div>

                {dateRange === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                    <span className="text-gray-600">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                  </div>
                )}

                <button
                  onClick={fetchReportData}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                >
                  <FaChartLine />
                  Terapkan
                </button>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
              <FaFileExport className="text-gray-500" />
              <span className="text-sm text-gray-600">Export Laporan:</span>
              <button
                onClick={handlePrintPdf}
                disabled={exporting}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition flex items-center gap-1 disabled:opacity-50"
              >
                {exporting ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <FaFilePdf />}
                PDF
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition flex items-center gap-1 disabled:opacity-50"
              >
                {exporting ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <FaFileExcel />}
                Excel
              </button>
              <button
                onClick={handlePrint}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition flex items-center gap-1"
              >
                <FaPrint />
                Print
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 print:grid-cols-3">
            <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Pendapatan</p>
                  <p className="text-lg font-bold text-gray-900">{formatRupiah(summary.totalPendapatan)}</p>
                </div>
                <FaMoneyBillWave className="text-2xl text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Kendaraan</p>
                  <p className="text-lg font-bold text-gray-900">{summary.totalKendaraan}</p>
                </div>
                <FaCar className="text-2xl text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Rata-rata/Hari</p>
                  <p className="text-lg font-bold text-gray-900">{formatRupiah(summary.rataRataPerHari)}</p>
                </div>
                <FaWallet className="text-2xl text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Okupansi</p>
                  <p className="text-lg font-bold text-gray-900">{summary.okupansiRataRata.toFixed(1)}%</p>
                </div>
                <FaChartBar className="text-2xl text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total User</p>
                  <p className="text-lg font-bold text-gray-900">{summary.totalUser}</p>
                </div>
                <FaUsers className="text-2xl text-indigo-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Area</p>
                  <p className="text-lg font-bold text-gray-900">{summary.totalArea}</p>
                </div>
                <FaParking className="text-2xl text-red-500" />
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:grid-cols-1">
            {/* Grafik Pendapatan */}
            <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Tren Pendapatan</h3>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: '#374151' }} />
                    <YAxis tick={{ fill: '#374151' }} />
                    <Tooltip 
                      formatter={(value) => formatRupiah(value)}
                      contentStyle={{ color: '#111827' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="pendapatan" stroke="#3B82F6" name="Pendapatan" />
                    <Line type="monotone" dataKey="kendaraan" stroke="#10B981" name="Kendaraan" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-12">Tidak ada data untuk ditampilkan</div>
              )}
            </div>

            {/* Grafik Jenis Kendaraan */}
            <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Komposisi Jenis Kendaraan</h3>
              {vehicleTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={vehicleTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {vehicleTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ color: '#111827' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-12">Tidak ada data untuk ditampilkan</div>
              )}
            </div>
          </div>

          {/* Top Performing Areas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 print:grid-cols-1">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Performa Area Parkir</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kapasitas</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Terisi</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Okupansi</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {areaPerformance.map(area => (
                      <tr key={area.id_area}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{area.nama_area}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{area.kapasitas}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{area.terisi}</td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  area.okupansi > 80 ? 'bg-red-500' : 
                                  area.okupansi > 50 ? 'bg-yellow-500' : 
                                  'bg-green-500'
                                }`}
                                style={{ width: `${area.okupansi}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-900">{area.okupansi.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                          {formatRupiah(area.pendapatan)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top 5 Areas by Revenue */}
            <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Area by Revenue</h3>
              <div className="space-y-4">
                {topAreas.length > 0 ? topAreas.map((area, index) => (
                  <div key={area.id_area} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{area.nama_area}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatRupiah(area.pendapatan)}
                    </span>
                  </div>
                )) : (
                  <div className="text-center text-gray-500 py-8">Tidak ada data</div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Transaksi Terbaru</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plat Nomor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Durasi</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Biaya</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentTransactions.length > 0 ? recentTransactions.map(item => (
                    <tr key={item.id_parkir}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {formatDate(item.waktu_masuk)}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {item.tb_kendaraan?.plat_nomor}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 capitalize">
                        {item.tb_kendaraan?.jenis_kendaraan}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {item.tb_area_parkir?.nama_area}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {item.durasi_jam ? `${item.durasi_jam} jam` : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                        {item.biaya_total ? formatRupiah(item.biaya_total) : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'masuk' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status === 'masuk' ? 'Masuk' : 'Keluar'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-500">
                        Belum ada transaksi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Print CSS untuk menyembunyikan elemen yang tidak diperlukan saat print */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:grid-cols-1 {
            grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          }
          .print\\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border {
            border-width: 1px !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          body {
            background: white;
            padding: 20px;
          }
          button {
            display: none !important;
          }
          nav {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}