"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import {
  FaChartLine,
  FaMoneyBillWave,
  FaCar,
  FaParking,
  FaPrint,
  FaFilePdf,
  FaFileExcel,
  FaChartBar,
  FaUsers,
  FaBuilding,
  FaWallet,
  FaFilter,
  FaFileExport,
  FaSignOutAlt,
  FaMotorcycle,
  FaTruck,
  FaCalendarAlt,
  FaUndo,
  FaExchangeAlt,
  FaList,
} from "react-icons/fa";
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
  ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import id from "date-fns/locale/id";

export default function OwnerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState("week");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [filterJenis, setFilterJenis] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });

  // State untuk data
  const [summary, setSummary] = useState({
    totalPendapatan: 0,
    totalKendaraan: 0,
    rataRataPerHari: 0,
    totalArea: 0,
  });

  const [revenueData, setRevenueData] = useState([]);
  const [vehicleTypeData, setVehicleTypeData] = useState([]);
  const [areaPerformance, setAreaPerformance] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [topAreas, setTopAreas] = useState([]);

  // Ref untuk print
  const reportRef = useRef(null);

  const COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
  ];

  // Fungsi notifikasi
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  // Format tanggal Indonesia
  const formatDateTime = (datetime) => {
    if (!datetime) return "-";
    const utcDate = new Date(datetime);
    if (isNaN(utcDate.getTime())) return "-";
    const wibDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);

    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];

    const dayName = days[wibDate.getDay()];
    const day = wibDate.getDate();
    const month = months[wibDate.getMonth()];
    const year = wibDate.getFullYear();
    const hours = String(wibDate.getHours()).padStart(2, "0");
    const minutes = String(wibDate.getMinutes()).padStart(2, "0");

    return `${dayName}, ${day} ${month} ${year} ${hours}:${minutes}`;
  };

  // Format tanggal untuk display
  const formatDateDisplay = (date) => {
    if (!date) return "";
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const d = new Date(date);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Cek autentikasi
  useEffect(() => {
    const checkAuth = () => {
      try {
        const isLoggedIn = localStorage.getItem("isLoggedIn");
        const savedUser = localStorage.getItem("currentUser");

        if (!isLoggedIn || !savedUser) {
          router.push("/login");
          return;
        }

        const user = JSON.parse(savedUser);

        if (user.role !== "owner") {
          showNotification("Akses ditolak. Anda bukan owner.", "error");
          setTimeout(() => {
            if (user.role === "admin") router.push("/admin");
            else if (user.role === "petugas") router.push("/petugas");
            else router.push("/login");
          }, 1500);
          return;
        }

        setCurrentUser(user);
        setAuthChecking(false);
        fetchReportData();
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  // Auto fetch ketika filter berubah
  useEffect(() => {
    if (!authChecking) {
      fetchReportData();
    }
  }, [dateRange, startDate, endDate, filterJenis]);
  useEffect(() => {
    if (transactions.length > 0) {
      const dateFilter = getDateFilter();
      const startUTC = new Date(
        dateFilter.start.getTime() - 7 * 60 * 60 * 1000,
      );
      const endUTC = new Date(dateFilter.end.getTime() - 7 * 60 * 60 * 1000);

      let filtered = transactions.filter((transaction) => {
        const transDate = new Date(transaction.waktu_masuk);
        return transDate >= startUTC && transDate <= endUTC;
      });

      // Filter berdasarkan jenis kendaraan
      if (filterJenis !== "all") {
        filtered = filtered.filter(
          (transaction) =>
            transaction.tb_kendaraan?.jenis_kendaraan === filterJenis,
        );
      }

      console.log("Filtered transactions:", filtered); // Debug
      setFilteredTransactions(filtered);
    }
  }, [transactions, dateRange, startDate, endDate, filterJenis]);
  const getDateFilter = () => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (dateRange) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };

      case "week":
        start = new Date(now);
        start.setDate(now.getDate() - 6); // 7 hari termasuk hari ini
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };

      case "month":
        start = new Date(now);
        start.setDate(now.getDate() - 29); // 30 hari
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };

      case "year":
        start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };

      case "custom":
        if (startDate && endDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          return { start: s, end: e };
        }
        // Default ke 7 hari terakhir jika custom tidak lengkap
        start = new Date(now);
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };

      default:
        start = new Date(now);
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }
  };

  const fetchReportData = async () => {
    setLoading(true);

    try {
      await Promise.all([
        fetchSummary(),
        fetchRevenueData(),
        fetchVehicleTypeData(),
        fetchAreaPerformance(),
        fetchTransactions(),
      ]);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchSummary = async () => {
    try {
      const dateFilter = getDateFilter();
      const startUTC = new Date(
        dateFilter.start.getTime() - 7 * 60 * 60 * 1000,
      );
      const endUTC = new Date(dateFilter.end.getTime() - 7 * 60 * 60 * 1000);

      // Ambil semua transaksi yang sudah keluar (status keluar)
      const { data: transaksiKeluar } = await supabase
        .from("tb_transaksi")
        .select("biaya_total")
        .eq("status", "keluar")
        .gte("waktu_keluar", startUTC.toISOString())
        .lte("waktu_keluar", endUTC.toISOString());

      const totalPendapatan =
        transaksiKeluar?.reduce(
          (sum, item) => sum + (item.biaya_total || 0),
          0,
        ) || 0;

      // Ambil semua transaksi (termasuk yang masih masuk)
      let countQuery = supabase
        .from("tb_transaksi")
        .select("*", { count: "exact", head: true })
        .gte("waktu_masuk", startUTC.toISOString())
        .lte("waktu_masuk", endUTC.toISOString());

      const { count: totalKendaraan } = await countQuery;

      const { count: totalArea } = await supabase
        .from("tb_area_parkir")
        .select("*", { count: "exact", head: true });

      const hariDiff =
        Math.ceil(
          (dateFilter.end - dateFilter.start) / (1000 * 60 * 60 * 24),
        ) || 1;
      const rataRataPerHari = totalPendapatan / hariDiff;

      console.log("Summary data:", {
        totalPendapatan,
        totalKendaraan,
        totalArea,
        rataRataPerHari,
      }); // Debug

      setSummary({
        totalPendapatan,
        totalKendaraan: totalKendaraan || 0,
        rataRataPerHari,
        totalArea: totalArea || 0,
      });
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const fetchRevenueData = async () => {
    try {
      const dateFilter = getDateFilter();
      const startUTC = new Date(
        dateFilter.start.getTime() - 7 * 60 * 60 * 1000,
      );
      const endUTC = new Date(dateFilter.end.getTime() - 7 * 60 * 60 * 1000);

      let query = supabase
        .from("tb_transaksi")
        .select(
          "waktu_keluar, biaya_total, tb_kendaraan!inner(jenis_kendaraan)",
        )
        .gte("waktu_keluar", startUTC.toISOString())
        .lte("waktu_keluar", endUTC.toISOString())
        .eq("status", "keluar")
        .order("waktu_keluar", { ascending: true });

      if (filterJenis !== "all") {
        query = query.eq("tb_kendaraan.jenis_kendaraan", filterJenis);
      }

      const { data, error } = await query;

      if (error) throw error;

      const groupedData = {};
      data?.forEach((item) => {
        const wibDate = new Date(
          new Date(item.waktu_keluar).getTime() + 7 * 60 * 60 * 1000,
        );
        const date = wibDate.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
        });
        if (!groupedData[date]) {
          groupedData[date] = { name: date, pendapatan: 0, kendaraan: 0 };
        }
        groupedData[date].pendapatan += item.biaya_total || 0;
        groupedData[date].kendaraan += 1;
      });

      setRevenueData(Object.values(groupedData));
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    }
  };
  const fetchVehicleTypeData = async () => {
    try {
      const dateFilter = getDateFilter();
      const startUTC = new Date(
        dateFilter.start.getTime() - 7 * 60 * 60 * 1000,
      );
      const endUTC = new Date(dateFilter.end.getTime() - 7 * 60 * 60 * 1000);

      // Ambil semua transaksi dengan join ke tb_kendaraan
      const { data, error } = await supabase
        .from("tb_transaksi")
        .select(
          `
        id_kendaraan,
        tb_kendaraan (
          jenis_kendaraan
        )
      `,
        )
        .gte("waktu_masuk", startUTC.toISOString())
        .lte("waktu_masuk", endUTC.toISOString());

      if (error) throw error;

      console.log("Vehicle data:", data); // Debug

      const groupedData = {};
      data?.forEach((item) => {
        const jenis = item.tb_kendaraan?.jenis_kendaraan || "lainnya";
        const displayName =
          jenis === "motor" ? "Motor" : jenis === "mobil" ? "Mobil" : "Lainnya";

        if (!groupedData[jenis]) {
          groupedData[jenis] = { name: displayName, value: 0 };
        }
        groupedData[jenis].value += 1;
      });

      const result = Object.values(groupedData);
      console.log("Vehicle type data:", result); // Debug
      setVehicleTypeData(result);
    } catch (error) {
      console.error("Error fetching vehicle type data:", error);
    }
  };

  const fetchAreaPerformance = async () => {
    try {
      const dateFilter = getDateFilter();
      const startUTC = new Date(
        dateFilter.start.getTime() - 7 * 60 * 60 * 1000,
      );
      const endUTC = new Date(dateFilter.end.getTime() - 7 * 60 * 60 * 1000);

      const { data: areas, error: areasError } = await supabase
        .from("tb_area_parkir")
        .select("*");

      if (areasError) throw areasError;

      const performance = await Promise.all(
        areas.map(async (area) => {
          let query = supabase
            .from("tb_transaksi")
            .select("biaya_total, tb_kendaraan!inner(jenis_kendaraan)")
            .eq("id_area", area.id_area)
            .eq("status", "keluar")
            .gte("waktu_keluar", startUTC.toISOString())
            .lte("waktu_keluar", endUTC.toISOString());

          if (filterJenis !== "all") {
            query = query.eq("tb_kendaraan.jenis_kendaraan", filterJenis);
          }

          const { data: transaksi } = await query;

          const pendapatan =
            transaksi?.reduce(
              (sum, item) => sum + (item.biaya_total || 0),
              0,
            ) || 0;

          return {
            ...area,
            pendapatan,
          };
        }),
      );

      setAreaPerformance(performance);

      const top5 = [...performance]
        .sort((a, b) => b.pendapatan - a.pendapatan)
        .slice(0, 5);
      setTopAreas(top5);
    } catch (error) {
      console.error("Error fetching area performance:", error);
    }
  };
  const fetchTransactions = async () => {
    try {
      // Ambil semua transaksi tanpa filter waktu dulu
      const { data, error } = await supabase
        .from("tb_transaksi")
        .select(
          `
        id_parkir,
        waktu_masuk,
        waktu_keluar,
        durasi_jam,
        biaya_total,
        status,
        id_kendaraan,
        id_area,
        tb_kendaraan (
          plat_nomor,
          jenis_kendaraan,
          warna,
          pemilik
        ),
        tb_area_parkir (
          nama_area
        )
      `,
        )
        .order("waktu_masuk", { ascending: false });

      if (error) throw error;

      console.log("All transactions:", data); // Debug
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };
  const formatRupiah = (angka) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const formatDate = (date) => {
    if (!date) return "-";
    const wibDate = new Date(new Date(date).getTime() + 7 * 60 * 60 * 1000);
    return wibDate.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateForExport = (date) => {
    if (!date) return "";
    const wibDate = new Date(new Date(date).getTime() + 7 * 60 * 60 * 1000);
    return wibDate.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDateRangeText = () => {
    const filter = getDateFilter();
    const start = formatDateDisplay(filter.start);
    const end = formatDateDisplay(filter.end);

    switch (dateRange) {
      case "today":
        return `Hari Ini (${start})`;
      case "week":
        return `7 Hari Terakhir (${start} - ${end})`;
      case "month":
        return `30 Hari Terakhir (${start} - ${end})`;
      case "year":
        return `Tahun Ini (${start} - ${end})`;
      case "custom":
        return `${start} - ${end}`;
      default:
        return `${start} - ${end}`;
    }
  };

  const resetFilters = () => {
    setDateRange("week");
    setStartDate(null);
    setEndDate(null);
    setFilterJenis("all");
    showNotification("Filter direset ke 7 hari terakhir", "success");
  };

  // Validasi tanggal
  const handleStartDateChange = (date) => {
    setStartDate(date);
    if (endDate && date > endDate) {
      setEndDate(null);
      showNotification(
        "Tanggal mulai tidak boleh lebih besar dari tanggal akhir",
        "error",
      );
    }
  };

  const handleEndDateChange = (date) => {
    if (startDate && date < startDate) {
      showNotification(
        "Tanggal akhir tidak boleh kurang dari tanggal mulai",
        "error",
      );
      return;
    }
    setEndDate(date);
  };

  // Export ke Excel dengan auto fit column
  const handleExportExcel = () => {
    setExporting(true);
    try {
      const data = [];

      // Header
      data.push(["REKAP TRANSAKSI SISTEM PARKIR"]);
      data.push([]);
      data.push(["Periode:", getDateRangeText()]);
      data.push([
        "Jenis Kendaraan:",
        filterJenis === "all"
          ? "Semua Jenis"
          : filterJenis === "motor"
            ? "Motor"
            : filterJenis === "mobil"
              ? "Mobil"
              : "Lainnya",
      ]);
      data.push([
        "Tanggal Export:",
        new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      ]);
      data.push([]);

      // Ringkasan
      data.push(["RINGKASAN"]);
      data.push(["Total Pendapatan", formatRupiah(summary.totalPendapatan)]);
      data.push(["Total Kendaraan", summary.totalKendaraan.toString()]);
      data.push(["Rata-rata per Hari", formatRupiah(summary.rataRataPerHari)]);
      data.push([]);

      // Data Transaksi
      data.push(["DATA TRANSAKSI"]);
      data.push([
        "No",
        "Tanggal Masuk",
        "Tanggal Keluar",
        "Plat Nomor",
        "Jenis Kendaraan",
        "Area Parkir",
        "Durasi (Jam)",
        "Biaya",
        "Status",
      ]);

      filteredTransactions.forEach((item, index) => {
        data.push([
          (index + 1).toString(),
          formatDateForExport(item.waktu_masuk),
          item.waktu_keluar ? formatDateForExport(item.waktu_keluar) : "-",
          item.tb_kendaraan?.plat_nomor || "-",
          item.tb_kendaraan?.jenis_kendaraan || "-",
          item.tb_area_parkir?.nama_area || "-",
          item.durasi_jam ? item.durasi_jam.toString() : "-",
          item.biaya_total ? formatRupiah(item.biaya_total) : "-",
          item.status === "masuk" ? "Masuk" : "Keluar",
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);

      // Hitung lebar maksimum untuk setiap kolom
      const maxWidths = [];
      data.forEach((row) => {
        row.forEach((cell, colIndex) => {
          if (cell) {
            const cellLength = String(cell).length;
            if (!maxWidths[colIndex] || cellLength > maxWidths[colIndex]) {
              maxWidths[colIndex] = Math.min(cellLength + 2, 50); // Maksimal 50 karakter
            }
          }
        });
      });

      // Set lebar kolom berdasarkan panjang teks maksimal
      ws["!cols"] = maxWidths.map((width) => ({ wch: width }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Transaksi");
      XLSX.writeFile(
        wb,
        `Rekap_Transaksi_${new Date().toISOString().split("T")[0]}.xlsx`,
      );

      showNotification("Rekap transaksi berhasil diexport ke Excel", "success");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      showNotification("Gagal mengexport rekap transaksi", "error");
    } finally {
      setExporting(false);
    }
  };

  // Print ke PDF
  const handlePrintPdf = () => {
    if (!reportRef.current) return;

    setExporting(true);
    try {
      const originalTitle = document.title;
      document.title = `Rekap_Transaksi_${new Date().toISOString().split("T")[0]}`;

      window.print();

      setTimeout(() => {
        document.title = originalTitle;
        setExporting(false);
      }, 1000);
    } catch (error) {
      console.error("Error printing:", error);
      showNotification("Gagal mencetak rekap transaksi", "error");
      setExporting(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("isLoggedIn");
      showNotification("Berhasil keluar", "success");
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch (error) {
      console.error("Logout error:", error);
      showNotification("Gagal keluar", "error");
    }
  };

  const getJenisIcon = (jenis) => {
    switch (jenis?.toLowerCase()) {
      case "mobil":
        return <FaCar className="text-blue-500" />;
      case "motor":
        return <FaMotorcycle className="text-green-500" />;
      case "lainnya":
        return <FaTruck className="text-orange-500" />;
      default:
        return <FaCar />;
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Notifikasi */}
      {notification.show && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${
            notification.type === "success" ? "bg-green-500" : "bg-red-500"
          } animate-slide-in-right`}
        >
          {notification.message}
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaBuilding className="text-2xl" />
              <h1 className="text-xl font-bold">
                Sistem Parkir - Beranda Owner
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-lg">
                <FaUsers className="text-purple-200" />
                <span className="text-sm">
                  {currentUser?.nama_lengkap || "Owner"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
              >
                <FaSignOutAlt />
                Keluar
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content untuk Print */}
      <div ref={reportRef}>
        {/* Header untuk Print */}
        <div className="hidden print:block text-center mb-8">
          <h1 className="text-2xl font-bold">Rekap Transaksi Sistem Parkir</h1>
          <p>Periode: {getDateRangeText()}</p>
          <p>
            Jenis Kendaraan:{" "}
            {filterJenis === "all"
              ? "Semua Jenis"
              : filterJenis === "motor"
                ? "Motor"
                : filterJenis === "mobil"
                  ? "Mobil"
                  : "Lainnya"}
          </p>
          <p>
            Tanggal Cetak:{" "}
            {new Date().toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Laporan & Analitik
                </h2>
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
                    <option value="today">Hari Ini</option>
                    <option value="week">7 Hari Terakhir</option>
                    <option value="month">30 Hari Terakhir</option>
                    <option value="year">Tahun Ini</option>
                    <option value="custom">Kustom</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <FaList className="text-gray-400" />
                  <select
                    value={filterJenis}
                    onChange={(e) => setFilterJenis(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  >
                    <option value="all">Semua Jenis</option>
                    <option value="motor">Motor</option>
                    <option value="mobil">Mobil</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>

                {dateRange === "custom" && (
                  <div className="flex items-center gap-2">
                    <DatePicker
                      selected={startDate}
                      onChange={handleStartDateChange}
                      dateFormat="dd MMMM yyyy"
                      locale={id}
                      placeholderText="Tanggal Mulai"
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                    <span className="text-gray-600">-</span>
                    <DatePicker
                      selected={endDate}
                      onChange={handleEndDateChange}
                      dateFormat="dd MMMM yyyy"
                      locale={id}
                      placeholderText="Tanggal Akhir"
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      minDate={startDate}
                    />
                  </div>
                )}

                {(dateRange !== "week" ||
                  startDate ||
                  endDate ||
                  filterJenis !== "all") && (
                  <button
                    onClick={resetFilters}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
                  >
                    <FaUndo />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
              <FaFileExport className="text-gray-500" />
              <span className="text-sm text-gray-600">
                Export Rekap Transaksi:
              </span>
              <button
                onClick={handlePrintPdf}
                disabled={exporting}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition flex items-center gap-1 disabled:opacity-50"
              >
                {exporting ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FaFilePdf />
                )}
                PDF
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition flex items-center gap-1 disabled:opacity-50"
              >
                {exporting ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FaFileExcel />
                )}
                Excel
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:grid-cols-2">
            <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Pendapatan</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatRupiah(summary.totalPendapatan)}
                  </p>
                </div>
                <FaMoneyBillWave className="text-2xl text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Kendaraan</p>
                  <p className="text-lg font-bold text-gray-900">
                    {summary.totalKendaraan}
                  </p>
                </div>
                <FaCar className="text-2xl text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Rata-rata per Hari</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatRupiah(summary.rataRataPerHari)}
                  </p>
                </div>
                <FaWallet className="text-2xl text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Area</p>
                  <p className="text-lg font-bold text-gray-900">
                    {summary.totalArea}
                  </p>
                </div>
                <FaParking className="text-2xl text-red-500" />
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:grid-cols-1">
            <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Tren Pendapatan
              </h3>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: "#374151" }} />
                    <YAxis tick={{ fill: "#374151" }} />
                    <Tooltip formatter={(value) => formatRupiah(value)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="pendapatan"
                      stroke="#3B82F6"
                      name="Pendapatan"
                    />
                    <Line
                      type="monotone"
                      dataKey="kendaraan"
                      stroke="#10B981"
                      name="Kendaraan"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Tidak ada data
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Komposisi Jenis Kendaraan
              </h3>
              {vehicleTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={vehicleTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {vehicleTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Tidak ada data
                </div>
              )}
            </div>
          </div>

          {/* Area Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 print:grid-cols-1">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Performa Area Parkir
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Area
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Kapasitas
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Terisi
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Pendapatan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {areaPerformance.map((area) => (
                      <tr key={area.id_area}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {area.nama_area}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {area.kapasitas}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {area.terisi}
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

            <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Top 5 Area by Revenue
              </h3>
              <div className="space-y-4">
                {topAreas.length > 0 ? (
                  topAreas.map((area, index) => (
                    <div
                      key={area.id_area}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : index === 1
                                ? "bg-gray-100 text-gray-700"
                                : index === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900">
                          {area.nama_area}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatRupiah(area.pendapatan)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Tidak ada data
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transaksi - Mengikuti Filter */}
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Rekap Transaksi
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FaExchangeAlt />
                <span>{filteredTransactions.length} transaksi ditemukan</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Waktu Masuk
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Waktu Keluar
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Plat Nomor
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Jenis
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Area
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Durasi
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Biaya
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.slice(0, 20).map((item) => (
                      <tr key={item.id_parkir}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatDate(item.waktu_masuk)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.waktu_keluar
                            ? formatDate(item.waktu_keluar)
                            : "-"}
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
                          {item.durasi_jam ? `${item.durasi_jam} jam` : "-"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                          {item.biaya_total
                            ? formatRupiah(item.biaya_total)
                            : "-"}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              item.status === "masuk"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {item.status === "masuk" ? "Masuk" : "Keluar"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-8 text-gray-500"
                      >
                        Tidak ada transaksi pada periode yang dipilih
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }

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
          .print\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
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
  );
}
