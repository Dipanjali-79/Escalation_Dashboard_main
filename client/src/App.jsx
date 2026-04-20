// Build v4.9.1 - UI Polish (Clean Versioning)
import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Search,
  LogOut,
  PieChart,
  LayoutDashboard,
  Plus,
  FileUp,
  FileDown,
  Trash2,
  X,
  Edit2,
  ChevronRight,
  ChevronLeft,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Bar, Doughnut, Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { BRANCHES, BRANDS, HEADER_MAP, API_URL } from './Constants';
import logo from './assets/logo.png';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  LineController,
  BarController,
  ArcElement,
  Title,
  Tooltip,
  Legend
);
const pdfLabelsPlugin = {
  id: 'pdfLabelsPlugin',
  afterDatasetsDraw(chart) {
    if (!chart.options.plugins.pdfLabelsPlugin?.enabled) return;
    const { ctx } = chart;
    ctx.save();
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((element, index) => {
        const dataValue = dataset.data[index];
        if (dataValue === 0) return;

        if (datasetIndex === 0) { // Bar (Total)
          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          // Position white labels at the TOP inside of the bar for better separation
          ctx.fillText(dataValue, element.x, element.y + 15);
        } else { // Line (Open)
          ctx.fillStyle = '#f97316';
          ctx.font = 'bold 13px Arial';
          ctx.textAlign = 'center';
          // Increase upward offset to ensure separation from bar labels
          ctx.fillText(dataValue, element.x, element.y - 18);
        }
      });
    });
    ctx.restore();
  }
};

const glowPlugin = {
  id: 'glowPlugin',
  beforeDatasetDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    meta.data.forEach((element, index) => {
      const color = dataset.backgroundColor && dataset.backgroundColor[index];
      if (!color) return;
      // Only apply glow to the Red segment (vibrant red)
      if (color === '#ff0000' || color === '#ef4444' || color === '#b91c1c') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
      } else {
        ctx.shadowBlur = 0;
      }
      if (element && typeof element.draw === 'function') {
        element.draw(ctx);
      }
    });
    ctx.restore();
  }
};

// Date Helpers
const getSafeISOFromXLSX = (val) => {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel evaluates DD-MM-YYYY strings as MM-DD-YYYY silently on US-locale machines.
    // By formatting the mathematical raw value backwards as 'yyyy-dd-mm', we perfectly undo the corruption.
    return XLSX.SSF.format('yyyy-dd-mm', val);
  }
  let s = String(val).trim().replace(/\//g, '-');
  if (s.includes('T')) s = s.split('T')[0];
  const parts = s.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return s; 
    let d = parts[0].padStart(2, '0');
    let m = parts[1].padStart(2, '0');
    let y = parts[2];
    if (y.length === 2) {
      y = parseInt(y, 10) > 80 ? `19${y}` : `20${y}`;
    }
    return `${y}-${m}-${d}`;
  }
  return s;
};

const getLocalISOString = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    let s = String(dateStr).trim().replace(/\//g, '-');
    if (s.includes('T')) s = s.split('T')[0];
    const parts = s.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
    }
    return s;
  } catch (e) { return dateStr; }
};

const normalizeDateForCompare = (dateStr) => {
  if (!dateStr) return null;
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return dateStr; // Already YYYY-MM-DD
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
};
// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ color: '#ef4444' }}>⚠️ Something went wrong</h1>
          <p style={{ color: '#64748b' }}>{this.state.error && this.state.error.toString()}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ParticleBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden z-minus-1" style={{ pointerEvents: 'none' }}>
      <div className="floating-blob blob-1" />
      <div className="floating-blob blob-2" />
      <div className="floating-blob blob-3" />
    </div>
  );
};

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good Morning';
  if (h >= 12 && h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const AppleWelcome = ({ text }) => {
  return (
    <div className="apple-welcome-overlay">
      <div className="apple-welcome-content">
        <div className="apple-welcome-text">{text}</div>
        <div className="apple-welcome-divider" />
        <div className="apple-welcome-sub">VE CARE Escalation Dashboard</div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [data, setData] = useState([]);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState('Checking...');
  const [importing, setImporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    closedDate: '',
    branch: '',
    status: '',
    aging: '',
    brand: '',
    serviceType: ''
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedAging, setSelectedAging] = useState(null);
  const [agingDetailModalOpen, setAgingDetailModalOpen] = useState(false);
  const [hasShownAgingPopup, setHasShownAgingPopup] = useState(false);
  const [showAppleWelcome, setShowAppleWelcome] = useState(false);
  const [welcomeText, setWelcomeText] = useState('');
  const agingChartRef = React.useRef(null);
  const pdfChartRef = React.useRef(null);
  const branchChartRef = React.useRef(null);
  const crmChartRef = React.useRef(null);

  const deferredFilters = useDeferredValue(filters);

  const [formData, setFormData] = useState({
    date: getLocalISOString(),
    id: '',
    branch: '',
    brand: '',
    closedDate: '',
    serviceType: '',
    reason: '',
    city: '',
    aging: 0,
    status: 'Open',
    remark: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginMode, setLoginMode] = useState('BRANCH');
  const [selectedEntity, setSelectedEntity] = useState('');

  // Global Error Reporter
  useEffect(() => {
    const handleError = (event) => {
      const msg = event.error?.message || event.message || 'Unknown Javascript Error';
      console.error('Captured Global Error:', event.error);
      showToast(`⚠️ UI Error: ${msg}. Please refresh.`, 'error');
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (e) => {
      showToast('⚠️ Async Error: ' + (e.reason?.message || 'Database connection lost'), 'error');
    });
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Auth Effects
  useEffect(() => {
    const savedUser = sessionStorage.getItem('appUser');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object') {
          setUser(parsed);
          if (parsed.role !== 'ADMIN') {
            setFilters(prev => ({ ...prev, branch: parsed.role }));
            setFormData(prev => ({ ...prev, branch: parsed.role }));
          }
        }
      } catch (e) {
        console.error("Session parse error:", e);
        sessionStorage.removeItem('appUser');
      }
    }
  }, []);

  // Data Fetching
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}?limit=2000`);
      setData(res.data.data || res.data);

      // Also check DB status
      try {
        const info = await axios.get('/api/info');
        setDbStatus(info.data.db_status === 1 ? 'Connected' : 'Offline');
      } catch (e) {
        setDbStatus('Error');
      }
    } catch (err) {
      console.error('Data loading error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error loading data';
      showToast(`Load Failed: ${errorMsg}`, 'error');
      setDbStatus('Offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Toast System
  const [toasts, setToasts] = useState([]);
  const showToast = (msg, type = 'info', duration = 3000) => {
    const fresh = { id: Date.now(), msg, type };
    setToasts(prev => [...prev, fresh]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== fresh.id));
    }, duration);
  };

  // Helper: Filtered Data
  const filteredData = useMemo(() => {
    try {
      let result = data;
      if (user && user.role !== 'ADMIN') {
        const uRole = String(user.role).trim().toLowerCase();
        result = result.filter(d => {
          if (user.roleType === 'BRAND') {
            const dBrand = String(d.brand || "").trim().toLowerCase();
            return dBrand === uRole;
          } else {
            const dBranch = String(d.branch || "").trim().toLowerCase();
            if (uRole === 'bangalore') {
              return dBranch === 'bangalore' || dBranch === 'ro kar';
            }
            return dBranch === uRole;
          }
        });
      }

      return result.filter(d => {
        const matchesSearch = deferredFilters.search === "" || Object.values(d).some(v => String(v || "").toLowerCase().includes(deferredFilters.search.toLowerCase()));
        const matchesStatus = deferredFilters.status === "" || String(d.status || "").toLowerCase() === String(deferredFilters.status).toLowerCase();

        const dBranch = String(d.branch || "").trim().toLowerCase();
        const fBranch = String(deferredFilters.branch || "").trim().toLowerCase();
        
        let matchesBranch = false;
        if (fBranch === "") {
          matchesBranch = true;
        } else if (fBranch === 'bangalore') {
          matchesBranch = (dBranch === 'bangalore' || dBranch === 'ro kar');
        } else {
          matchesBranch = (dBranch === fBranch);
        }

        const matchesDate = deferredFilters.date === "" || (() => {
          if (!d.date) return false;
          const dbDateStr = String(d.date).trim();
          const searchDate = deferredFilters.date; // YYYY-MM-DD from picker

          // 1. Precise components
          const dbParts = dbDateStr.split('-');
          if (dbParts.length !== 3) return dbDateStr.includes(searchDate);

          let y, dPart, mPart;
          if (dbParts[0].length === 4) {
            [y, mPart, dPart] = dbParts;
          } else {
            [dPart, mPart, y] = dbParts;
          }

          const yS = String(y);
          const mS = String(mPart).padStart(2, '0');
          const dS = String(dPart).padStart(2, '0');

          // Check searchDate (YYYY-MM-DD from picker) against both interpretations
          if (`${yS}-${mS}-${dS}` === searchDate) return true; // Standard
          if (`${yS}-${dS}-${mS}` === searchDate) return true; // Swapped

          return false;
        })();

        const matchesClosedDate = deferredFilters.closedDate === "" || (() => {
          if (!d.closedDate) return false;
          const dbDateStr = String(d.closedDate).trim();
          const searchDate = deferredFilters.closedDate;
          const dbParts = dbDateStr.split('-');
          if (dbParts.length !== 3) return dbDateStr.includes(searchDate);
          let y, dPart, mPart;
          if (dbParts[0].length === 4) { [y, mPart, dPart] = dbParts; }
          else { [dPart, mPart, y] = dbParts; }
          const yS = String(y);
          const mS = String(mPart).padStart(2, '0');
          const dS = String(dPart).padStart(2, '0');
          if (`${yS}-${mS}-${dS}` === searchDate) return true;
          if (`${yS}-${dS}-${mS}` === searchDate) return true;
          return false;
        })();

        const matchesAging = deferredFilters.aging === "" || String(d.aging || 0) === deferredFilters.aging;
        const matchesBrand = deferredFilters.brand === "" || String(d.brand || "").toLowerCase().includes(String(deferredFilters.brand).toLowerCase());
        const matchesServiceType = deferredFilters.serviceType === "" || String(d.serviceType || "").toLowerCase() === String(deferredFilters.serviceType).toLowerCase();

        return matchesSearch && matchesStatus && matchesBranch && matchesDate && matchesClosedDate && matchesAging && matchesBrand && matchesServiceType;
      });
    } catch (err) {
      console.error("Filter error:", err);
      return [];
    }
  }, [data, deferredFilters, user]);

  const selectedAgingCases = useMemo(() => {
    try {
      if (selectedAging === null) return [];
      return filteredData.filter(d =>
        String(d.status || '').toLowerCase() !== 'closed' &&
        String(d.status || '').toLowerCase() !== 'cancelled' &&
        Number(d.aging || 0) === selectedAging
      );
    } catch (err) {
      return [];
    }
  }, [filteredData, selectedAging]);

  // Aging Reminder Popup
  useEffect(() => {
    if (user && !hasShownAgingPopup && filteredData.length > 0) {
      const agingCount = filteredData.filter(d =>
        String(d.status || '').toLowerCase() !== 'closed' &&
        String(d.status || '').toLowerCase() !== 'cancelled' &&
        Number(d.aging || 0) > 5
      ).length;

      if (agingCount > 0) {
        showToast(`Reminder: You have ${agingCount} cases with aging over 5 days!`, 'error');
        setHasShownAgingPopup(true);
      }
    }
  }, [user, filteredData, hasShownAgingPopup]);

  // Auth Handlers
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    
    let uUpper = '';
    if (loginMode === 'ADMIN') {
      uUpper = 'ADMIN';
    } else if (loginMode === 'BRAND') {
      uUpper = e.target.loginBrand.value.trim().toUpperCase();
      if (!uUpper) {
        setLoginError('Please enter a Brand Name.');
        return;
      }
      if (!["SALORA", "AERO NERO", "LEDVANCE"].includes(uUpper)) {
        setLoginError('Only AERO NERO, LEDVANCE, or SALORA are permitted for Brand Login.');
        return;
      }
    } else if (selectedEntity) {
      uUpper = selectedEntity.toUpperCase();
    } else {
      setLoginError(`Please select an option from the grid above.`);
      return;
    }
    
    const p = e.target.loginPass.value;

    if (p === "Vecare@2026") {
      let branchRef = BRANCHES.find(b => b.toUpperCase() === uUpper);
      let brandRef = BRANDS.find(b => b.toUpperCase() === uUpper);

      // Alias HYD to Hyderabad, MP to Madhya Pradesh, UP EAST/UP WEST to Uttar Pradesh
      if (uUpper === "HYD" || uUpper === "HYDERABAD") {
        branchRef = "Hyderabad";
      } else if (uUpper === "MP") {
        branchRef = "Madhya Pradesh";
      } else if (uUpper === "UP EAST" || uUpper === "UPEAST") {
        branchRef = "Uttar Pradesh";
      } else if (uUpper === "UP WEST" || uUpper === "UPWEST") {
        branchRef = "Uttar Pradesh";
      }

      if (uUpper === "ADMIN" || branchRef || brandRef) {
        const newUser = {
          role: uUpper === "ADMIN" ? "ADMIN" : (branchRef ? branchRef : brandRef),
          name: uUpper === "ADMIN" ? "Administrator" : (branchRef ? `Branch Manager (${branchRef})` : `Brand Manager (${brandRef})`),
          roleType: uUpper === "ADMIN" ? "ADMIN" : (branchRef ? 'BRANCH' : 'BRAND')
        };
        setUser(newUser);
        sessionStorage.setItem('appUser', JSON.stringify(newUser));
        // Compute greeting text
        const timeGreeting = getTimeGreeting();
        const greeting = newUser.role === 'ADMIN'
          ? `${timeGreeting}, Admin`
          : `${timeGreeting}, ${newUser.role}`;
        setWelcomeText(greeting);
        // Apple welcome effect for all users
        setShowAppleWelcome(true);
        setTimeout(() => setShowAppleWelcome(false), 3500);
        if (newUser.role !== 'ADMIN') {
          if (newUser.roleType === 'BRAND') {
            setFilters(prev => ({ ...prev, brand: newUser.role }));
            setFormData(prev => ({ ...prev, brand: newUser.role, branch: '' }));
          } else {
            setFilters(prev => ({ ...prev, branch: newUser.role }));
            setFormData(prev => ({ ...prev, branch: newUser.role }));
          }
        }
      } else {
        setLoginError('Invalid Username/Branch ID');
        showToast('Invalid Username/Branch ID', 'error');
      }
    } else {
      setLoginError('Warning: Incorrect Password');
      showToast('Warning: Incorrect Password', 'error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('appUser');
    setUser(null);
    setData([]);
  };

  const handleAgingChartClick = (event) => {
    const { current: chart } = agingChartRef;
    if (!chart) return;

    const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
    if (elements.length > 0) {
      const index = elements[0].index;
      const label = agingBarData.labels[index]; // e.g. "28 Days"
      const agingValue = parseInt(label);
      setSelectedAging(agingValue);
      setAgingDetailModalOpen(true);
    }
  };

  // CRUD Handlers
  const openEditModal = (row) => {
    setEditingId(row._id);
    setFormData({ ...row });
    setModalOpen(true);
  };

  const closeCaseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormData({
      date: getLocalISOString(),
      id: '',
      branch: (user?.role !== 'ADMIN' && user?.roleType !== 'BRAND') ? user.role : '',
      brand: user?.roleType === 'BRAND' ? user.role : '',
      closedDate: '',
      serviceType: '',
      reason: '',
      city: '',
      aging: 0,
      status: 'Open',
      remark: ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, formData);
        showToast('Updated successfully', 'success');
      } else {
        // --- Duplicate Check for New Entry ---
        const existingIds = new Set(data.map(d => String(d.id).trim()));
        if (existingIds.has(String(formData.id).trim())) {
          showToast(`Duplicate Service Order ID: ${formData.id} already exists.`, 'warning', 7000);
          return;
        }
        // -------------------------------------
        await axios.post(API_URL, formData);
        showToast('Saved successfully', 'success');
      }
      closeCaseModal();
      loadData();
    } catch (err) {
      showToast('Save failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      showToast('Deleted');
      loadData();
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("CRITICAL: Delete ALL records?")) return;
    try {
      await axios.delete(`${API_URL}/all`);
      showToast('Cleared All Data');
      loadData();
    } catch (err) {
      showToast('Clear failed', 'error');
    }
  };

  // Import / Export
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const fileResult = evt.target.result;
        // Use readAsArrayBuffer for better binary/Excel support
        const wb = XLSX.read(fileResult, {
          type: 'array',
          cellDates: false, // Prevent JS Date objects to avoid timezone shifts
          cellNF: false,
          cellText: false
        });

        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (rows.length < 2) throw new Error("File empty or invalid format");

        // Smart Header Search: Find the first row that has at least 3 recognizable headers
        let headerRowIndex = -1;
        let fileHeaders = [];
        const sirusIndicators = ['job status', 'escalation id', 'escallation', 'escalltion', 'service order id', 'sirus id', 'job no'];

        for (let i = 0; i < Math.min(rows.length, 100); i++) {
          const row = rows[i];
          if (!Array.isArray(row) || row.length === 0) continue;
          
          const candidateHeaders = row.map(h => String(h || "").trim().toLowerCase());
          const matchedKeys = candidateHeaders.filter(h => !!HEADER_MAP[h]);
          const matchCount = matchedKeys.length;

          // Diagnostic log to find the header row
          if (matchCount > 0) {
            console.log(`[Import Debug] Row ${i} Match Score: ${matchCount}`, matchedKeys);
          }
          
          if (matchCount >= 3) {
            headerRowIndex = i;
            fileHeaders = candidateHeaders;
            break;
          }
        }

        if (headerRowIndex === -1) {
          console.warn("No clear header row found. Falling back to Row 0.");
          headerRowIndex = 0;
          fileHeaders = rows[0].map(h => String(h || "").trim().toLowerCase());
        }

        const isSirus = fileHeaders.some(h => sirusIndicators.includes(h));
        console.log(`Detected header at Row ${headerRowIndex}:`, fileHeaders);
        console.log("Is SIRUS File:", isSirus);
        
        const colMap = {};
        fileHeaders.forEach((h, idx) => {
          if (HEADER_MAP[h]) colMap[HEADER_MAP[h]] = idx;
        });

        const entries = [];
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const entry = {};
          let hasData = false;

          Object.keys(colMap).forEach(key => {
            const idx = colMap[key];
            let val = row[idx];

            if (key === 'date' || key === 'receiptDate') {
              entry[key] = getSafeISOFromXLSX(val);
            } else {
              entry[key] = val !== undefined && val !== null ? String(val).trim() : "";
            }

            if (entry[key]) hasData = true;
          });

          if (!hasData) continue;
          
          if (!entry.date || !entry.id || !entry.branch) {
            console.warn("Skipping Row (Missing required fields):", {
              row: i + 1,
              date: entry.date,
              id: entry.id,
              branch: entry.branch,
              hasMappedDate: !!colMap['date'],
              hasMappedId: !!colMap['id'],
              hasMappedBranch: !!colMap['branch']
            });
            continue;
          }

          // --- SIRUS Specific Logic ---
          if (isSirus) {
            entry.brand = "AMAZON";
            
            // Status Mapping
            const sirusStatus = String(entry.status || "").toUpperCase();
            if (sirusStatus === "NOT_SERVICED" || sirusStatus === "PENDING_SCHEDULE") {
              entry.status = "Open";
            }

            // Aging calculation from receiptDate
            if (entry.receiptDate) {
              const rDate = new Date(entry.receiptDate);
              const today = new Date();
              if (!isNaN(rDate.getTime())) {
                const diffTime = Math.abs(today - rDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                entry.aging = diffDays;
              }
            }
          }
          // ----------------------------

          if (user.role !== "ADMIN") {
            const uRole = String(user.role).toLowerCase();
            const eBranch = String(entry.branch).toLowerCase();
            if (uRole === 'bangalore') {
              if (eBranch !== 'bangalore' && eBranch !== 'ro kar') continue;
            } else if (eBranch !== uRole) {
              continue;
            }
          }

          // Normalize branch name if it matches a known branch in any case
          let canonicalBranch = BRANCHES.find(b => b.toLowerCase() === String(entry.branch).toLowerCase());

          // Alias HYD to Hyderabad, MP to Madhya Pradesh during import normalization
          const branchUpper = String(entry.branch).toUpperCase();
          if (branchUpper === "HYD" || branchUpper === "HYDERABAD") {
            canonicalBranch = "Hyderabad";
          } else if (branchUpper === "MP") {
            canonicalBranch = "Madhya Pradesh";
          }

          if (canonicalBranch) entry.branch = canonicalBranch;

          entry.aging = parseInt(entry.aging) || 0;
          entries.push(entry);
        }

        if (entries.length) {
          // --- Duplicate Detection Logic ---
          const existingIds = new Set(data.map(d => String(d.id).trim()));
          const filteredEntries = entries.filter(e => !existingIds.has(String(e.id).trim()));
          const skippedCount = entries.length - filteredEntries.length;

          if (skippedCount > 0) {
            showToast(`Duplicate IDs ignored: ${skippedCount} records already exists.`, 'warning', 7000);
          }

          if (filteredEntries.length === 0) {
            if (skippedCount > 0) return; // Already showed duplicate warning
            showToast("No new records found in file.", "info");
            return;
          }
          // ---------------------------------

          setImporting(true);
          showToast(`Importing ${filteredEntries.length} new cases...`, 'info');
          try {
            await axios.post(`${API_URL}/bulk`, filteredEntries);
            showToast(`Successfully imported ${filteredEntries.length} records`, 'success');
            loadData();
          } catch (err) {
            console.error("Bulk upload error:", err);
            const errMsg = err.response?.data?.message || err.message;
            showToast(`Import failed: ${errMsg}`, 'error');
          } finally {
            setImporting(false);
          }
        } else {
          showToast('No valid records found for import', 'info');
        }
      } catch (err) {
        showToast('Import error: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleExport = () => {
    if (!filteredData.length) return showToast("No data to export");
    const columns = ["date", "closedDate", "id", "branch", "brand", "reason", "city", "aging", "status", "remark"];
    const headers = ["Date", "Closed Date", "ID", "Branch", "Brand", "Reason", "City", "Aging", "Status", "Remark"];

    let csv = headers.join(",") + "\n";
    filteredData.forEach(row => {
      csv += columns.map(col => {
        let val = row[col] || "";
        if (col === 'date' || col === 'closedDate') {
          val = formatDisplayDate(val);
        }
        if (String(val).includes(",") || String(val).includes('"')) {
          val = `"${String(val).replace(/"/g, '""')}"`;
        }
        return val;
      }).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "escalations_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReportExport = () => {
    if (!reportData.length) return showToast("No data to export");
    const columns = ["branch", "total", "open", "closed", "cancelled", "avgAging", "compliance"];
    const headers = ["Branch", "Total", "Open", "Closed", "Cancelled", "Avg Aging", "Compliance (%)"];

    let csv = headers.join(",") + "\n";
    reportData.forEach(row => {
      csv += columns.map(col => {
        let val = row[col] || "0";
        if (String(val).includes(",") || String(val).includes('"')) {
          val = `"${String(val).replace(/"/g, '""')}"`;
        }
        return val;
      }).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Branch_Performance_Summary_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Report Logic
  const reportData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const relevant = user?.role === "ADMIN" ? data : data.filter(d => {
      const uRole = String(user?.role || "").toLowerCase();
      const dBranch = String(d.branch || "").toLowerCase();
      if (uRole === 'bangalore') {
        return dBranch === 'bangalore' || dBranch === 'ro kar';
      }
      return dBranch === uRole;
    });
    const filtered = deferredFilters.date ? relevant.filter(d => {
      if (!d || !d.date) return false;
      const dbDateStr = String(d.date).trim();
      const searchDate = deferredFilters.date;

      const dbParts = dbDateStr.split('-');
      if (dbParts.length !== 3) return dbDateStr.includes(searchDate);

      let y, dPart, mPart;
      if (dbParts[0].length === 4) {
        [y, mPart, dPart] = dbParts;
      } else {
        [dPart, mPart, y] = dbParts;
      }

      const yS = String(y);
      const mS = String(mPart).padStart(2, '0');
      const dS = String(dPart).padStart(2, '0');

      if (`${yS}-${mS}-${dS}` === searchDate) return true;
      if (`${yS}-${dS}-${mS}` === searchDate) return true;

      return false;
    }) : relevant;

    const stats = {};
    const branchList = Array.isArray(BRANCHES) ? BRANCHES : [];
    branchList.forEach(b => {
      if (user?.role && user.role !== "ADMIN" && user.roleType !== 'BRAND') {
        const uRole = String(user.role).toLowerCase();
        const bLower = b.toLowerCase();
        if (uRole === 'bangalore') {
          if (bLower !== 'bangalore' && bLower !== 'ro kar') return;
        } else if (bLower !== uRole) {
          return;
        }
      }
      stats[b] = { total: 0, open: 0, closed: 0, cancelled: 0, totalAging: 0 };
    });

    filtered.forEach(d => {
      if (!d) return;
      const dBranchLower = String(d.branch || "").toLowerCase();
      let canonicalBranch = branchList.find(b => b.toLowerCase() === dBranchLower);
      if (!canonicalBranch || !stats[canonicalBranch]) return;

      stats[canonicalBranch].total++;
      stats[canonicalBranch].totalAging += (d.aging || 0);
      const s = String(d.status || "").toLowerCase();
      if (s === "open") stats[canonicalBranch].open++;
      else if (s === "closed") stats[canonicalBranch].closed++;
      else if (s === "cancelled") stats[canonicalBranch].cancelled++;
    });

    return Object.keys(stats).sort().map(branch => {
      const s = stats[branch];
      const avgAging = s.total > 0 ? (s.totalAging / s.total).toFixed(1) : "0.0";
      const compliance = s.total > 0 ? Math.round((s.closed / s.total) * 100) : 0;
      return { branch, ...s, avgAging, compliance };
    });
  }, [data, deferredFilters, user]);

  const chartData = useMemo(() => {
    if (!Array.isArray(filteredData)) return { labels: [], datasets: [] };
    const branches = [...new Set(filteredData.map(d => d.branch))].filter(Boolean);
    return {
      labels: branches,
      datasets: [{
        label: 'Open Cases',
        data: branches.map(b => filteredData.filter(d => d && d.branch === b && String(d.status || "").toLowerCase() === 'open').length),
        backgroundColor: '#6366f1'
      }]
    };
  }, [filteredData]);

  const agingBarData = useMemo(() => {
    if (!Array.isArray(filteredData)) return { labels: [], datasets: [] };
    const activeData = filteredData.filter(d =>
      d &&
      String(d.status || '').toLowerCase() !== 'closed' &&
      String(d.status || '').toLowerCase() !== 'cancelled'
    );

    const counts = {};
    activeData.forEach(d => {
      const aging = Number(d.aging || 0);
      counts[aging] = (counts[aging] || 0) + 1;
    });

    const range = Object.keys(counts).map(Number);
    range.sort((a, b) => {
      const aIsRed = a > 5;
      const bIsRed = b > 5;
      if (aIsRed && !bIsRed) return -1;
      if (!aIsRed && bIsRed) return 1;
      return a - b;
    });

    return {
      labels: range.map(a => `${a} Days`),
      datasets: [{
        label: 'Number of Cases',
        data: range.map(a => counts[a]),
        backgroundColor: range.map(a => a > 5 ? '#ef4444' : '#6366f1'),
        borderRadius: 4
      }]
    };
  }, [filteredData]);

  const brandBarData = useMemo(() => {
    const brands = Array.isArray(BRANDS) ? BRANDS : [];
    if (!Array.isArray(filteredData)) return { labels: brands, datasets: [] };
    return {
      labels: brands,
      datasets: [{
        label: 'Cases by Brand',
        data: brands.map(brand => filteredData.filter(d => d && String(d.brand || "").toLowerCase() === brand.toLowerCase()).length),
        backgroundColor: '#6366f1',
        borderRadius: 4
      }]
    };
  }, [filteredData]);

  const doughnutData = useMemo(() => {
    const stats = { open: 0, aging: 0, closed: 0, cancelled: 0 };
    if (Array.isArray(filteredData)) {
      filteredData.forEach(d => {
        if (!d) return;
        const s = String(d.status || "").toLowerCase();
        if (s === 'closed') stats.closed++;
        else if (s === 'cancelled') stats.cancelled++;
        else if (Number(d.aging || 0) > 5) stats.aging++;
        else stats.open++;
      });
    }
    return {
      labels: ['Open/New', 'Aging (>5 Days)', 'Closed', 'Cancelled'],
      datasets: [{
        data: [stats.open, stats.aging, stats.closed, stats.cancelled],
        backgroundColor: ['#fef08a', '#ff0000', '#10b981', '#94a3b8'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }, [filteredData]);

  // CRM Dashboard chart data: blue bars = total, orange line = open per branch
  const crmBranchChartData = useMemo(() => {
    if (!Array.isArray(filteredData)) return { labels: [], datasets: [] };
    // Aggregate all branches including UP EAST/UP WEST merged into Uttar Pradesh
    const branchMap = {};
    filteredData.forEach(d => {
      if (!d) return;
      let bName = String(d.branch || '').trim();
      const bLower = bName.toLowerCase();
      // Merge sub-branches and typos
      if (bLower === 'mumbai') bName = 'Mum_Thn';
      
      if (!bName) return;
      if (!branchMap[bName]) branchMap[bName] = { total: 0, open: 0 };
      branchMap[bName].total++;
      if (String(d.status || '').toLowerCase() === 'open') branchMap[bName].open++;
    });
    const labels = Object.keys(branchMap).sort();
    return {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Grand Total',
          data: labels.map(b => branchMap[b].total),
          backgroundColor: '#1e5f8e',
          borderRadius: 4,
          order: 2
        },
        {
          type: 'line',
          label: 'Open',
          data: labels.map(b => branchMap[b].open),
          borderColor: '#f97316',
          backgroundColor: '#f97316',
          pointBackgroundColor: '#f97316',
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.3,
          fill: false,
          order: 1
        }
      ]
    };
  }, [filteredData]);

  const handleDownloadCRMPDF = async () => {
    try {
      showToast('Generating Premium CRM PDF...', 'info');
      const chartInstance = crmChartRef.current;
      if (!chartInstance) {
        showToast('CRM Chart not ready. Please wait.', 'error');
        return;
      }

      // Enable data labels for capture
      chartInstance.options.plugins.pdfLabelsPlugin = { enabled: true };
      chartInstance.update('none'); // Silent update for fast capture

      const sourceCanvas = chartInstance.canvas;
      const scaleFactor = 4; // ultra-sharp 4x scale
      const hiResCanvas = document.createElement('canvas');
      hiResCanvas.width = sourceCanvas.width * scaleFactor;
      hiResCanvas.height = sourceCanvas.height * scaleFactor;
      const hiResCtx = hiResCanvas.getContext('2d');
      hiResCtx.fillStyle = '#ffffff';
      hiResCtx.fillRect(0, 0, hiResCanvas.width, hiResCanvas.height);
      hiResCtx.imageSmoothingEnabled = true;
      hiResCtx.imageSmoothingQuality = 'high';
      hiResCtx.drawImage(sourceCanvas, 0, 0, hiResCanvas.width, hiResCanvas.height);
      const imgData = hiResCanvas.toDataURL('image/png', 1.0);

      // Revert labels for UI cleanliness
      chartInstance.options.plugins.pdfLabelsPlugin = { enabled: false };
      chartInstance.update('none');

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Formal Background & High-Fidelity Header
      pdf.setFillColor(248, 250, 252); // Soft light grey background for white space
      pdf.rect(0, 0, pageW, pageH, 'F');
      
      pdf.setFillColor(15, 23, 42); // Deep Slate Navy header
      pdf.rect(0, 0, pageW, 28, 'F');
      
      pdf.setFontSize(22);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.text('PERFORMANCE ANALYTICS - VE CARE', pageW / 2, 13, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184); // Muted slate-300
      pdf.setFont(undefined, 'normal');
      pdf.text(`EXECUTIVE PERFORMANCE DASHBOARD  |  Report Date: ${new Date().toLocaleDateString()}  |  Time: ${new Date().toLocaleTimeString()}`, pageW / 2, 21, { align: 'center' });

      // Impact Summary Cards (Metrics at top)
      const totalCases = crmBranchChartData.datasets[0].data.reduce((a, b) => a + b, 0);
      const totalOpen = crmBranchChartData.datasets[1].data.reduce((a, b) => a + b, 0);
      const complianceRate = totalCases > 0 ? Math.round(((totalCases - totalOpen) / totalCases) * 100) : 0;

      const cardW = 60;
      const cardStartX = (pageW - (cardW * 3 + 10)) / 2;
      
      const drawMetricCard = (x, label, value, color) => {
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, 32, cardW, 18, 2, 2, 'F');
        pdf.setDrawColor(226, 232, 240); // slate-200 border
        pdf.roundedRect(x, 32, cardW, 18, 2, 2, 'S');
        
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139); // slate-500
        pdf.text(label, x + cardW / 2, 38, { align: 'center' });
        
        pdf.setFontSize(14);
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(String(value), x + cardW / 2, 45, { align: 'center' });
      };

      drawMetricCard(cardStartX, 'GROSS ESCALATIONS', totalCases, [15, 23, 42]);
      drawMetricCard(cardStartX + cardW + 5, 'TOTAL ACTIVE OPEN', totalOpen, [249, 115, 22]);
      drawMetricCard(cardStartX + (cardW + 5) * 2, 'GLOBAL COMPLIANCE', `${complianceRate}%`, complianceRate > 80 ? [16, 185, 129] : [249, 115, 22]);

      // Professional Chart Legend
      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont(undefined, 'bold');
      pdf.setFillColor(30, 95, 142);
      pdf.rect(pageW/2 - 40, 56, 5, 5, 'F');
      pdf.text('Grand Total Cases', pageW/2 - 32, 60);

      pdf.setFillColor(249, 115, 22);
      pdf.rect(pageW/2 + 10, 56, 5, 5, 'F');
      pdf.text('Active Open Cases', pageW/2 + 18, 60);

      // The Graph Area - SHARP & CLEAR
      const chartImgY = 65;
      const chartImgH = pageH - chartImgY - 15;
      
      // Shadow effect for the chart box
      pdf.setFillColor(255, 255, 255);
      pdf.rect(8, chartImgY - 2, pageW - 16, chartImgH + 4, 'F');
      pdf.setDrawColor(203, 213, 225); // slate-300
      pdf.rect(8, chartImgY - 2, pageW - 16, chartImgH + 4, 'S');
      
      pdf.addImage(imgData, 'PNG', 10, chartImgY, pageW - 20, chartImgH);

      // Global Footer
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont(undefined, 'normal');
      pdf.text('© VE CARE PERFORMANCE ANALYTICS ENGINE - PROPRIETARY & CONFIDENTIAL - Page 1 of 1', pageW / 2, pageH - 6, { align: 'center' });

      pdf.save(`Executive_Performance_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Executive PDF downloaded!', 'success');
    } catch (error) {
      console.error('CRM PDF Error:', error);
      showToast('Failed to generate PDF: ' + error.message, 'error');
    }
  };

  const handleDownloadPDF = () => {
    try {
      showToast('Generating PDF...', 'info');

      const chartInstance = branchChartRef.current;
      if (!chartInstance) {
        showToast('Chart not ready. Please wait for data to load.', 'error');
        return;
      }

      // HIGH QUALITY: Upscale canvas 3x for crisp output
      const sourceCanvas = chartInstance.canvas;
      const scaleFactor = 3;
      const hiResCanvas = document.createElement('canvas');
      hiResCanvas.width = sourceCanvas.width * scaleFactor;
      hiResCanvas.height = sourceCanvas.height * scaleFactor;
      const hiResCtx = hiResCanvas.getContext('2d');
      hiResCtx.drawImage(sourceCanvas, 0, 0, hiResCanvas.width, hiResCanvas.height);
      const imgData = hiResCanvas.toDataURL('image/png', 1.0);

      // Calculate dynamic height to fit into a single page
      const numRows = Array.isArray(chartData.labels) ? chartData.labels.length : 0;
      const estChartH = (sourceCanvas.height / sourceCanvas.width) * (297 - 20);
      const finalChartH = estChartH > 80 ? 80 : estChartH;
      const requiredHeight = 40 + finalChartH + 15 + 8 + (numRows * 8) + 30; // chartY + chartH + gap + table header + table rows + footer gap
      const pageHeight = Math.max(210, requiredHeight);

      // Single continuous page PDF
      const pdf = new jsPDF('l', 'mm', [297, pageHeight]);
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Formal Header Setup
      pdf.setFillColor(41, 128, 185); // Official Blue color header bar
      pdf.rect(0, 0, pageW, 25, 'F');
      
      pdf.setFontSize(22);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.text('OFFICIAL ESCALATION REPORT - VE CARE', pageW / 2, 12, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setTextColor(230, 230, 230);
      pdf.setFont(undefined, 'normal');
      pdf.text(`CONFIDENTIAL INTERNAL DOCUMENT  |  Generated on: ${new Date().toLocaleString()}`, pageW / 2, 19, { align: 'center' });

      // Subheader text
      pdf.setFontSize(14);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont(undefined, 'bold');
      pdf.text('1. Branch Escalation Analytics Overview', 10, 35);

      // Chart image setup
      const chartImgY = 40;
      const chartImgW = pageW - 20;
      // Calculate height maintaining aspect ratio, but cap at 80 to leave room for table
      let chartImgH = (sourceCanvas.height / sourceCanvas.width) * chartImgW;
      if (chartImgH > 80) chartImgH = 80;
      
      pdf.addImage(imgData, 'PNG', 10, chartImgY, chartImgW, chartImgH);

      // Open Cases Table Header
      const tableStartY = chartImgY + chartImgH + 15;
      pdf.setFontSize(14);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont(undefined, 'bold');
      pdf.text('2. Branch Wise Open Case Register', 10, tableStartY);

      const col1X = 10, col2X = pageW / 2 + 10;
      const rowH = 8;
      let rowY = tableStartY + 8;

      const printTableHeader = () => {
        pdf.setFillColor(41, 128, 185);
        pdf.rect(10, rowY - 6, pageW - 20, rowH, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text('BRANCH DESIGNATION', col1X + 3, rowY - 0.5);
        pdf.text('ACTIVE OPEN CASES', col2X + 3, rowY - 0.5);
        rowY += rowH;
      };

      printTableHeader();

      // Rows (with page break logic)
      pdf.setFont(undefined, 'normal');
      const labels = Array.isArray(chartData.labels) ? chartData.labels : [];
      labels.forEach((branch, idx) => {
        // Page break if necessary
        if (rowY > pageH - 15) {
          pdf.addPage();
          rowY = 20;
          printTableHeader();
        }

        const count = chartData.datasets[0]?.data[idx] ?? 0;
        const isEven = idx % 2 === 0;
        
        // Zebra striping
        pdf.setFillColor(isEven ? 245 : 255, isEven ? 245 : 255, isEven ? 245 : 255);
        pdf.rect(10, rowY - 6, pageW - 20, rowH, 'F');
        
        // Row Border
        pdf.setDrawColor(220, 220, 220);
        pdf.rect(10, rowY - 6, pageW - 20, rowH, 'S');

        pdf.setTextColor(40, 40, 40);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.text(String(branch).toUpperCase(), col1X + 3, rowY - 0.5);
        
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(count > 0 ? 180 : 80, count > 0 ? 40 : 80, 40);
        pdf.text(`${count}`, col2X + 3, rowY - 0.5);
        
        rowY += rowH;
      });

      // Footer
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.setFont(undefined, 'normal');
        pdf.text(`© VE CARE - Formal Escalation Dispatch Report System - Do Not Distribute - Page ${i} of ${totalPages}`, pageW / 2, pageH - 5, { align: 'center' });
      }

      pdf.save(`Branch_Escalation_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('PDF downloaded!', 'success');
    } catch (error) {
      console.error('PDF Error:', error);
      showToast('Failed to generate PDF: ' + error.message, 'error');
    }
  };

  const SkeletonStats = () => (
    <div className="stats-grid">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="stat-card skeleton" style={{ height: '110px' }}></div>
      ))}
    </div>
  );

  const SkeletonTable = () => (
    <div className="table-section">
      <div className="table-header skeleton" style={{ height: '60px', marginBottom: '1rem' }}></div>
      <div className="table-container">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '50px', margin: '0.5rem 1.5rem', borderRadius: '0.25rem' }}></div>
        ))}
      </div>
    </div>
  );

  if (!user) {
    return (
      <div id="loginScreen">
        <ParticleBackground />
        <div className="login-bg"></div>
        <div className="login-blob blob-1"></div>
        <div className="login-blob blob-2"></div>
        <div className="login-blob blob-3"></div>
        <img src={logo} className="logo-watermark" alt="Watermark" />
        <form className="login-card" onSubmit={handleLogin}>
          <img src={logo} className="login-logo" alt="VE CARE Logo" />
          <h1 className="login-title">Escalation Dashboard</h1>
          <p className="login-subtitle">Secure Access Management</p>
          
          <div className="login-mode-switcher">
            <button type="button" className={`login-mode-btn ${loginMode === 'BRAND' ? 'active' : ''}`} onClick={() => { setLoginMode('BRAND'); setSelectedEntity(''); setLoginError(''); }}>Brands</button>
            <button type="button" className={`login-mode-btn ${loginMode === 'BRANCH' ? 'active' : ''}`} onClick={() => { setLoginMode('BRANCH'); setSelectedEntity(''); setLoginError(''); }}>Branches</button>
            <button type="button" className={`login-mode-btn ${loginMode === 'ADMIN' ? 'active' : ''}`} onClick={() => { setLoginMode('ADMIN'); setSelectedEntity(''); setLoginError(''); }}>Admin</button>
          </div>

          {loginMode === 'BRAND' && (
            <div className="flex flex-col gap-1" style={{ marginBottom: '1.25rem' }}>
               <input 
                 name="loginBrand" 
                 type="text" 
                 className="login-input" 
                 placeholder="Enter Brand Name (e.g. SALORA)" 
                 required 
                 autoComplete="off"
               />
            </div>
          )}

          {loginMode === 'BRANCH' && (
            <div className="chip-grid-wrapper">
              <div className="chip-grid">
                {BRANCHES.map(item => (
                  <div 
                    key={item} 
                    className={`chip ${selectedEntity === item ? 'active' : ''}`}
                    onClick={() => { setSelectedEntity(item); setLoginError(''); }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <div style={{ position: 'relative' }}>
              <input
                name="loginPass"
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder="Password"
                required
                style={{ paddingRight: '3.5rem' }}
              />
              <div
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1.25rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  marginTop: '-0.6rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
          </div>
          {loginError && (
            <div style={{
              color: 'var(--danger)',
              fontSize: '0.85rem',
              textAlign: 'center',
              marginBottom: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600'
            }}>
              {loginError}
            </div>
          )}
          <button type="submit" className="btn-login">Enter Dashboard</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Apple Welcome Overlay */}
      {showAppleWelcome && <AppleWelcome text={welcomeText} />}

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast" style={{ borderColor: t.type === 'error' ? 'var(--danger)' : t.type === 'success' ? 'var(--success)' : 'var(--primary)' }}>
            <span>{t.type === 'success' ? '✅' : 'ℹ️'}</span>
            <div>{t.msg}</div>
          </div>
        ))}
      </div>

      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <img src={logo} className="brand-logo" alt="Logo" />
          {!isSidebarCollapsed && <div className="brand-text">VE CARE</div>}
        </div>
        <nav className="flex-col gap-2">
          <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <LayoutDashboard size={18} /> {!isSidebarCollapsed && "Dashboard"}
          </div>
          <div className={`nav-item ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>
            <TrendingUp size={18} /> {!isSidebarCollapsed && "Reports"}
          </div>
        </nav>

        <div className="sidebar-toggle" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </div>

        <div className="user-profile">
          <div className="avatar">{user.role[0]}</div>
          {!isSidebarCollapsed && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="text-sm font-bold">Welcome</div>
              <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.role}</div>
            </div>
          )}
          <div className="cursor-pointer" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </div>
        </div>
      </aside>

      <main className={`main-content ${!isSidebarCollapsed ? 'sidebar-open' : ''} ${loading ? 'opacity-50' : ''}`}>
        <header className="top-bar">
          <div className="flex flex-col">
            <h2 className="page-title">{view === 'dashboard' ? 'Overview' : 'Reports'}</h2>
            <div className="text-xs flex items-center gap-1" style={{ opacity: 0.7 }}>
              Status: <span style={{ color: dbStatus === 'Connected' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                {dbStatus === 'Connected' ? '🟢 Connected' : '🔴 Database Offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Quick Search..."
                className="btn-sm"
                style={{ paddingLeft: '2.5rem', borderRadius: '99px', width: '220px' }}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            </div>
            <div className="text-sm font-bold">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </header>

        <div className="view-transition-active">
          {view === 'dashboard' ? (
            <div className="dashboard-scroll">
            <div className={`dashboard-body-container ${!isSidebarCollapsed ? 'sidebar-open' : ''}`}>
              {loading ? <SkeletonStats /> : (
                <div className="metrics-grid">
                  <div className="stat-card">
                    <div className="stat-info">
                      <h4>Total Cases</h4>
                      <div className="value">{filteredData.length}</div>
                    </div>
                    <div className="icon-box bg-blue-100"><BarChart3 size={24} /></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-info">
                      <h4>Total Open</h4>
                      <div className="value">{filteredData.filter(d => String(d.status || "").toLowerCase() === 'open').length}</div>
                    </div>
                    <div className="icon-box bg-red-100"><AlertTriangle size={24} /></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-info">
                      <h4>Closed</h4>
                      <div className="value">{filteredData.filter(d => String(d.status || "").toLowerCase() === 'closed').length}</div>
                    </div>
                    <div className="icon-box bg-green-100"><CheckCircle2 size={24} /></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-info">
                      <h4>Cancelled</h4>
                      <div className="value">{filteredData.filter(d => String(d.status || "").toLowerCase() === 'cancelled').length}</div>
                    </div>
                    <div className="icon-box bg-gray-100" style={{ color: '#64748b' }}><XCircle size={24} /></div>
                  </div>
                  <div className="stat-card" style={{ border: '1px solid var(--warning)' }}>
                    <div className="stat-info">
                      <h4 style={{ color: 'var(--warning)' }}>Aging ({'>'} 5 Days)</h4>
                      <div className="value" style={{ WebkitTextFillColor: 'var(--warning)' }}>
                        {filteredData.filter(d => String(d.status || "").toLowerCase() !== 'closed' && String(d.status || "").toLowerCase() !== 'cancelled' && d.aging > 5).length}
                      </div>
                    </div>
                    <div className="icon-box bg-yellow-100"><AlertTriangle size={24} /></div>
                  </div>
                </div>
              )}

              <div className={`charts-grid ${!isSidebarCollapsed ? 'sidebar-open' : ''} ${loading ? 'opacity-20' : ''}`}>
                <div className="chart-card">
                  <h3>Status</h3>
                  <div className="chart-container">
                    <Doughnut data={doughnutData} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '75%',
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 }
                          }
                        },
                        glowPlugin: {}
                      }
                    }} plugins={[glowPlugin]} />
                  </div>
                </div>
                <div className="chart-card">
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>{(user?.role === 'ADMIN' || user?.roleType === 'BRAND') ? 'CRM Dashboard – Branch Overview' : 'Case Aging'}</h3>
                    {(user?.role === 'ADMIN' || user?.roleType === 'BRAND') && (
                      <div className="flex items-center gap-2">
                        <button className="btn-sm flex items-center gap-1" onClick={handleDownloadPDF} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                          <FileDown size={14} /> Open Cases PDF
                        </button>
                        <button className="btn-sm flex items-center gap-1" onClick={handleDownloadCRMPDF} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'linear-gradient(135deg,#1e5f8e,#f97316)', color: '#fff', border: 'none' }}>
                          <FileDown size={14} /> CRM PDF
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="chart-container chart-scroll-container" ref={pdfChartRef} style={{ overflowX: 'auto', overflowY: 'hidden', display: 'block', paddingBottom: '10px' }}>
                    <div style={{ width: `${Math.max(100, ((user?.role === 'ADMIN' || user?.roleType === 'BRAND') ? crmBranchChartData.labels.length : agingBarData.labels.length) * 65)}px`, height: '100%', position: 'relative' }}>
                      {(user?.role === 'ADMIN' || user?.roleType === 'BRAND') ? (
                        <Chart
                          ref={crmChartRef}
                          type="bar"
                          data={crmBranchChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: true,
                                position: 'bottom',
                                labels: { usePointStyle: true, font: { size: 11 } }
                              },
                              tooltip: {
                                callbacks: {
                                  label: (context) => `${context.dataset.label}: ${context.raw}`
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(0,0,0,0.05)' },
                                title: { display: true, text: 'Cases', font: { size: 10, weight: 'bold' } }
                              },
                              x: {
                                grid: { display: false },
                                ticks: {
                                  autoSkip: false,
                                  maxRotation: 45,
                                  minRotation: 0,
                                  font: { size: 10 }
                                }
                              }
                            }
                          }}
                          plugins={[glowPlugin, pdfLabelsPlugin]}
                        />
                      ) : (
                        <Bar
                          ref={agingChartRef}
                          onClick={handleAgingChartClick}
                          data={agingBarData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: (context) => `Cases: ${context.raw}`
                                }
                              },
                              glowPlugin: {},
                              pdfLabelsPlugin: { enabled: false }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(0,0,0,0.05)' },
                                title: { display: true, text: 'Case Count', font: { size: 10, weight: 'bold' } }
                              },
                              x: {
                                grid: { display: false },
                                ticks: {
                                  autoSkip: false,
                                  maxRotation: 45,
                                  minRotation: 0,
                                  font: { size: 10 }
                                }
                              }
                            }
                          }} plugins={[glowPlugin]} />
                      )}
                    </div>
                  </div>
                </div>
                {user?.roleType === 'BRAND' && (
                  <div className="chart-card">
                    <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0 }}>Case Aging</h3>
                    </div>
                    <div className="chart-container chart-scroll-container">
                      <div style={{ width: `${Math.max(100, agingBarData.labels.length * 65)}px`, height: '100%', position: 'relative' }}>
                        <Bar
                          onClick={handleAgingChartClick}
                          data={agingBarData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: (context) => `Cases: ${context.raw}`
                                }
                              },
                              glowPlugin: {},
                              pdfLabelsPlugin: { enabled: false }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(0,0,0,0.05)' },
                                title: { display: true, text: 'Case Count', font: { size: 10, weight: 'bold' } }
                              },
                              x: {
                                grid: { display: false },
                                ticks: {
                                  autoSkip: false,
                                  maxRotation: 45,
                                  minRotation: 0,
                                  font: { size: 10 }
                                }
                              }
                            }
                          }} plugins={[glowPlugin]} />
                      </div>
                    </div>
                  </div>
                )}
                {user?.roleType !== 'BRAND' && (
                  <div className="chart-card">
                    <h3>Brand Escalation</h3>
                    <div className="chart-container">
                      <Bar data={brandBarData} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        },
                        scales: {
                          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                        }
                      }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {loading || importing ? <SkeletonTable /> : (
                <div className="table-section">
                  <div className="table-header">
                    <div className="flex items-center gap-4">
                      <h3 className="font-bold">Recent Escalations</h3>
                      {(user?.role === 'ADMIN' || user?.roleType === 'BRAND') && (
                        <button className="btn-sm btn-primary-sm" onClick={() => setModalOpen(true)}><Plus size={16} /> New Case</button>
                      )}
                    </div>
                    <div className="action-group">
                      <input
                        type="date"
                        className="btn-sm"
                        value={filters.date || ''}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                      />
                      {(user.role === 'ADMIN' || user?.roleType === 'BRAND' || (user.role && (String(user.role).toLowerCase() === 'bangalore' || String(user.role).toLowerCase() === 'uttar pradesh'))) && (
                        <select className="btn-sm" value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}>
                          <option value="">All Branches</option>
                          {BRANCHES.map(b => {
                            if (user.role !== 'ADMIN' && user?.roleType !== 'BRAND') {
                                const uRole = String(user.role).toLowerCase();
                                if (uRole === 'bangalore') {
                                    const bLower = b.toLowerCase();
                                    if (bLower !== 'bangalore' && bLower !== 'ro kar') return null;
                                }
                            }
                            return <option key={b}>{b}</option>;
                          })}
                        </select>
                      )}
                      <div className="flex flex-col gap-0.5">
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>Log Date</span>
                        <input
                          type="date"
                          className="btn-sm"
                          value={filters.date || ''}
                          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>Closed Date</span>
                        <input
                          type="date"
                          className="btn-sm"
                          value={filters.closedDate || ''}
                          onChange={(e) => setFilters({ ...filters, closedDate: e.target.value })}
                        />
                      </div>
                      <select className="btn-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">All Status</option>
                        <option>Open</option>
                        <option>Closed</option>
                        <option>Cancelled</option>
                      </select>
                      <select className="btn-sm" value={filters.serviceType} onChange={(e) => setFilters({ ...filters, serviceType: e.target.value })}>
                        <option value="">All Services</option>
                        <option>Field Service</option>
                        <option>Installation & Demo</option>
                      </select>
                      <input
                        list="brand-list"
                        className="btn-sm"
                        placeholder="Search Brand..."
                        style={{ width: '130px' }}
                        value={filters.brand}
                        onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                      />
                      <datalist id="brand-list">
                        {BRANDS.map(b => <option key={b} value={b} />)}
                      </datalist>
                      <input
                        type="text"
                        className="btn-sm"
                        placeholder="Search Aging..."
                        style={{ width: '120px' }}
                        value={filters.aging}
                        onChange={(e) => setFilters({ ...filters, aging: e.target.value })}
                      />
                      {(user?.role === 'ADMIN' || user?.roleType === 'BRAND') && (
                        <label className="btn-sm flex items-center gap-2">
                          <FileUp size={16} /> Import
                          <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleImport} />
                        </label>
                      )}
                      <button className="btn-sm flex items-center gap-2" onClick={handleExport}><FileDown size={16} /> Export</button>
                      {(user.role === 'ADMIN' || user?.roleType === 'BRAND') && (
                        <button className="btn-sm flex items-center gap-2" style={{ color: 'var(--danger)' }} onClick={handleClearAll}><Trash2 size={16} /> Clear</button>
                      )}
                    </div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Closed Date</th>
                          <th>Branch</th>
                          <th>Aging</th>
                          <th>Brand</th>
                          <th>ID</th>
                          <th>Service Type</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map(row => (
                          <tr key={row._id}>
                            <td>{formatDisplayDate(row.date)}</td>
                            <td>{formatDisplayDate(row.closedDate)}</td>
                            <td>{row.branch}</td>
                            <td>
                              <span className={`badge ${row.aging > 10 ? 'badge-danger' : row.aging > 5 ? 'badge-warning' : 'badge-success'}`}>
                                {row.aging} Days
                              </span>
                            </td>
                            <td>{row.brand}</td>
                            <td className="font-medium text-secondary">{row.id}</td>
                            <td>{row.serviceType}</td>
                            <td className="text-secondary" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.reason}</td>
                            <td>
                              <span className={`status-pill ${String(row.status || "").toLowerCase() === 'closed' ? 'closed' : String(row.status || "").toLowerCase() === 'cancelled' ? 'cancelled' : 'open'}`}>
                                {row.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button onClick={() => openEditModal(row)} className="btn-sm" style={{ padding: '0.25rem' }}><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(row._id)} className="btn-sm" style={{ padding: '0.25rem', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="dashboard-scroll">
              {loading ? <SkeletonTable /> : (
                <div className="table-section">
                  <div className="table-header">
                    <h3 className="font-bold">Branch Performance Summary</h3>
                    <div className="action-group">
                      <input
                        type="date"
                        className="btn-sm"
                        value={filters.date || ''}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                      />
                      <button className="btn-sm flex items-center gap-2" onClick={handleReportExport}>
                        <FileDown size={16} /> Export
                      </button>
                    </div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Branch</th>
                          <th>Total</th>
                          <th>Open</th>
                          <th>Closed</th>
                          <th>Cancelled</th>
                          <th>Avg Aging</th>
                          <th>Compliance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map(r => (
                          <tr key={r.branch}>
                            <td><b>{r.branch}</b></td>
                            <td>{r.total}</td>
                            <td>{r.open}</td>
                            <td>{r.closed}</td>
                            <td>{r.cancelled}</td>
                            <td>{r.avgAging}</td>
                            <td style={{ color: r.compliance > 80 ? 'var(--success)' : r.compliance > 50 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>{r.compliance}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main >

      {/* Modal */}
      {
        modalOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>{editingId ? 'Edit Case' : 'New Case'}</h3>
                <X className="cursor-pointer" onClick={closeCaseModal} />
              </div>
              <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                <div className="form-group">
                  <label>Reference ID</label>
                  <input required className="form-control" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date Logged</label>
                  <input type="date" required className="form-control" value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Closed Date</label>
                  <input type="date" className="form-control" value={formData.closedDate || ''} onChange={(e) => setFormData({ ...formData, closedDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <select
                    className="form-control"
                    required
                    disabled={user.role !== 'ADMIN' && user.roleType !== 'BRAND' && String(user.role || '').toLowerCase() !== 'bangalore'}
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  >
                    <option value="">Select Branch</option>
                    {BRANCHES.map(b => {
                      if (user.role !== 'ADMIN' && user.roleType !== 'BRAND' && String(user.role || '').toLowerCase() === 'bangalore') {
                        const bLower = b.toLowerCase();
                        if (bLower !== 'bangalore' && bLower !== 'ro kar') return null;
                      }
                      return <option key={b}>{b}</option>;
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label>Brand</label>
                  <select
                    className="form-control"
                    required
                    disabled={user?.roleType === 'BRAND'}
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  >
                    <option value="">Select Brand</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Service Type</label>
                  <select
                    className="form-control"
                    required
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  >
                    <option value="">Select Service Type</option>
                    <option>Field Service</option>
                    <option>Installation & Demo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-control" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option>Open</option>
                    <option>Closed</option>
                    <option>Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Aging Days</label>
                  <input type="number" className="form-control" value={formData.aging} onChange={(e) => setFormData({ ...formData, aging: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Reason</label>
                  <input className="form-control" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Remarks</label>
                  <textarea className="form-control" rows="3" value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} />
                </div>
                <div className="flex gap-2" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                  <button type="button" className="btn-sm" style={{ flex: 1 }} onClick={closeCaseModal}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ flex: 2 }}>{editingId ? 'Update' : 'Save'} Record</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Aging Detail Modal */}
      {agingDetailModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>Cases with {selectedAging} Days Aging</h3>
              <X className="cursor-pointer" onClick={() => setAgingDetailModalOpen(false)} />
            </div>
            <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Closed Date</th>
                    <th>Brand</th>
                    <th>ID</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAgingCases.map(row => (
                    <tr key={row._id}>
                      <td>{formatDisplayDate(row.date)}</td>
                      <td>{formatDisplayDate(row.closedDate)}</td>
                      <td>{row.brand}</td>
                      <td>{row.id}</td>
                      <td>
                        <button onClick={() => { setAgingDetailModalOpen(false); openEditModal(row); }} className="btn-sm">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
