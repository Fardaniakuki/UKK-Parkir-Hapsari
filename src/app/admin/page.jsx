"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
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
  FaFileAlt,
  FaSignOutAlt,
  FaCalendarAlt,
  FaFilter,
  FaUndo,
  FaCalendarWeek,
  FaFileExcel,
  FaDownload,
  FaUserCircle,
  FaChartLine,
} from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import id from "date-fns/locale/id";
import * as XLSX from "xlsx";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [exporting, setExporting] = useState(false);

  // State untuk filter logs
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [filterUser, setFilterUser] = useState("all");
  const [filterRoleLog, setFilterRoleLog] = useState("all");
  const [showFilter, setShowFilter] = useState(false);

  // State untuk filter kendaraan
  const [filterJenisKendaraan, setFilterJenisKendaraan] = useState("all");
  const [filterAreaKendaraan, setFilterAreaKendaraan] = useState("all");

  // State untuk filter user berdasarkan role
  const [filterRole, setFilterRole] = useState("all");

  // State untuk data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalArea: 0,
    totalKendaraan: 0,
    totalKendaraanAktif: 0,
    totalTransaksiHariIni: 0,
    pendapatanHariIni: 0,
    totalLog: 0,
  });

  // State untuk CRUD
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [tarifs, setTarifs] = useState([]);
  const [kendaraans, setKendaraans] = useState([]);
  const [filteredKendaraans, setFilteredKendaraans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [modalType, setModalType] = useState("");

  // Form state
  const [formData, setFormData] = useState({
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
    pemilik: "",
    id_area: "",
    id_tarif: "",
  });

  // Fungsi untuk menampilkan notifikasi
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  // Format tanggal Indonesia dengan koreksi UTC ke WIB
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
    const seconds = String(wibDate.getSeconds()).padStart(2, "0");

    return `${dayName}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
  };

  // Format date only
  const formatDateOnly = (date) => {
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

  // Format time only
  const formatTimeOnly = (datetime) => {
    if (!datetime) return "-";
    const date = new Date(datetime);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Filter logs berdasarkan rentang waktu, user, dan role
  useEffect(() => {
    let filtered = [...logs];

    // Filter berdasarkan rentang waktu
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const startUTC = new Date(start.getTime() - 7 * 60 * 60 * 1000);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const endUTC = new Date(end.getTime() - 7 * 60 * 60 * 1000);

      filtered = filtered.filter((log) => {
        const logDate = new Date(log.waktu_aktivitas);
        return logDate >= startUTC && logDate <= endUTC;
      });
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const startUTC = new Date(start.getTime() - 7 * 60 * 60 * 1000);
      const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);

      filtered = filtered.filter((log) => {
        const logDate = new Date(log.waktu_aktivitas);
        return logDate >= startUTC && logDate < endUTC;
      });
    }

    // Filter berdasarkan user
    if (filterUser !== "all") {
      filtered = filtered.filter((log) => log.id_user === parseInt(filterUser));
    }

    // Filter berdasarkan role
    if (filterRoleLog !== "all") {
      filtered = filtered.filter((log) => log.tb_user?.role === filterRoleLog);
    }

    setFilteredLogs(filtered);
  }, [logs, startDate, endDate, filterUser, filterRoleLog]);

  // Filter users berdasarkan role
  useEffect(() => {
    let filtered = [...users];

    if (filterRole !== "all") {
      filtered = filtered.filter((user) => user.role === filterRole);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredUsers(filtered);
  }, [users, filterRole, searchTerm]);

  // Filter kendaraan berdasarkan jenis dan area
  useEffect(() => {
    let filtered = [...kendaraans];

    if (filterJenisKendaraan !== "all") {
      filtered = filtered.filter(
        (k) => k.jenis_kendaraan === filterJenisKendaraan,
      );
    }

    if (filterAreaKendaraan !== "all") {
      filtered = filtered.filter(
        (k) => k.id_area === parseInt(filterAreaKendaraan),
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (k) =>
          k.plat_nomor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          k.pemilik?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredKendaraans(filtered);
  }, [kendaraans, filterJenisKendaraan, filterAreaKendaraan, searchTerm]);

  // Reset filter logs
  const resetLogFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setFilterUser("all");
    setFilterRoleLog("all");
    showNotification("Filter log direset", "success");
  };

  // Reset filter user
  const resetUserFilters = () => {
    setFilterRole("all");
    setSearchTerm("");
    showNotification("Filter pengguna direset", "success");
  };

  // Reset filter kendaraan
  const resetKendaraanFilters = () => {
    setFilterJenisKendaraan("all");
    setFilterAreaKendaraan("all");
    setSearchTerm("");
    showNotification("Filter kendaraan direset", "success");
  };

  // Export log ke Excel
  const handleExportLogs = () => {
    setExporting(true);
    try {
      const data = [];

      data.push(["LOG AKTIVITAS SISTEM PARKIR"]);
      data.push([
        `Periode: ${startDate ? formatDateOnly(startDate) : "Semua"} - ${
          endDate ? formatDateOnly(endDate) : "Semua"
        }`,
      ]);
      data.push([
        `Tanggal Export: ${new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      ]);
      data.push([]);

      data.push(["DATA LOG"]);
      data.push(["No", "Waktu", "Pengguna", "Peran", "Aktivitas"]);

      filteredLogs.forEach((log, index) => {
        data.push([
          index + 1,
          formatDateTime(log.waktu_aktivitas),
          `${log.tb_user?.nama_lengkap} (${log.tb_user?.username})`,
          log.tb_user?.role === "admin"
            ? "Administrator"
            : log.tb_user?.role === "petugas"
            ? "Petugas"
            : "Pemilik",
          log.aktivitas,
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [
        { wch: 8 },
        { wch: 35 },
        { wch: 30 },
        { wch: 15 },
        { wch: 60 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Log Aktivitas");
      XLSX.writeFile(
        wb,
        `Log_Aktivitas_${new Date().toISOString().split("T")[0]}.xlsx`
      );

      showNotification("Log aktivitas berhasil diexport ke Excel", "success");
    } catch (error) {
      console.error("Error exporting logs:", error);
      showNotification("Gagal mengexport log aktivitas", "error");
    } finally {
      setExporting(false);
    }
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

        if (user.role !== "admin") {
          showNotification("Akses ditolak. Anda bukan admin.", "error");
          setTimeout(() => {
            if (user.role === "petugas") router.push("/petugas");
            else if (user.role === "owner") router.push("/owner");
            else router.push("/login");
          }, 1500);
          return;
        }

        setCurrentUser(user);
        setAuthChecking(false);
        fetchAllData();
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchAreas(),
      fetchTarifs(),
      fetchKendaraans(),
      fetchLogs(),
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const { count: usersCount } = await supabase
        .from("tb_user")
        .select("*", { count: "exact", head: true });

      const { count: areasCount } = await supabase
        .from("tb_area_parkir")
        .select("*", { count: "exact", head: true });

      const { count: kendaraanCount } = await supabase
        .from("tb_kendaraan")
        .select("*", { count: "exact", head: true });

      const { count: aktifCount } = await supabase
        .from("tb_transaksi")
        .select("*", { count: "exact", head: true })
        .eq("status", "masuk");

      const { count: logCount } = await supabase
        .from("tb_log_aktivitas")
        .select("*", { count: "exact", head: true });

      const today = new Date();
      const wibToday = new Date(today.getTime() + 7 * 60 * 60 * 1000);
      wibToday.setHours(0, 0, 0, 0);
      const startOfDayUTC = new Date(wibToday.getTime() - 7 * 60 * 60 * 1000);

      const { data: transaksiHariIni } = await supabase
        .from("tb_transaksi")
        .select("biaya_total")
        .gte("waktu_masuk", startOfDayUTC.toISOString())
        .eq("status", "keluar");

      const pendapatan =
        transaksiHariIni?.reduce(
          (sum, item) => sum + (item.biaya_total || 0),
          0
        ) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalArea: areasCount || 0,
        totalKendaraan: kendaraanCount || 0,
        totalKendaraanAktif: aktifCount || 0,
        totalTransaksiHariIni: transaksiHariIni?.length || 0,
        pendapatanHariIni: pendapatan,
        totalLog: logCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_user")
        .select("*")
        .order("id_user", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchAreas = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_area_parkir")
        .select("*")
        .order("id_area", { ascending: true });

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error("Error fetching areas:", error);
    }
  };

  const fetchTarifs = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_tarif")
        .select("*")
        .order("id_tarif", { ascending: true });

      if (error) throw error;
      setTarifs(data || []);
    } catch (error) {
      console.error("Error fetching tarifs:", error);
    }
  };

  const fetchKendaraans = async () => {
    try {
      const { data: kendaraanData, error: kendaraanError } = await supabase
        .from("tb_kendaraan")
        .select("*")
        .order("id_kendaraan", { ascending: false });

      if (kendaraanError) throw kendaraanError;

      const kendaraanWithAreaData = await Promise.all(
        (kendaraanData || []).map(async (kendaraan) => {
          const { data: transaksi } = await supabase
            .from("tb_transaksi")
            .select(
              `
            id_area,
            tb_area_parkir (
              nama_area
            )
          `
            )
            .eq("id_kendaraan", kendaraan.id_kendaraan)
            .order("waktu_masuk", { ascending: false })
            .limit(1)
            .single();

          return {
            ...kendaraan,
            area: transaksi?.tb_area_parkir?.nama_area || "-",
            id_area: transaksi?.id_area || null,
          };
        })
      );

      setKendaraans(kendaraanWithAreaData);
      setFilteredKendaraans(kendaraanWithAreaData);
    } catch (error) {
      console.error("Error fetching kendaraans:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_log_aktivitas")
        .select(
          `
          id_log,
          aktivitas,
          waktu_aktivitas,
          id_user,
          tb_user (
            id_user,
            nama_lengkap,
            username,
            role
          )
        `
        )
        .order("waktu_aktivitas", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
      setFilteredLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const getTarifByJenis = (jenisKendaraan) => {
    const tarif = tarifs.find((item) => item.jenis_kendaraan === jenisKendaraan);
    return tarif?.id_tarif || null;
  };

  const openModal = (type, data = null) => {
    setModalType(type);
    if (data) {
      setEditingData(data);
      setFormData(data);
    } else {
      setEditingData(null);
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
        pemilik: "",
        id_area: "",
        id_tarif: "",
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      let aktivitas = "";

      switch (modalType) {
        case "user":
          if (editingData) {
            const updateData = {
              nama_lengkap: formData.nama_lengkap,
              username: formData.username,
              role: formData.role,
              status_aktif: formData.status_aktif,
            };
            if (formData.password) {
              updateData.password = formData.password;
            }
            result = await supabase
              .from("tb_user")
              .update(updateData)
              .eq("id_user", editingData.id_user);
            aktivitas = `Mengupdate pengguna: ${formData.username}`;
          } else {
            result = await supabase.from("tb_user").insert([
              {
                nama_lengkap: formData.nama_lengkap,
                username: formData.username,
                password: formData.password,
                role: formData.role,
                status_aktif: formData.status_aktif,
              },
            ]);
            aktivitas = `Menambah pengguna baru: ${formData.username}`;
          }
          break;

        case "area":
          if (editingData) {
            result = await supabase
              .from("tb_area_parkir")
              .update({
                nama_area: formData.nama_area,
                kapasitas: parseInt(formData.kapasitas),
              })
              .eq("id_area", editingData.id_area);
            aktivitas = `Mengupdate area: ${formData.nama_area}`;
          } else {
            result = await supabase.from("tb_area_parkir").insert([
              {
                nama_area: formData.nama_area,
                kapasitas: parseInt(formData.kapasitas),
                terisi: 0,
              },
            ]);
            aktivitas = `Menambah area baru: ${formData.nama_area}`;
          }
          break;

        case "tarif":
          if (editingData) {
            result = await supabase
              .from("tb_tarif")
              .update({
                jenis_kendaraan: formData.jenis_kendaraan,
                tarif_per_jam: parseInt(formData.tarif_per_jam),
              })
              .eq("id_tarif", editingData.id_tarif);
            aktivitas = `Mengupdate tarif ${formData.jenis_kendaraan}`;
          } else {
            result = await supabase.from("tb_tarif").insert([
              {
                jenis_kendaraan: formData.jenis_kendaraan,
                tarif_per_jam: parseInt(formData.tarif_per_jam),
              },
            ]);
            aktivitas = `Menambah tarif baru: ${formData.jenis_kendaraan}`;
          }
          break;

        case "kendaraan":
          if (editingData) {
            result = await supabase
              .from("tb_kendaraan")
              .update({
                plat_nomor: formData.plat_nomor,
                jenis_kendaraan: formData.jenis_kendaraan,
                warna: formData.warna,
                pemilik: formData.pemilik,
                id_user: currentUser?.id,
              })
              .eq("id_kendaraan", editingData.id_kendaraan);
            aktivitas = `Mengupdate kendaraan: ${formData.plat_nomor}`;
          } else {
            if (!formData.id_area) {
              throw new Error("Pilih area parkir terlebih dahulu");
            }

            const selectedArea = areas.find(
              (area) => area.id_area === parseInt(formData.id_area)
            );

            if (!selectedArea) {
              throw new Error("Area parkir tidak ditemukan");
            }

            if (selectedArea.terisi >= selectedArea.kapasitas) {
              throw new Error("Area parkir yang dipilih sudah penuh");
            }

            const tarifId =
              formData.id_tarif || getTarifByJenis(formData.jenis_kendaraan);

            if (!tarifId) {
              throw new Error("Tarif untuk jenis kendaraan ini belum tersedia");
            }

            const { data: existingKendaraan, error: existingKendaraanError } =
              await supabase
                .from("tb_kendaraan")
                .select("id_kendaraan")
                .eq("plat_nomor", formData.plat_nomor)
                .maybeSingle();

            if (existingKendaraanError) throw existingKendaraanError;

            let kendaraanId = existingKendaraan?.id_kendaraan;

            if (kendaraanId) {
              const { data: activeTransaksi, error: activeTransaksiError } =
                await supabase
                  .from("tb_transaksi")
                  .select("id_parkir")
                  .eq("id_kendaraan", kendaraanId)
                  .eq("status", "masuk")
                  .maybeSingle();

              if (activeTransaksiError) throw activeTransaksiError;

              if (activeTransaksi) {
                throw new Error("Kendaraan ini masih tercatat sedang parkir");
              }

              result = await supabase
                .from("tb_kendaraan")
                .update({
                  jenis_kendaraan: formData.jenis_kendaraan,
                  warna: formData.warna,
                  pemilik: formData.pemilik,
                  id_user: currentUser?.id,
                })
                .eq("id_kendaraan", kendaraanId);
            } else {
              result = await supabase
                .from("tb_kendaraan")
                .insert([
                  {
                    plat_nomor: formData.plat_nomor,
                    jenis_kendaraan: formData.jenis_kendaraan,
                    warna: formData.warna,
                    pemilik: formData.pemilik,
                    id_user: currentUser?.id,
                  },
                ])
                .select()
                .single();

              kendaraanId = result.data?.id_kendaraan;
            }

            if (result.error) throw result.error;

            const { error: transaksiError } = await supabase
              .from("tb_transaksi")
              .insert([
                {
                  id_kendaraan: kendaraanId,
                  waktu_masuk: new Date().toISOString(),
                  id_tarif: tarifId,
                  status: "masuk",
                  id_user: currentUser?.id,
                  id_area: parseInt(formData.id_area),
                },
              ]);

            if (transaksiError) throw transaksiError;

            const { error: incrementError } = await supabase.rpc(
              "increment_terisi",
              { area_id: parseInt(formData.id_area) }
            );

            if (incrementError) throw incrementError;

            aktivitas = `Menambah kendaraan masuk: ${formData.plat_nomor} ke ${selectedArea.nama_area}`;
          }
          break;
      }

      if (result.error) throw result.error;

      if (currentUser) {
        await supabase.from("tb_log_aktivitas").insert([
          {
            id_user: currentUser.id,
            aktivitas: aktivitas,
            waktu_aktivitas: new Date().toISOString(),
          },
        ]);
      }

      showNotification("Data berhasil disimpan!", "success");
      closeModal();
      await fetchAllData();
    } catch (error) {
      console.error("Error saving data:", error);
      showNotification("Gagal menyimpan data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type, id, nama) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${nama}?`)) return;

    setLoading(true);
    try {
      let result;
      let aktivitas = "";

      switch (type) {
        case "user":
          result = await supabase.from("tb_user").delete().eq("id_user", id);
          aktivitas = `Menghapus pengguna: ${nama}`;
          break;
        case "area":
          result = await supabase
            .from("tb_area_parkir")
            .delete()
            .eq("id_area", id);
          aktivitas = `Menghapus area: ${nama}`;
          break;
        case "tarif":
          result = await supabase.from("tb_tarif").delete().eq("id_tarif", id);
          aktivitas = `Menghapus tarif: ${nama}`;
          break;
        case "kendaraan":
          result = await supabase
            .from("tb_kendaraan")
            .delete()
            .eq("id_kendaraan", id);
          aktivitas = `Menghapus kendaraan: ${nama}`;
          break;
      }

      if (result.error) throw result.error;

      if (currentUser) {
        await supabase.from("tb_log_aktivitas").insert([
          {
            id_user: currentUser.id,
            aktivitas: aktivitas,
            waktu_aktivitas: new Date().toISOString(),
          },
        ]);
      }

      showNotification("Data berhasil dihapus!", "success");
      await fetchAllData();
    } catch (error) {
      console.error("Error deleting data:", error);
      showNotification("Gagal menghapus data: " + error.message, "error");
    } finally {
      setLoading(false);
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

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
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

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "petugas":
        return "bg-blue-100 text-blue-800";
      case "owner":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "petugas":
        return "Petugas";
      case "owner":
        return "Pemilik";
      default:
        return role;
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Beranda", icon: FaChartBar },
    { id: "users", label: "Kelola Pengguna", icon: FaUsers },
    { id: "areas", label: "Area Parkir", icon: FaParking },
    { id: "tarifs", label: "Tarif Parkir", icon: FaMoneyBill },
    { id: "kendaraan", label: "Data Kendaraan", icon: FaCar },
    { id: "logs", label: "Log Aktivitas", icon: FaHistory },
  ];

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Notifikasi di kanan bawah */}
      {notification.show && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${
            notification.type === "success" ? "bg-green-500" : "bg-red-500"
          } animate-slide-in-right`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? "✓" : "✗"}
            {notification.message}
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaParking className="text-2xl" />
              <h1 className="text-xl font-bold">
                Sistem Parkir - Beranda Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-lg">
                <FaUserTie className="text-blue-200" />
                <span className="text-sm">
                  {currentUser?.nama_lengkap || "Admin"}
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

      {/* Sidebar dan Konten */}
      <div className="flex">
        <aside className="w-64 bg-white shadow-lg min-h-[calc(100vh-64px)]">
          <nav className="mt-5 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
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
                  <Icon
                    className={
                      activeTab === item.id ? "text-blue-700" : "text-gray-500"
                    }
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {/* Beranda Tab */}
          {activeTab === "dashboard" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Beranda</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">
                        Total Pengguna
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {stats.totalUsers}
                      </p>
                    </div>
                    <FaUsers className="text-2xl text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">
                        Area Parkir
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {stats.totalArea}
                      </p>
                    </div>
                    <FaParking className="text-2xl text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">
                        Total Kendaraan
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {stats.totalKendaraan}
                      </p>
                    </div>
                    <FaCar className="text-2xl text-purple-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">
                        Kendaraan Aktif
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {stats.totalKendaraanAktif}
                      </p>
                    </div>
                    <FaMotorcycle className="text-2xl text-yellow-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">
                        Transaksi Hari Ini
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {stats.totalTransaksiHariIni}
                      </p>
                    </div>
                    <FaFileAlt className="text-2xl text-indigo-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">
                        Pendapatan Hari Ini
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatRupiah(stats.pendapatanHariIni)}
                      </p>
                    </div>
                    <FaMoneyBill className="text-2xl text-red-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">
                        Total Log
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {stats.totalLog}
                      </p>
                    </div>
                    <FaHistory className="text-2xl text-gray-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Status Area Parkir
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {areas.map((area) => (
                    <div key={area.id_area} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">
                          {area.nama_area}
                        </span>
                        <span className="text-sm text-gray-600">
                          {area.terisi}/{area.kapasitas} Terisi
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(area.terisi / area.kapasitas) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Aktivitas Terbaru
                  </h3>
                  <button
                    onClick={() => setActiveTab("logs")}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Lihat Semua
                  </button>
                </div>
                <div className="space-y-3">
                  {filteredLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id_log}
                      className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded"
                    >
                      <FaClock className="text-gray-400 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{log.aktivitas}</p>
                        <p className="text-xs text-gray-500">
                          {log.tb_user?.nama_lengkap} -{" "}
                          {formatDateTime(log.waktu_aktivitas)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Kelola Pengguna Tab */}
          {activeTab === "users" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Kelola Pengguna
                </h2>
                <button
                  onClick={() => openModal("user")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                  <FaPlus />
                  Tambah Pengguna
                </button>
              </div>

              <div className="mb-4 flex gap-4">
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari pengguna..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="all">Semua Peran</option>
                  <option value="admin">Administrator</option>
                  <option value="petugas">Petugas</option>
                  <option value="owner">Pemilik</option>
                </select>

                {(filterRole !== "all" || searchTerm) && (
                  <button
                    onClick={resetUserFilters}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
                  >
                    <FaUndo />
                    Reset
                  </button>
                )}
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Nama Lengkap
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Nama Pengguna
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Peran
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id_user}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.id_user}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.nama_lengkap}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${getRoleBadge(
                                user.role
                              )}`}
                            >
                              {getRoleName(user.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.status_aktif
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
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
                              onClick={() =>
                                handleDelete("user", user.id_user, user.username)
                              }
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
            </div>
          )}

          {/* Area Parkir Tab */}
          {activeTab === "areas" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Area Parkir
                </h2>
                <button
                  onClick={() => openModal("area")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                  <FaPlus />
                  Tambah Area
                </button>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Nama Area
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Kapasitas
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Terisi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tersedia
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {areas.map((area) => {
                        const tersedia = area.kapasitas - area.terisi;
                        const percentage = (area.terisi / area.kapasitas) * 100;
                        return (
                          <tr key={area.id_area}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {area.id_area}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {area.nama_area}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {area.kapasitas}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {area.terisi}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {tersedia}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    percentage > 80
                                      ? "bg-red-500"
                                      : percentage > 50
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
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
                                onClick={() =>
                                  handleDelete(
                                    "area",
                                    area.id_area,
                                    area.nama_area
                                  )
                                }
                                className="text-red-600 hover:text-red-900"
                                title="Hapus"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tarif Parkir Tab */}
          {activeTab === "tarifs" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Tarif Parkir
                </h2>
                <button
                  onClick={() => openModal("tarif")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                  <FaPlus />
                  Tambah Tarif
                </button>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Jenis Kendaraan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tarif per Jam
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tarifs.map((tarif) => (
                        <tr key={tarif.id_tarif}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tarif.id_tarif}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {tarif.jenis_kendaraan}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatRupiah(tarif.tarif_per_jam)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => openModal("tarif", tarif)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(
                                  "tarif",
                                  tarif.id_tarif,
                                  tarif.jenis_kendaraan
                                )
                              }
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
            </div>
          )}

          {/* Data Kendaraan Tab */}
          {activeTab === "kendaraan" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Data Kendaraan
                </h2>
                <button
                  onClick={() => openModal("kendaraan")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                  <FaPlus />
                  Tambah Kendaraan
                </button>
              </div>

              {/* Filter */}
              <div className="mb-4 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] relative">
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari plat nomor atau pemilik..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <select
                  value={filterJenisKendaraan}
                  onChange={(e) => setFilterJenisKendaraan(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="all">Semua Jenis</option>
                  <option value="mobil">Mobil</option>
                  <option value="motor">Motor</option>
                  <option value="lainnya">Lainnya</option>
                </select>

                <select
                  value={filterAreaKendaraan}
                  onChange={(e) => setFilterAreaKendaraan(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="all">Semua Area</option>
                  {areas.map((area) => (
                    <option key={area.id_area} value={area.id_area}>
                      {area.nama_area}
                    </option>
                  ))}
                </select>

                {(filterJenisKendaraan !== "all" ||
                  filterAreaKendaraan !== "all" ||
                  searchTerm) && (
                  <button
                    onClick={resetKendaraanFilters}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
                  >
                    <FaUndo />
                    Reset
                  </button>
                )}
              </div>

              {/* Tabel Data Kendaraan */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Plat Nomor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Jenis
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Warna
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Pemilik
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Area Terakhir
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredKendaraans.length === 0 ? (
                        <tr>
                          <td
                            colSpan="7"
                            className="px-6 py-8 text-center text-gray-500"
                          >
                            Tidak ada data kendaraan
                          </td>
                        </tr>
                      ) : (
                        filteredKendaraans.map((kendaraan, index) => (
                          <tr key={kendaraan.id_kendaraan}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {kendaraan.plat_nomor}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getJenisIcon(kendaraan.jenis_kendaraan)}
                                <span className="text-sm text-gray-900 capitalize">
                                  {kendaraan.jenis_kendaraan}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {kendaraan.warna || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {kendaraan.pemilik || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                {kendaraan.area}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={() => openModal("kendaraan", kendaraan)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete(
                                    "kendaraan",
                                    kendaraan.id_kendaraan,
                                    kendaraan.plat_nomor
                                  )
                                }
                                className="text-red-600 hover:text-red-900"
                                title="Hapus"
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Log Aktivitas Tab - Enhanced */}
          {activeTab === "logs" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Log Aktivitas
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Riwayat aktivitas pengguna dalam sistem
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportLogs}
                    disabled={exporting}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-sm"
                  >
                    {exporting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FaFileExcel />
                    )}
                    Export Excel
                  </button>
                  <button
                    onClick={() => setShowFilter(!showFilter)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm ${
                      showFilter
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    <FaFilter />
                    Filter
                  </button>
                </div>
              </div>

              {/* Panel Filter yang lebih bagus */}
              {showFilter && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                    <FaFilter className="text-blue-500" />
                    <h3 className="font-semibold text-gray-800">
                      Filter Data
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <FaCalendarAlt className="inline mr-2" />
                        Tanggal Mulai
                      </label>
                      <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        dateFormat="dd MMMM yyyy"
                        locale={id}
                        placeholderText="Pilih tanggal mulai"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        isClearable
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <FaCalendarWeek className="inline mr-2" />
                        Tanggal Akhir
                      </label>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        dateFormat="dd MMMM yyyy"
                        locale={id}
                        placeholderText="Pilih tanggal akhir"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        isClearable
                        minDate={startDate}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <FaUser className="inline mr-2" />
                        Filter Pengguna
                      </label>
                      <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="all">Semua Pengguna</option>
                        {users.map((user) => (
                          <option key={user.id_user} value={user.id_user}>
                            {user.nama_lengkap} ({user.username})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <FaUserTie className="inline mr-2" />
                        Filter Peran
                      </label>
                      <select
                        value={filterRoleLog}
                        onChange={(e) => setFilterRoleLog(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="all">Semua Peran</option>
                        <option value="admin">Administrator</option>
                        <option value="petugas">Petugas</option>
                        <option value="owner">Pemilik</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={resetLogFilters}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
                    >
                      <FaUndo />
                      Reset Filter
                    </button>
                  </div>

                  {/* Info filter aktif */}
                  {(startDate || endDate || filterUser !== "all" ||
                    filterRoleLog !== "all") && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <strong>Filter aktif:</strong>
                        {startDate && ` Tanggal: ${formatDateOnly(startDate)}`}
                        {endDate && ` - ${formatDateOnly(endDate)}`}
                        {filterUser !== "all" &&
                          ` Pengguna: ${
                            users.find(
                              (u) => u.id_user === parseInt(filterUser)
                            )?.nama_lengkap
                          }`}
                        {filterRoleLog !== "all" &&
                          ` Peran: ${
                            filterRoleLog === "admin"
                              ? "Administrator"
                              : filterRoleLog === "petugas"
                              ? "Petugas"
                              : "Pemilik"
                          }`}
                        <span className="ml-2 text-blue-600 font-medium">
                          ({filteredLogs.length} data ditemukan)
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tabel Log Aktivitas dengan desain lebih bagus */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Waktu
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Pengguna
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Peran
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Aktivitas
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-6 py-12 text-center text-gray-500"
                          >
                            <div className="flex flex-col items-center gap-2">
                              <FaHistory className="text-4xl text-gray-300" />
                              <p>Tidak ada data log untuk filter yang dipilih</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log, index) => (
                          <tr
                            key={log.id_log}
                            className={`hover:bg-gray-50 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <FaClock className="text-gray-400 text-xs" />
                                <span className="text-sm text-gray-700">
                                  {formatDateTime(log.waktu_aktivitas)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <FaUserCircle className="text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {log.tb_user?.nama_lengkap}
                                  </p>
                                  
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleBadge(
                                  log.tb_user?.role
                                )}`}
                              >
                                {getRoleName(log.tb_user?.role)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-700">
                                {log.aktivitas}
                              </p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer dengan info jumlah data */}
                {filteredLogs.length > 0 && (
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Menampilkan {filteredLogs.length} dari {logs.length} data
                      log
                    </p>
                  </div>
                )}
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
                {editingData ? "Edit" : "Tambah"}{" "}
                {modalType === "user"
                  ? "Pengguna"
                  : modalType === "area"
                  ? "Area Parkir"
                  : modalType === "tarif"
                  ? "Tarif"
                  : "Kendaraan"}
              </h3>
              <button
                onClick={closeModal}
                className="text-white hover:text-gray-200"
              >
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
                      Nama Pengguna <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Masukkan nama pengguna"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Kata Sandi{" "}
                      {!editingData && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder={
                        editingData
                          ? "Kosongkan jika tidak diubah"
                          : "Masukkan kata sandi"
                      }
                      required={!editingData}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Peran <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    >
                      <option value="admin">Administrator</option>
                      <option value="petugas">Petugas</option>
                      <option value="owner">Pemilik</option>
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
                      <option value="motor">Motor</option>
                      <option value="mobil">Mobil</option>
                      <option value="lainnya">Lainnya</option>
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
                      <option value="mobil">Mobil</option>
                      <option value="motor">Motor</option>
                      <option value="lainnya">Lainnya</option>
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

                  {!editingData && (
                    <>
                      <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-2">
                          Area Parkir <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="id_area"
                          value={formData.id_area}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          required
                        >
                          <option value="">Pilih Area</option>
                          {areas
                            .filter((area) => area.terisi < area.kapasitas)
                            .map((area) => (
                              <option key={area.id_area} value={area.id_area}>
                                {area.nama_area} (Tersedia:{" "}
                                {area.kapasitas - area.terisi})
                              </option>
                            ))}
                        </select>
                      </div>

                      <p className="text-xs text-gray-500">
                        Saat disimpan, kendaraan akan langsung dicatat sebagai
                        kendaraan masuk dan muncul di halaman petugas.
                      </p>
                    </>
                  )}
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
      `}</style>
    </div>
  );
}
