"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
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
  FaCalendarAlt,
  FaSignOutAlt as FaLogout,
  FaEdit,
  FaUser,
  FaFilter,
  FaUndo,
  FaPalette,
  FaReceipt,
} from "react-icons/fa";

export default function PetugasDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("masuk");
  const [searchPlate, setSearchPlate] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [editWaktuKeluar, setEditWaktuKeluar] = useState(false);

  // Filter untuk riwayat
  const [filterJenis, setFilterJenis] = useState("all");
  const [filterPetugas, setFilterPetugas] = useState("all");
  const [filterAreaRiwayat, setFilterAreaRiwayat] = useState("all");
  const [showFilterRiwayat, setShowFilterRiwayat] = useState(false);

  // Filter untuk kendaraan keluar
  const [filterKeluarTanggal, setFilterKeluarTanggal] = useState("");
  const [filterKeluarJamMulai, setFilterKeluarJamMulai] = useState("");
  const [filterKeluarJamSelesai, setFilterKeluarJamSelesai] = useState("");
  const [filterKeluarArea, setFilterKeluarArea] = useState("all");
  const [searchPlateKeluar, setSearchPlateKeluar] = useState("");
  const [showFilterKeluar, setShowFilterKeluar] = useState(false);

  // State untuk data
  const [areas, setAreas] = useState([]);
  const [tarifs, setTarifs] = useState([]);
  const [kendaraanAktif, setKendaraanAktif] = useState([]);
  const [filteredKendaraanAktif, setFilteredKendaraanAktif] = useState([]);
  const [transaksiHariIni, setTransaksiHariIni] = useState([]);
  const [filteredTransaksi, setFilteredTransaksi] = useState([]);
  const [stats, setStats] = useState({
    totalTerisi: 0,
    totalTersedia: 0,
  });

  // State untuk form
  const [formData, setFormData] = useState({
    plat_nomor: "",
    jenis_kendaraan: "mobil",
    warna: "",
    pemilik: "",
    id_area: "",
    id_tarif: "",
  });

  // State untuk form keluar
  const [formKeluar, setFormKeluar] = useState({
    jam_keluar: "",
    menit_keluar: "",
    tanggal_keluar: "",
  });

  // State untuk pembayaran dan struk
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStrukModal, setShowStrukModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({
    id_parkir: null,
    plat_nomor: "",
    jenis_kendaraan: "",
    warna: "",
    pemilik: "",
    waktu_masuk: "",
    waktu_keluar: "",
    durasi: 0,
    tarif_per_jam: 0,
    total: 0,
    area: "",
    petugas: "",
    petugas_masuk: "",
  });

  // Ref untuk print struk
  const strukRef = useRef(null);

  // Fungsi notifikasi
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

  const formatTime = (datetime) => {
    if (!datetime) return "-";
    const utcDate = new Date(datetime);
    if (isNaN(utcDate.getTime())) return "-";
    const wibDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
    const hours = String(wibDate.getHours()).padStart(2, "0");
    const minutes = String(wibDate.getMinutes()).padStart(2, "0");
    const seconds = String(wibDate.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDate = (datetime) => {
    if (!datetime) return "-";
    const utcDate = new Date(datetime);
    if (isNaN(utcDate.getTime())) return "-";
    const wibDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
    return wibDate.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  // Fungsi untuk mendapatkan tarif berdasarkan jenis kendaraan
  const getTarifByJenis = (jenisKendaraan) => {
    const tarif = tarifs.find((t) => t.jenis_kendaraan === jenisKendaraan);
    return tarif?.id_tarif || null;
  };

  // Update tarif otomatis
  useEffect(() => {
    if (formData.jenis_kendaraan && tarifs.length > 0) {
      const tarifId = getTarifByJenis(formData.jenis_kendaraan);
      setFormData((prev) => ({
        ...prev,
        id_tarif: tarifId || "",
      }));
    }
  }, [formData.jenis_kendaraan, tarifs]);
  const updateWaktuKeluarRealTime = () => {
    const now = new Date(); // Waktu lokal browser

    // Tambahkan log untuk debug
    console.log("Waktu sekarang (browser):", now);
    console.log("Tanggal:", now.toISOString().split("T")[0]);
    console.log("Jam:", now.getHours());
    console.log("Menit:", now.getMinutes());

    setFormKeluar({
      jam_keluar: now.getHours().toString().padStart(2, "0"),
      menit_keluar: now.getMinutes().toString().padStart(2, "0"),
      tanggal_keluar: now.toISOString().split("T")[0], // Ini bisa jadi masalah!
    });
  };

  // Filter kendaraan aktif
  useEffect(() => {
    let filtered = [...kendaraanAktif];

    // Filter berdasarkan plat nomor
    if (searchPlateKeluar) {
      filtered = filtered.filter((item) =>
        item.tb_kendaraan?.plat_nomor
          ?.toLowerCase()
          .includes(searchPlateKeluar.toLowerCase()),
      );
    }

    // Filter berdasarkan tanggal
    if (filterKeluarTanggal) {
      filtered = filtered.filter((item) => {
        const wibDate = new Date(
          new Date(item.waktu_masuk).getTime() + 7 * 60 * 60 * 1000,
        );
        const itemDate = wibDate.toISOString().split("T")[0];
        return itemDate === filterKeluarTanggal;
      });
    }

    // Filter berdasarkan jam mulai
    if (filterKeluarJamMulai) {
      filtered = filtered.filter((item) => {
        const wibDate = new Date(
          new Date(item.waktu_masuk).getTime() + 7 * 60 * 60 * 1000,
        );
        const itemHour = wibDate.getHours();
        return itemHour >= parseInt(filterKeluarJamMulai);
      });
    }

    // Filter berdasarkan jam selesai
    if (filterKeluarJamSelesai) {
      filtered = filtered.filter((item) => {
        const wibDate = new Date(
          new Date(item.waktu_masuk).getTime() + 7 * 60 * 60 * 1000,
        );
        const itemHour = wibDate.getHours();
        return itemHour <= parseInt(filterKeluarJamSelesai);
      });
    }

    // Filter berdasarkan area
    if (filterKeluarArea !== "all") {
      filtered = filtered.filter(
        (item) => item.id_area === parseInt(filterKeluarArea),
      );
    }

    setFilteredKendaraanAktif(filtered);
  }, [
    kendaraanAktif,
    filterKeluarTanggal,
    filterKeluarJamMulai,
    filterKeluarJamSelesai,
    filterKeluarArea,
    searchPlateKeluar,
  ]);

  // Filter riwayat - perbaiki filter area
  useEffect(() => {
    let filtered = [...transaksiHariIni];

    if (filterJenis !== "all") {
      filtered = filtered.filter(
        (item) => item.tb_kendaraan?.jenis_kendaraan === filterJenis,
      );
    }

    if (filterPetugas !== "all") {
      filtered = filtered.filter(
        (item) => item.tb_user?.nama_lengkap === filterPetugas,
      );
    }

    if (filterAreaRiwayat !== "all") {
      filtered = filtered.filter(
        (item) => item.id_area === parseInt(filterAreaRiwayat),
      );
    }

    setFilteredTransaksi(filtered);
  }, [transaksiHariIni, filterJenis, filterPetugas, filterAreaRiwayat]);
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

        if (user.role !== "petugas") {
          showNotification("Akses ditolak. Anda bukan petugas.", "error");
          setTimeout(() => {
            if (user.role === "admin") router.push("/admin");
            else if (user.role === "owner") router.push("/owner");
            else router.push("/login");
          }, 1500);
          return;
        }

        setCurrentUser(user);
        setAuthChecking(false);
        fetchInitialData();
        updateWaktuKeluarRealTime();
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  // Update waktu keluar
  useEffect(() => {
    if (!editWaktuKeluar && activeTab === "keluar") {
      const interval = setInterval(() => {
        updateWaktuKeluarRealTime();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [editWaktuKeluar, activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAreas(),
      fetchTarifs(),
      fetchKendaraanAktif(),
      fetchTransaksiHariIni(),
    ]);
    setLoading(false);
  };

  const fetchAreas = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_area_parkir")
        .select("*")
        .order("nama_area", { ascending: true });

      if (error) throw error;
      setAreas(data || []);

      const totalTerisi =
        data?.reduce((sum, area) => sum + area.terisi, 0) || 0;
      const totalKapasitas =
        data?.reduce((sum, area) => sum + area.kapasitas, 0) || 0;
      setStats({
        totalTerisi,
        totalTersedia: totalKapasitas - totalTerisi,
      });
    } catch (error) {
      console.error("Error fetching areas:", error);
      showNotification("Gagal mengambil data area parkir", "error");
    }
  };

  const fetchTarifs = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_tarif")
        .select("*")
        .order("jenis_kendaraan", { ascending: true });

      if (error) throw error;
      setTarifs(data || []);
    } catch (error) {
      console.error("Error fetching tarifs:", error);
    }
  };

  const fetchKendaraanAktif = async () => {
    try {
      const { data, error } = await supabase
        .from("tb_transaksi")
        .select(
          `
                    id_parkir,
                    waktu_masuk,
                    status,
                    id_kendaraan,
                    tb_kendaraan (
                        id_kendaraan,
                        plat_nomor,
                        jenis_kendaraan,
                        warna,
                        pemilik
                    ),
                    id_area,
                    tb_area_parkir (
                        nama_area
                    ),
                    tb_user (
                        nama_lengkap
                    )
                `,
        )
        .eq("status", "masuk")
        .order("waktu_masuk", { ascending: false });

      if (error) throw error;
      setKendaraanAktif(data || []);
      setFilteredKendaraanAktif(data || []);
    } catch (error) {
      console.error("Error fetching kendaraan :", error);
    }
  };
  const fetchTransaksiHariIni = async () => {
    try {
      const today = new Date();
      const wibToday = new Date(today.getTime() + 7 * 60 * 60 * 1000);
      wibToday.setHours(0, 0, 0, 0);
      const startOfDayUTC = new Date(wibToday.getTime() - 7 * 60 * 60 * 1000);
      const endOfDayUTC = new Date(
        startOfDayUTC.getTime() + 24 * 60 * 60 * 1000,
      );

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
        ),
        tb_user (
          nama_lengkap
        )
      `,
        )
        .gte("waktu_masuk", startOfDayUTC.toISOString())
        .lt("waktu_masuk", endOfDayUTC.toISOString())
        .order("waktu_masuk", { ascending: false });

      if (error) throw error;

      setTransaksiHariIni(data || []);
      setFilteredTransaksi(data || []);
    } catch (error) {
      console.error("Error fetching transaksi hari ini:", error);
      // Di dalam fetchTransaksiHariIni, tambahkan console.log
      console.log("Waktu keluar UTC:", item.waktu_keluar);
      console.log("Waktu keluar WIB:", formatTime(item.waktu_keluar));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormKeluarChange = (e) => {
    const { name, value } = e.target;
    setFormKeluar((prev) => ({
      ...prev,
      [name]: value,
    }));
    setEditWaktuKeluar(true);
  };

  const resetFilterKeluar = () => {
    setFilterKeluarTanggal("");
    setFilterKeluarJamMulai("");
    setFilterKeluarJamSelesai("");
    setFilterKeluarArea("all");
    setSearchPlateKeluar("");
    setFilteredKendaraanAktif(kendaraanAktif);
    showNotification("Filter kendaraan keluar direset", "info");
  };

  const resetFilterRiwayat = () => {
    setFilterJenis("all");
    setFilterPetugas("all");
    setFilterAreaRiwayat("all");
    showNotification("Filter riwayat direset", "info");
  };
  const handleProsesKeluar = async (item) => {
    setLoading(true);

    try {
      // Buat date object dari input (WIB)
      const waktuKeluarWIB = new Date(
        `${formKeluar.tanggal_keluar}T${formKeluar.jam_keluar}:${formKeluar.menit_keluar}:00`,
      );

      console.log("Waktu keluar WIB:", waktuKeluarWIB);

      // Hitung durasi dengan waktu WIB
      const waktuMasukUTC = new Date(item.waktu_masuk);
      const waktuMasukWIB = new Date(
        waktuMasukUTC.getTime() + 7 * 60 * 60 * 1000,
      );

      console.log("Waktu masuk WIB:", waktuMasukWIB);

      // Validasi waktu keluar tidak boleh sebelum waktu masuk
      if (waktuKeluarWIB < waktuMasukWIB) {
        showNotification(
          "Waktu keluar tidak boleh sebelum waktu masuk",
          "error",
        );
        setLoading(false);
        return;
      }

      // Hitung durasi
      const durasiJam = Math.ceil(
        (waktuKeluarWIB - waktuMasukWIB) / (1000 * 60 * 60),
      );

      console.log("Durasi:", durasiJam);

      // AMBIL TARIF dari state tarifs
      const jenisKendaraan = item.tb_kendaraan?.jenis_kendaraan;
      const tarifData = tarifs.find(
        (t) => t.jenis_kendaraan === jenisKendaraan,
      );
      const tarifPerJam = tarifData?.tarif_per_jam || 0;
      const total = durasiJam * tarifPerJam;

      console.log("Tarif per jam:", tarifPerJam);
      console.log("Total:", total);

      // Format UTC untuk database (YYYY-MM-DD HH:MM:SS)
      const tahun = waktuKeluarWIB.getUTCFullYear();
      const bulan = String(waktuKeluarWIB.getUTCMonth() + 1).padStart(2, "0");
      const tanggal = String(waktuKeluarWIB.getUTCDate()).padStart(2, "0");
      const jam = String(waktuKeluarWIB.getUTCHours()).padStart(2, "0");
      const menit = String(waktuKeluarWIB.getUTCMinutes()).padStart(2, "0");
      const detik = String(waktuKeluarWIB.getUTCSeconds()).padStart(2, "0");

      const waktuKeluarUTCString = `${tahun}-${bulan}-${tanggal} ${jam}:${menit}:${detik}`;

      console.log(
        "Waktu keluar UTC string untuk database:",
        waktuKeluarUTCString,
      );

      setPaymentInfo({
        id_parkir: item.id_parkir,
        plat_nomor: item.tb_kendaraan?.plat_nomor || "-",
        jenis_kendaraan: item.tb_kendaraan?.jenis_kendaraan || "-",
        warna: item.tb_kendaraan?.warna || "-",
        pemilik: item.tb_kendaraan?.pemilik || "-",
        waktu_masuk: item.waktu_masuk,
        waktu_keluar: waktuKeluarUTCString,
        durasi: durasiJam,
        tarif_per_jam: tarifPerJam,
        total: total,
        area: item.tb_area_parkir?.nama_area || "-",
        petugas: currentUser?.nama_lengkap || "Petugas",
        petugas_masuk: item.tb_user?.nama_lengkap || "-",
      });

      setShowPaymentModal(true);
    } catch (error) {
      console.error("Error processing exit:", error);
      showNotification("Terjadi kesalahan saat memproses keluar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKendaraanMasuk = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.id_area) {
        showNotification("Pilih area parkir terlebih dahulu", "error");
        setLoading(false);
        return;
      }

      const normalizedWarna = formData.warna.trim() || "-";

      let id_kendaraan;
      const { data: existingKendaraan } = await supabase
        .from("tb_kendaraan")
        .select("id_kendaraan")
        .eq("plat_nomor", formData.plat_nomor)
        .single();

      if (existingKendaraan) {
        id_kendaraan = existingKendaraan.id_kendaraan;

        await supabase
          .from("tb_kendaraan")
          .update({
            jenis_kendaraan: formData.jenis_kendaraan,
            warna: normalizedWarna,
            pemilik: formData.pemilik,
            id_user: currentUser?.id,
          })
          .eq("id_kendaraan", id_kendaraan);
      } else {
        const { data: newKendaraan, error: kendaraanError } = await supabase
          .from("tb_kendaraan")
          .insert([
            {
              plat_nomor: formData.plat_nomor,
              jenis_kendaraan: formData.jenis_kendaraan,
              warna: normalizedWarna,
              pemilik: formData.pemilik,
              id_user: currentUser?.id,
            },
          ])
          .select();

        if (kendaraanError) throw kendaraanError;
        id_kendaraan = newKendaraan[0].id_kendaraan;
      }

      const { error: transaksiError } = await supabase
        .from("tb_transaksi")
        .insert([
          {
            id_kendaraan: id_kendaraan,
            waktu_masuk: new Date().toISOString(),
            id_tarif: formData.id_tarif || null,
            status: "masuk",
            id_user: currentUser?.id,
            id_area: formData.id_area,
          },
        ]);

      if (transaksiError) throw transaksiError;

      await supabase.rpc("increment_terisi", { area_id: formData.id_area });

      await supabase.from("tb_log_aktivitas").insert([
        {
          id_user: currentUser?.id,
          aktivitas: `Kendaraan masuk: ${formData.plat_nomor}`,
          waktu_aktivitas: new Date().toISOString(),
        },
      ]);

      showNotification(
        `Kendaraan ${formData.plat_nomor} berhasil masuk`,
        "success",
      );

      setFormData({
        plat_nomor: "",
        jenis_kendaraan: "mobil",
        warna: "",
        pemilik: "",
        id_area: "",
        id_tarif: "",
      });

      await fetchInitialData();
    } catch (error) {
      console.error("Error processing vehicle entry:", error);
      showNotification("Gagal memproses kendaraan masuk", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePembayaran = async () => {
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("tb_transaksi")
        .update({
          waktu_keluar: paymentInfo.waktu_keluar,
          durasi_jam: paymentInfo.durasi,
          biaya_total: paymentInfo.total,
          status: "keluar",
        })
        .eq("id_parkir", paymentInfo.id_parkir);

      if (updateError) throw updateError;

      const { data: transaksi } = await supabase
        .from("tb_transaksi")
        .select("id_area")
        .eq("id_parkir", paymentInfo.id_parkir)
        .single();

      if (transaksi) {
        await supabase.rpc("decrement_terisi", { area_id: transaksi.id_area });
      }

      await supabase.from("tb_log_aktivitas").insert([
        {
          id_user: currentUser?.id,
          aktivitas: `Kendaraan keluar: ${paymentInfo.plat_nomor} - ${formatRupiah(paymentInfo.total)}`,
          waktu_aktivitas: new Date().toISOString(),
        },
      ]);

      showNotification("Pembayaran berhasil diproses", "success");

      setShowPaymentModal(false);
      setShowStrukModal(true);

      await fetchInitialData();
    } catch (error) {
      console.error("Error processing payment:", error);
      showNotification("Gagal memproses pembayaran", "error");
    } finally {
      setLoading(false);
    }
  };
  // Fungsi untuk print struk
  const handlePrintStruk = () => {
    if (!strukRef.current) {
      showNotification("Gagal mencetak struk", "error");
      return;
    }

    const strukContent = strukRef.current.cloneNode(true);

    const printWindow = window.open("", "_blank", "width=500,height=700");

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Struk Parkir</title>
            <meta charset="UTF-8">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Courier New', monospace;
                    background: white;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                .struk-container {
                    max-width: 380px;
                    width: 100%;
                    margin: 0 auto;
                    background: white;
                    padding: 20px;
                    border: 2px solid #000;
                }
                .text-center {
                    text-align: center;
                }
                .flex {
                    display: flex;
                    justify-content: space-between;
                    margin: 6px 0;
                }
                .text-\\[8px\\] {
                    font-size: 8px;
                }
                .text-\\[9px\\] {
                    font-size: 9px;
                }
                .text-\\[10px\\] {
                    font-size: 10px;
                }
                .text-xs {
                    font-size: 11px;
                }
                .text-sm {
                    font-size: 13px;
                }
                .text-base {
                    font-size: 14px;
                }
                .text-lg {
                    font-size: 16px;
                }
                .font-bold {
                    font-weight: bold;
                }
                .font-semibold {
                    font-weight: 600;
                }
                .capitalize {
                    text-transform: capitalize;
                }
                .mt-1 {
                    margin-top: 4px;
                }
                .mb-3 {
                    margin-bottom: 12px;
                }
                .my-2 {
                    margin-top: 8px;
                    margin-bottom: 8px;
                }
                .pt-2 {
                    padding-top: 8px;
                }
                .border-t {
                    border-top: 1px dashed #000;
                }
                .border-t-2 {
                    border-top: 2px solid #000;
                }
                .border-dashed {
                    border-style: dashed;
                }
                .border-gray-400 {
                    border-color: #9ca3af;
                }
                .text-green-700 {
                    color: #166534;
                }
                .text-gray-500 {
                    color: #6b7280;
                }
                @media print {
                    body {
                        padding: 0;
                        margin: 0;
                    }
                    .struk-container {
                        max-width: 100%;
                        border: 2px solid #000;
                        padding: 15px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="struk-container">
                ${strukContent.innerHTML}
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 500);
                    }, 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();

    setShowStrukModal(false);
    showNotification("Struk berhasil dicetak", "success");
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("isLoggedIn");
    showNotification("Berhasil keluar", "success");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
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

  const uniquePetugas = [
    ...new Set(
      transaksiHariIni
        .map((item) => item.tb_user?.nama_lengkap)
        .filter(Boolean),
    ),
  ];

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Notifikasi */}
      {notification.show && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${
            notification.type === "success"
              ? "bg-green-500"
              : notification.type === "error"
                ? "bg-red-500"
                : "bg-blue-500"
          } animate-slide-in-right`}
        >
          {notification.message}
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaParking className="text-2xl" />
              <h1 className="text-xl font-bold">
                Sistem Parkir - Beranda Petugas
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-lg">
                <FaUserCircle className="text-green-200" />
                <span className="text-sm">
                  {currentUser?.nama_lengkap || "Petugas"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
              >
                <FaLogout />
                Keluar
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
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalTerisi}
                </p>
              </div>
              <FaCar className="text-3xl text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tersedia</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalTersedia}
                </p>
              </div>
              <FaParking className="text-3xl text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transaksi Hari Ini</p>
                <p className="text-3xl font-bold text-gray-900">
                  {transaksiHariIni.length}
                </p>
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
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "masuk"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <FaSignInAlt />
                Kendaraan Masuk
              </button>
              <button
                onClick={() => setActiveTab("keluar")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "keluar"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <FaSignOutAlt />
                Kendaraan Keluar
              </button>
              <button
                onClick={() => setActiveTab("daftar")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "daftar"
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
                        placeholder="Masukkan plat nomor"
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
                      <option value="mobil">Mobil</option>
                      <option value="motor">Motor</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      *Tarif akan otomatis menyesuaikan dengan jenis kendaraan
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Warna Kendaraan
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">
                        <FaPalette />
                      </span>
                      <input
                        type="text"
                        name="warna"
                        value={formData.warna}
                        onChange={handleInputChange}
                        placeholder="Masukkan warna kendaraan"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Pemilik
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">
                        <FaUser />
                      </span>
                      <input
                        type="text"
                        name="pemilik"
                        value={formData.pemilik}
                        onChange={handleInputChange}
                        placeholder="Masukkan nama pemilik"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
                      />
                    </div>
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

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Tarif
                    </label>
                    <select
                      name="id_tarif"
                      value={formData.id_tarif}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                    >
                      <option value="">Tarif otomatis berdasarkan jenis</option>
                      {tarifs.map((tarif) => (
                        <option key={tarif.id_tarif} value={tarif.id_tarif}>
                          {tarif.jenis_kendaraan} -{" "}
                          {formatRupiah(tarif.tarif_per_jam)}/jam
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
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400">
                      <FaSearch />
                    </span>
                    <input
                      type="text"
                      placeholder="Cari berdasarkan plat nomor..."
                      value={searchPlateKeluar}
                      onChange={(e) => setSearchPlateKeluar(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Filter */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowFilterKeluar(!showFilterKeluar)}
                    className="mb-3 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition"
                  >
                    <FaFilter />
                    {showFilterKeluar
                      ? "Sembunyikan Filter"
                      : "Filter Kendaraan"}
                  </button>

                  {showFilterKeluar && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                      <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <FaCalendarAlt className="text-green-600" />
                        Filter
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            Tanggal Masuk
                          </label>
                          <input
                            type="date"
                            value={filterKeluarTanggal}
                            onChange={(e) =>
                              setFilterKeluarTanggal(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            Jam Mulai
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={filterKeluarJamMulai}
                            onChange={(e) =>
                              setFilterKeluarJamMulai(e.target.value)
                            }
                            placeholder="0-23"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            Jam Selesai
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={filterKeluarJamSelesai}
                            onChange={(e) =>
                              setFilterKeluarJamSelesai(e.target.value)
                            }
                            placeholder="0-23"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            Area Parkir
                          </label>
                          <select
                            value={filterKeluarArea}
                            onChange={(e) =>
                              setFilterKeluarArea(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                          >
                            <option value="all">Semua Area</option>
                            {areas.map((area) => (
                              <option key={area.id_area} value={area.id_area}>
                                {area.nama_area}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={resetFilterKeluar}
                          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
                        >
                          <FaUndo />
                          Reset Filter
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Input Waktu Keluar */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
                      <FaCalendarAlt className="text-green-600" />
                      Atur Waktu Keluar
                    </h3>
                    <button
                      onClick={() => {
                        setEditWaktuKeluar(false);
                        updateWaktuKeluarRealTime();
                        showNotification(
                          "Waktu keluar direset ke waktu sekarang",
                          "info",
                        );
                      }}
                      className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <FaEdit size={10} />
                      Reset ke Real-time
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-600 text-sm mb-1">
                        Tanggal Keluar
                      </label>
                      <input
                        type="date"
                        name="tanggal_keluar"
                        value={formKeluar.tanggal_keluar}
                        onChange={handleFormKeluarChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-1">
                        Jam Keluar
                      </label>
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
                      <label className="block text-gray-600 text-sm mb-1">
                        Menit Keluar
                      </label>
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
                    *Waktu keluar otomatis sesuai waktu sekarang (WIB). Klik
                    tombol "Reset ke Real-time" untuk mengembalikan ke waktu
                    saat ini.
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Kendaraan
                    {filteredKendaraanAktif.length !==
                      kendaraanAktif.length && (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        (Menampilkan {filteredKendaraanAktif.length} dari{" "}
                        {kendaraanAktif.length} kendaraan)
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredKendaraanAktif.map((item) => (
                      <div
                        key={item.id_parkir}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getJenisIcon(item.tb_kendaraan?.jenis_kendaraan)}
                            <span className="font-semibold text-gray-900">
                              {item.tb_kendaraan?.plat_nomor}
                            </span>
                          </div>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            {item.tb_area_parkir?.nama_area}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Jenis:</span>
                            <span className="text-gray-900 capitalize">
                              {item.tb_kendaraan?.jenis_kendaraan}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Warna:</span>
                            <span className="text-gray-900">
                              {item.tb_kendaraan?.warna || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Waktu Masuk:</span>
                            <span className="text-gray-900 font-mono">
                              {formatTime(item.waktu_masuk)} WIB
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Petugas:</span>
                            <span className="text-gray-900">
                              {item.tb_user?.nama_lengkap || "-"}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <button
                            onClick={() => handleProsesKeluar(item)}
                            className="w-full bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition"
                          >
                            Proses Keluar
                          </button>
                        </div>
                      </div>
                    ))}

                    {filteredKendaraanAktif.length === 0 && (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        Tidak ada kendaraan
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab Riwayat Hari Ini */}
            {activeTab === "daftar" && (
              <div>
                {/* Filter Riwayat */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowFilterRiwayat(!showFilterRiwayat)}
                    className="mb-3 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition"
                  >
                    <FaFilter />
                    {showFilterRiwayat
                      ? "Sembunyikan Filter"
                      : "Filter Riwayat"}
                  </button>

                  {showFilterRiwayat && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                      <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <FaFilter className="text-green-600" />
                        Filter Transaksi
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            Jenis Kendaraan
                          </label>
                          <select
                            value={filterJenis}
                            onChange={(e) => setFilterJenis(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                          >
                            <option value="all">Semua Jenis</option>
                            <option value="mobil">Mobil</option>
                            <option value="motor">Motor</option>
                            <option value="lainnya">Lainnya</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            Petugas
                          </label>
                          <select
                            value={filterPetugas}
                            onChange={(e) => setFilterPetugas(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                          >
                            <option value="all">Semua Petugas</option>
                            {uniquePetugas.map((petugas) => (
                              <option key={petugas} value={petugas}>
                                {petugas}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            Area Parkir
                          </label>
                          <select
                            value={filterAreaRiwayat}
                            onChange={(e) =>
                              setFilterAreaRiwayat(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                          >
                            <option value="all">Semua Area</option>
                            {areas.map((area) => (
                              <option key={area.id_area} value={area.id_area}>
                                {area.nama_area}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={resetFilterRiwayat}
                          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
                        >
                          <FaUndo />
                          Reset Filter
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Waktu Masuk
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
                          Area
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Waktu Keluar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Durasi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Biaya
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Petugas
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTransaksi.map((item) => (
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
                              <span className="capitalize">
                                {item.tb_kendaraan?.jenis_kendaraan}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.tb_kendaraan?.warna || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.tb_kendaraan?.pemilik || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.tb_area_parkir?.nama_area || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.waktu_keluar
                              ? formatTime(item.waktu_keluar)
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.durasi_jam ? `${item.durasi_jam} jam` : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {item.biaya_total
                              ? formatRupiah(item.biaya_total)
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.tb_user?.nama_lengkap || "-"}
                          </td>
                        </tr>
                      ))}

                      {filteredTransaksi.length === 0 && (
                        <tr>
                          <td
                            colSpan="11"
                            className="px-6 py-4 text-center text-gray-500"
                          >
                            Tidak ada transaksi
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
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Status Area Parkir
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map((area) => {
              const tersedia = area.kapasitas - area.terisi;
              const percentage = (area.terisi / area.kapasitas) * 100;
              return (
                <div key={area.id_area} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">
                      {area.nama_area}
                    </span>
                    <span
                      className={`text-sm font-medium ${tersedia === 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {tersedia} tersedia
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div
                      className={`h-2.5 rounded-full ${
                        percentage > 80
                          ? "bg-red-500"
                          : percentage > 50
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Terisi: {area.terisi}</span>
                    <span>Total: {area.kapasitas}</span>
                  </div>
                </div>
              );
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
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-white hover:text-gray-200"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3 mb-2">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Informasi Kendaraan
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">Plat Nomor</div>
                    <div className="text-gray-900 font-medium">
                      {paymentInfo.plat_nomor}
                    </div>

                    <div className="text-gray-600">Jenis</div>
                    <div className="text-gray-900 capitalize">
                      {paymentInfo.jenis_kendaraan}
                    </div>

                    <div className="text-gray-600">Warna</div>
                    <div className="text-gray-900">{paymentInfo.warna || "-"}</div>

                    {paymentInfo.pemilik && paymentInfo.pemilik !== "-" && (
                      <>
                        <div className="text-gray-600">Pemilik</div>
                        <div className="text-gray-900">
                          {paymentInfo.pemilik}
                        </div>
                      </>
                    )}

                    <div className="text-gray-600">Area Parkir</div>
                    <div className="text-gray-900">{paymentInfo.area}</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-2">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Informasi Waktu
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">Petugas Masuk</div>
                    <div className="text-gray-900">
                      {paymentInfo.petugas_masuk}
                    </div>

                    <div className="text-gray-600">Waktu Masuk</div>
                    <div className="text-gray-900">
                      {formatDateTime(paymentInfo.waktu_masuk)}
                    </div>

                    <div className="text-gray-600">Waktu Keluar</div>
                    <div className="text-gray-900">
                      {formatDateTime(paymentInfo.waktu_keluar)}
                    </div>

                    <div className="text-gray-600">Durasi</div>
                    <div className="text-gray-900">
                      {paymentInfo.durasi} Jam
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Informasi Biaya
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">Tarif per Jam</div>
                    <div className="text-gray-900">
                      {formatRupiah(paymentInfo.tarif_per_jam)}
                    </div>

                    <div className="text-gray-600 font-bold">Total</div>
                    <div className="text-green-600 font-bold text-lg">
                      {formatRupiah(paymentInfo.total)}
                    </div>
                  </div>
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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          style={{ zIndex: 1000 }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-3 rounded-t-lg flex justify-between items-center">
              <h3 className="text-base font-semibold">Struk Parkir</h3>
              <button
                onClick={() => setShowStrukModal(false)}
                className="text-white hover:text-gray-200"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="p-5">
              {/* Struk yang bisa di-print */}
              <div
                ref={strukRef}
                className="bg-white p-4 font-mono border-2 border-gray-400 rounded-none"
                style={{ color: "#000000", backgroundColor: "#ffffff" }}
              >
                <div className="text-center mb-3">
                  <h4 className="font-bold text-base text-black">
                    SISTEM PARKIR
                  </h4>
                  <p className="text-[10px] text-black">
                    Bukti Transaksi Parkir
                  </p>
                </div>

                {/* Garis pemisah header */}
                <div className="border-t border-dashed border-gray-400 my-2"></div>

                {/* Informasi Transaksi */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-black font-semibold">
                      No. Transaksi
                    </span>
                    <span className="font-bold text-black">
                      #{paymentInfo.id_parkir}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-black font-semibold">Tanggal</span>
                    <span className="text-black">
                      {formatDate(paymentInfo.waktu_keluar)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-black font-semibold">
                      Petugas Keluar
                    </span>
                    <span className="text-black">{paymentInfo.petugas}</span>
                  </div>
                </div>

                {/* Garis pemisah */}
                <div className="border-t border-dashed border-gray-400 my-2"></div>

                {/* Informasi Kendaraan */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-black font-semibold">Plat Nomor</span>
                    <span className="font-bold text-black">
                      {paymentInfo.plat_nomor}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-black font-semibold">
                      Jenis Kendaraan
                    </span>
                    <span className="capitalize text-black">
                      {paymentInfo.jenis_kendaraan}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-black font-semibold">Warna</span>
                    <span className="text-black">{paymentInfo.warna || "-"}</span>
                  </div>
                  {paymentInfo.pemilik && paymentInfo.pemilik !== "-" && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-black font-semibold">Pemilik</span>
                      <span className="text-black">{paymentInfo.pemilik}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-black font-semibold">
                      Area Parkir
                    </span>
                    <span className="text-black">{paymentInfo.area}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-black font-semibold">
                      Petugas Masuk
                    </span>
                    <span className="text-black">
                      {paymentInfo.petugas_masuk}
                    </span>
                  </div>
                </div>

                {/* Garis pemisah */}
                <div className="border-t border-dashed border-gray-400 my-2"></div>

                {/* Informasi Waktu */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-black font-semibold">
                      Waktu Masuk
                    </span>
                    <span className="text-black">
                      {formatDateTime(paymentInfo.waktu_masuk)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-black font-semibold">
                      Waktu Keluar
                    </span>
                    <span className="text-black">
                      {formatDateTime(paymentInfo.waktu_keluar)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-black font-semibold">Durasi</span>
                    <span className="text-black font-bold">
                      {paymentInfo.durasi} Jam
                    </span>
                  </div>
                </div>

                {/* Garis pemisah */}
                <div className="border-t border-dashed border-gray-400 my-2"></div>

                {/* Informasi Biaya */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-black font-semibold">
                      Tarif per Jam
                    </span>
                    <span className="text-black">
                      {formatRupiah(paymentInfo.tarif_per_jam)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t-2 border-gray-400 pt-2 mt-2">
                    <span className="text-black text-base">TOTAL BIAYA</span>
                    <span className="text-green-700 text-lg font-bold">
                      {formatRupiah(paymentInfo.total)}
                    </span>
                  </div>
                </div>

                {/* Garis pemisah */}
                <div className="border-t border-dashed border-gray-400 my-2"></div>

                {/* Footer */}
                <div className="text-center text-[9px] pt-2 text-black">
                  <p>Terima kasih telah menggunakan</p>
                  <p>layanan parkir kami</p>
                  <p className="text-[8px] mt-1 text-gray-500">
                    Simpan struk ini sebagai bukti pembayaran
                  </p>
                </div>
              </div>

              {/* Tombol aksi struk */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handlePrintStruk}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <FaPrint size={14} />
                  Cetak
                </button>
                <button
                  onClick={() => setShowStrukModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-400 transition flex items-center justify-center gap-2"
                >
                  <FaTimes size={14} />
                  Tutup
                </button>
              </div>
            </div>
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
