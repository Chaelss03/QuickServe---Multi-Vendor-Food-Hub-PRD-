
import React, { useState, useMemo, useEffect } from 'react';
import { User, Restaurant, Order, Area, OrderStatus } from '../types';
import { Users, Store, TrendingUp, Settings, ShieldCheck, Mail, Search, Filter, X, Plus, MapPin, Power, CheckCircle2, AlertCircle, LogIn, Trash2, LayoutGrid, List, ChevronRight, Eye, Globe, Phone, ShoppingBag, Edit3, Hash, Download, Calendar, ChevronLeft, Database, Image as ImageIcon, Key, QrCode, Printer, Layers } from 'lucide-react';

interface Props {
  vendors: User[];
  restaurants: Restaurant[];
  orders: Order[];
  locations: Area[];
  onAddVendor: (user: User, restaurant: Restaurant) => void;
  onUpdateVendor: (user: User, restaurant: Restaurant) => void;
  onImpersonateVendor: (user: User) => void;
  onAddLocation: (area: Area) => void;
  onUpdateLocation: (area: Area) => void;
  onDeleteLocation: (areaId: string) => void;
  onRemoveVendorFromHub: (restaurantId: string) => void;
}

const AdminView: React.FC<Props> = ({ vendors, restaurants, orders, locations, onAddVendor, onUpdateVendor, onImpersonateVendor, onAddLocation, onUpdateLocation, onDeleteLocation, onRemoveVendorFromHub }) => {
  const [activeTab, setActiveTab] = useState<'VENDORS' | 'LOCATIONS' | 'REPORTS' | 'SYSTEM'>('VENDORS');
  const [searchQuery, setSearchQuery] = useState('');
  const [hubSearchQuery, setHubSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Registration / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<{user: User, res: Restaurant} | null>(null);
  const [formVendor, setFormVendor] = useState({
    username: '',
    password: '',
    restaurantName: '',
    location: '',
    email: '',
    phone: '',
    logo: ''
  });

  // Hub Modal State
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [newArea, setNewArea] = useState({ name: '', city: '', state: '', code: '' });
  const [viewingHubVendors, setViewingHubVendors] = useState<Area | null>(null);
  const [editingArea, setEditingArea] = useState<Area | null>(null);

  // QR Modal State
  const [generatingQrHub, setGeneratingQrHub] = useState<Area | null>(null);
  const [qrMode, setQrMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [qrTableNo, setQrTableNo] = useState<string>('1');
  const [qrStartRange, setQrStartRange] = useState<string>('1');
  const [qrEndRange, setQrEndRange] = useState<string>('10');

  // Reports State (Platform Wide)
  const [reportStatus, setReportStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [reportStart, setReportStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First of current month
    return d.toISOString().split('T')[0];
  });
  const [reportEnd, setReportEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const res = restaurants.find(r => r.id === vendor.restaurantId);
      const matchesSearch = vendor.username.toLowerCase().includes(searchQuery.toLowerCase()) || res?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = vendorFilter === 'ALL' ? true : (vendorFilter === 'ACTIVE' ? vendor.isActive : !vendor.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [vendors, restaurants, searchQuery, vendorFilter]);

  const filteredHubs = useMemo(() => {
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(hubSearchQuery.toLowerCase()) ||
      loc.city.toLowerCase().includes(hubSearchQuery.toLowerCase()) ||
      loc.code.toLowerCase().includes(hubSearchQuery.toLowerCase())
    );
  }, [locations, hubSearchQuery]);

  // Platform Wide Reports Memo
  const filteredReports = useMemo(() => {
    return orders.filter(o => {
      const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
      const matchesDate = orderDate >= reportStart && orderDate <= reportEnd;
      const matchesStatus = reportStatus === 'ALL' || o.status === reportStatus;
      return matchesDate && matchesStatus;
    });
  }, [orders, reportStart, reportEnd, reportStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredReports.length, entriesPerPage, reportStatus, reportStart, reportEnd]);

  const totalPages = Math.ceil(filteredReports.length / entriesPerPage);
  const paginatedReports = useMemo(() => {
    const startIdx = (currentPage - 1) * entriesPerPage;
    return filteredReports.slice(startIdx, startIdx + entriesPerPage);
  }, [filteredReports, currentPage, entriesPerPage]);

  const handleDownloadReport = () => {
    if (filteredReports.length === 0) return;
    
    const headers = ['Order ID', 'Restaurant', 'Time', 'Status', 'Items', 'Total'];
    const rows = filteredReports.map(o => {
      const res = restaurants.find(r => r.id === o.restaurantId);
      return [
        o.id,
        res?.name || 'Unknown',
        new Date(o.timestamp).toLocaleString(),
        o.status,
        o.items.map(i => `${i.name} (x${i.quantity})`).join('; '),
        o.total.toFixed(2)
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `platform_sales_report_${reportStart}_to_${reportEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenEdit = (user: User) => {
    const res = restaurants.find(r => r.id === user.restaurantId);
    if (res) {
      setEditingVendor({ user, res });
      setFormVendor({
        username: user.username,
        password: user.password || '',
        restaurantName: res.name,
        location: res.location,
        email: user.email || '',
        phone: user.phone || '',
        logo: res.logo
      });
      setIsModalOpen(true);
    }
  };

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormVendor({ username: '', password: '', restaurantName: '', location: '', email: '', phone: '', logo: '' });
    setIsModalOpen(true);
  };

  const handleSubmitVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVendor.username || !formVendor.location) return;

    const userPayload: User = { 
      id: editingVendor?.user.id || '', 
      username: formVendor.username, 
      password: formVendor.password, 
      role: 'VENDOR', 
      email: formVendor.email, 
      phone: formVendor.phone,
      isActive: editingVendor ? editingVendor.user.isActive : true 
    };
    
    const resPayload: Restaurant = { 
      id: editingVendor?.res.id || '', 
      name: formVendor.restaurantName, 
      logo: formVendor.logo, 
      vendorId: editingVendor?.user.id || '', 
      location: formVendor.location, 
      menu: editingVendor?.res.menu || [] 
    };

    if (editingVendor) {
      onUpdateVendor(userPayload, resPayload);
    } else {
      onAddVendor(userPayload, resPayload);
    }
    setIsModalOpen(false);
  };

  const toggleVendorStatus = (user: User) => {
    const res = restaurants.find(r => r.id === user.restaurantId);
    if (res) {
      onUpdateVendor({ ...user, isActive: !user.isActive }, res);
    }
  };

  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    onAddLocation({ ...newArea, id: '', isActive: true });
    setIsAreaModalOpen(false);
    setNewArea({ name: '', city: '', state: '', code: '' });
  };

  const toggleHubStatus = (loc: Area) => {
    onUpdateLocation({ ...loc, isActive: !loc.isActive });
  };

  // Helper to construct QR URL
  const getQrUrl = (hubName: string, table: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const encodedLoc = encodeURIComponent(hubName);
    return `${baseUrl}?loc=${encodedLoc}&table=${table}`;
  };

  const handlePrintQr = () => {
    window.print();
  };

  const batchTables = useMemo(() => {
    const start = parseInt(qrStartRange) || 1;
    const end = parseInt(qrEndRange) || 1;
    const count = Math.min(Math.max(end - start + 1, 1), 100); // Limit to 100 per batch for safety
    return Array.from({ length: count }, (_, i) => (start + i).toString());
  }, [qrStartRange, qrEndRange]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black dark:text-white tracking-tighter uppercase leading-none mb-1">Platform Master</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] ml-1">Administrative Controls</p>
        </div>
        <div className="flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 border dark:border-gray-700 shadow-sm transition-colors">
          {[
            { id: 'VENDORS', label: 'Vendors', icon: Store },
            { id: 'LOCATIONS', label: 'Hubs', icon: MapPin },
            { id: 'REPORTS', label: 'Stats', icon: TrendingUp },
            { id: 'SYSTEM', label: 'System', icon: Database }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-widest ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-xl' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="no-print">
        {activeTab === 'VENDORS' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-700/50">
              <h3 className="font-black dark:text-white uppercase tracking-tighter text-lg">Partner Directory</h3>
              <div className="flex flex-wrap gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search..." className="pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="relative">
                   <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                   <select className="pl-11 pr-8 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm appearance-none outline-none font-bold" value={vendorFilter} onChange={e => setVendorFilter(e.target.value as any)}>
                      <option value="ALL">All Status</option>
                      <option value="ACTIVE">Active Only</option>
                      <option value="INACTIVE">Deactive Only</option>
                   </select>
                </div>
                <button onClick={handleOpenAdd} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">+ Register Vendor</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4 text-left">Kitchen Identity</th>
                    <th className="px-8 py-4 text-left">Hub</th>
                    <th className="px-8 py-4 text-left">Account</th>
                    <th className="px-8 py-4 text-center">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredVendors.map(vendor => {
                    const res = restaurants.find(r => r.id === vendor.restaurantId);
                    return (
                      <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <img src={res?.logo} className="w-10 h-10 rounded-xl shadow-sm object-cover border dark:border-gray-600" />
                            <div><span className="font-black dark:text-white text-sm block">{res?.name}</span></div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-gray-500 uppercase">{res?.location || 'Unassigned'}</td>
                        <td className="px-8 py-5 text-xs text-orange-500 font-black uppercase tracking-widest">@{vendor.username}</td>
                        <td className="px-8 py-5 text-center">
                          <button onClick={() => toggleVendorStatus(vendor)} className={`p-2 rounded-xl transition-all ${vendor.isActive ? 'text-green-500 bg-green-50' : 'text-gray-400 bg-gray-50'}`}>
                             {vendor.isActive ? <CheckCircle2 size={20} /> : <Power size={20} />}
                          </button>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleOpenEdit(vendor)} className="p-2 text-gray-400 hover:text-blue-500"><Edit3 size={18} /></button>
                            <button onClick={() => onImpersonateVendor(vendor)} className="p-2 text-gray-400 hover:text-orange-500"><LogIn size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'LOCATIONS' && (
          <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="font-black text-2xl dark:text-white uppercase tracking-tighter">Hub Registry</h2>
                <div className="flex gap-4 w-full md:w-auto">
                   <div className="relative flex-1">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="Search hubs..." className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm" value={hubSearchQuery} onChange={e => setHubSearchQuery(e.target.value)} />
                   </div>
                   <button onClick={() => setIsAreaModalOpen(true)} className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl">+ Add Hub</button>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredHubs.map(loc => (
                  <div key={loc.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm group hover:border-orange-200 transition-all">
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-2xl flex items-center justify-center shadow-inner"><MapPin size={28} /></div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setGeneratingQrHub(loc)} className="p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-orange-500 rounded-xl" title="Generate QR Code">
                            <QrCode size={18} />
                          </button>
                          <button onClick={() => toggleHubStatus(loc)} className={`p-2.5 rounded-xl transition-all ${loc.isActive !== false ? 'text-green-500 bg-green-50' : 'text-gray-400 bg-gray-50'}`} title="Master Toggle">
                            <Power size={18} />
                          </button>
                          <button onClick={() => { setEditingArea(loc); setIsAreaModalOpen(true); }} className="p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-blue-500 rounded-xl"><Edit3 size={18} /></button>
                          <button onClick={() => onDeleteLocation(loc.id)} className="p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-red-500 rounded-xl"><Trash2 size={18} /></button>
                        </div>
                     </div>
                     <h4 className="font-black text-xl dark:text-white mb-1 uppercase tracking-tighter leading-none">{loc.name}</h4>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{loc.code} • {loc.city}</p>
                     <div className="mt-4 pt-4 border-t dark:border-gray-700 flex justify-between items-center">
                        <button onClick={() => setViewingHubVendors(loc)} className="text-[9px] font-black text-orange-500 uppercase hover:underline">
                          {restaurants.filter(r => r.location === loc.name).length} Partners
                        </button>
                        <div className={`w-2 h-2 rounded-full ${loc.isActive !== false ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'REPORTS' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="mb-8">
              <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Platform Sales Performance</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Aggregated sales data across all registered hubs and partners.</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-center gap-6 mb-8">
              <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date Range</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border-none rounded-lg text-xs font-bold dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                    <span className="text-gray-300 dark:text-gray-600 font-bold">to</span>
                    <div className="relative flex-1">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border-none rounded-lg text-xs font-bold dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Status Filter</label>
                  <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value as any)} className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border-none rounded-lg text-xs font-bold dark:text-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-orange-500">
                      <option value="ALL">All Orders</option>
                      <option value={OrderStatus.PENDING}>Pending</option>
                      <option value={OrderStatus.ONGOING}>Ongoing</option>
                      <option value={OrderStatus.COMPLETED}>Served</option>
                      <option value={OrderStatus.CANCELLED}>Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={handleDownloadReport} disabled={filteredReports.length === 0} className="w-full md:w-auto px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-500 dark:hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50">
                <Download size={18} /> Platform CSV Export
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black mb-1 uppercase tracking-widest">Global Sales Volume</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                  RM{filteredReports.filter(o => o.status === OrderStatus.COMPLETED).reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black mb-1 uppercase tracking-widest">Global Order Count</p>
                <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{filteredReports.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black mb-1 uppercase tracking-widest">Efficiency Rate</p>
                <p className="text-4xl font-black text-green-500 tracking-tighter leading-none">
                  {filteredReports.length > 0 ? Math.round((filteredReports.filter(r => r.status === OrderStatus.COMPLETED).length / filteredReports.length) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4 text-left">Order Reference</th>
                    <th className="px-8 py-4 text-left">Kitchen</th>
                    <th className="px-8 py-4 text-left">Temporal Node</th>
                    <th className="px-8 py-4 text-left">Fulfillment</th>
                    <th className="px-8 py-4 text-right">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {paginatedReports.map(report => {
                    const res = restaurants.find(r => r.id === report.restaurantId);
                    return (
                      <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-8 py-5"><span className="font-black text-xs text-gray-900 dark:text-white tracking-widest">{report.id}</span></td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <img src={res?.logo} className="w-6 h-6 rounded-lg object-cover" />
                            <span className="text-xs font-black dark:text-white">{res?.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{new Date(report.timestamp).toLocaleDateString()}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${report.status === OrderStatus.COMPLETED ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{report.status}</span>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-gray-900 dark:text-white">RM{report.total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Generator Modal */}
      {generatingQrHub && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] max-w-lg w-full p-10 shadow-2xl relative animate-in zoom-in duration-300 overflow-hidden">
            <button onClick={() => setGeneratingQrHub(null)} className="absolute top-8 right-8 p-2 text-gray-400"><X size={24} /></button>
            <div className="mb-8">
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">QR Center</h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Generating for Hub: {generatingQrHub.name}</p>
            </div>
            
            <div className="flex flex-col items-center gap-6 py-2">
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-2xl w-full">
                <button 
                  onClick={() => setQrMode('SINGLE')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${qrMode === 'SINGLE' ? 'bg-white dark:bg-gray-800 text-orange-500 shadow-sm' : 'text-gray-400'}`}
                >
                  <QrCode size={16} /> Single
                </button>
                <button 
                  onClick={() => setQrMode('BATCH')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${qrMode === 'BATCH' ? 'bg-white dark:bg-gray-800 text-orange-500 shadow-sm' : 'text-gray-400'}`}
                >
                  <Layers size={16} /> Batch Range
                </button>
              </div>

              {qrMode === 'SINGLE' ? (
                <div className="w-full flex flex-col items-center gap-6">
                  <div className="bg-white p-6 rounded-[2rem] shadow-inner border dark:border-gray-700">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getQrUrl(generatingQrHub.name, qrTableNo))}`} 
                      alt="QR Code"
                      className="w-40 h-40"
                    />
                  </div>
                  <div className="w-full">
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 text-center">Table Number</label>
                     <input 
                      type="number" 
                      value={qrTableNo} 
                      onChange={e => setQrTableNo(e.target.value)} 
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none dark:text-white font-black text-2xl text-center"
                     />
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-6">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Start From</label>
                       <input 
                        type="number" 
                        value={qrStartRange} 
                        onChange={e => setQrStartRange(e.target.value)} 
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none dark:text-white font-black text-xl text-center"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">End At</label>
                       <input 
                        type="number" 
                        value={qrEndRange} 
                        onChange={e => setQrEndRange(e.target.value)} 
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none dark:text-white font-black text-xl text-center"
                       />
                    </div>
                  </div>
                  <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-[2rem] border border-orange-100 dark:border-orange-900/20 w-full text-center">
                    <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Batch Summary</p>
                    <p className="text-sm font-bold dark:text-white">Generating codes for <span className="text-orange-500 font-black">{batchTables.length}</span> tables</p>
                    <p className="text-[10px] text-gray-400 mt-1 italic">Each table will print on a fresh page</p>
                  </div>
                </div>
              )}

              <div className="w-full space-y-3 mt-4">
                <button 
                  onClick={handlePrintQr} 
                  className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3"
                >
                  <Printer size={18} /> Print {qrMode === 'BATCH' ? 'All Labels' : 'Label'}
                </button>
                <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest px-8">Tip: In print dialog, select "Save as PDF" to generate a multi-page document.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY CONTAINER (Invisible in UI) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[1000] p-0 m-0">
        <style>{`
          @media print {
            @page { margin: 0; size: auto; }
            body { margin: 0; padding: 0; background: white !important; }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; break-after: page; }
          }
        `}</style>
        {(qrMode === 'SINGLE' ? [qrTableNo] : batchTables).map((table, idx) => (
          <div key={table} className={`w-full h-screen flex flex-col items-center justify-center bg-white p-20 ${idx < (qrMode === 'BATCH' ? batchTables.length - 1 : 0) ? 'page-break' : ''}`}>
             <div className="w-full max-w-md border-[10px] border-black p-12 rounded-[4rem] flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-4xl mb-6">Q</div>
                <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">QuickServe</h1>
                <div className="w-full h-1 bg-gray-100 mb-8"></div>
                
                <div className="mb-8">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(getQrUrl(generatingQrHub?.name || '', table))}`} 
                    alt="QR Code"
                    className="w-64 h-64 mx-auto"
                  />
                </div>

                <div className="bg-black text-white px-10 py-6 rounded-3xl mb-4">
                   <p className="text-xs font-black uppercase tracking-[0.3em] mb-1 opacity-60">Table Node</p>
                   <h2 className="text-6xl font-black">#{table}</h2>
                </div>
                
                <div className="mt-4">
                   <p className="text-sm font-black uppercase tracking-widest text-gray-400">{generatingQrHub?.name}</p>
                   <p className="text-xs font-bold text-gray-300 mt-2 italic">Scan to Browse Menu & Order</p>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Initialize Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] max-w-2xl w-full p-10 shadow-2xl relative animate-in zoom-in fade-in duration-300 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 p-2 text-gray-400"><X size={24} /></button>
            <h2 className="text-3xl font-black mb-1 dark:text-white uppercase tracking-tighter">{editingVendor ? 'Edit Partner' : 'Account Initialization'}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-10 font-medium">Configure store credentials and branding.</p>
            <form onSubmit={handleSubmitVendor} className="space-y-8">
              <div className="p-8 bg-gray-50 dark:bg-gray-700/50 rounded-[2rem] border dark:border-gray-600">
                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest flex items-center gap-2"><Key size={14} className="text-orange-500" /> Account Security</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required placeholder="Username" className="w-full px-5 py-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none text-sm font-bold dark:text-white" value={formVendor.username} onChange={e => setFormVendor({...formVendor, username: e.target.value})} />
                  <input required placeholder="Password" type="password" className="w-full px-5 py-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none text-sm font-bold dark:text-white" value={formVendor.password} onChange={e => setFormVendor({...formVendor, password: e.target.value})} />
                </div>
              </div>
              <div className="p-8 bg-white dark:bg-gray-800 rounded-[2rem] border dark:border-gray-700 shadow-sm">
                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest flex items-center gap-2"><Store size={14} className="text-orange-500" /> Kitchen Profile</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><input required placeholder="Restaurant Name" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none text-sm font-bold dark:text-white" value={formVendor.restaurantName} onChange={e => setFormVendor({...formVendor, restaurantName: e.target.value})} /></div>
                  <select required className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none text-sm font-bold dark:text-white appearance-none cursor-pointer" value={formVendor.location} onChange={e => setFormVendor({...formVendor, location: e.target.value})}>
                    <option value="">Select Physical Zone</option>
                    {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                  </select>
                  <div className="relative"><ImageIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Branding Logo URL" className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none text-sm font-bold dark:text-white" value={formVendor.logo} onChange={e => setFormVendor({...formVendor, logo: e.target.value})} /></div>
                </div>
              </div>
              <div className="p-8 bg-gray-50 dark:bg-gray-700/50 rounded-[2rem] border dark:border-gray-600">
                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest flex items-center gap-2"><Mail size={14} className="text-orange-500" /> Contact Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Email Address" type="email" className="w-full px-5 py-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none text-sm font-bold dark:text-white" value={formVendor.email} onChange={e => setFormVendor({...formVendor, email: e.target.value})} />
                  <input placeholder="Phone Number" className="w-full px-5 py-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none text-sm font-bold dark:text-white" value={formVendor.phone} onChange={e => setFormVendor({...formVendor, phone: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-gray-100 dark:bg-gray-700 rounded-2xl font-black uppercase text-xs tracking-widest text-gray-500">Abort</button>
                <button type="submit" className="flex-1 py-5 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl">Finalize Provisioning</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hub Vendors Modal */}
      {viewingHubVendors && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] max-w-xl w-full p-10 shadow-2xl relative animate-in zoom-in fade-in duration-300">
            <button onClick={() => setViewingHubVendors(null)} className="absolute top-8 right-8 p-2 text-gray-400"><X size={24} /></button>
            <h2 className="text-2xl font-black mb-2 dark:text-white uppercase tracking-tighter">Hub Partners: {viewingHubVendors.name}</h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-8">List of kitchens assigned to this zone.</p>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
               {restaurants.filter(r => r.location === viewingHubVendors.name).map(res => (
                 <div key={res.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border dark:border-gray-700">
                   <div className="flex items-center gap-4">
                      <img src={res.logo} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <p className="font-black text-gray-900 dark:text-white leading-tight">{res.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">@{vendors.find(v => v.restaurantId === res.id)?.username}</p>
                      </div>
                   </div>
                   <button onClick={() => onRemoveVendorFromHub(res.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Remove from Hub"><Trash2 size={20} /></button>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Hub Modal */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-gray-800 rounded-[3rem] max-md w-full p-10 shadow-2xl relative animate-in fade-in zoom-in duration-300">
             <button onClick={() => { setIsAreaModalOpen(false); setEditingArea(null); }} className="absolute top-8 right-8 p-2 text-gray-400"><X size={24} /></button>
             <h2 className="text-2xl font-black mb-8 dark:text-white uppercase tracking-tighter">{editingArea ? 'Modify Hub Node' : 'Register New Hub'}</h2>
             <form onSubmit={(e) => {
               e.preventDefault();
               if (editingArea) onUpdateLocation(editingArea);
               else handleAddArea(e);
               setIsAreaModalOpen(false);
               setEditingArea(null);
             }} className="space-y-5">
                <input required placeholder="Area Name" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none dark:text-white font-bold" value={editingArea ? editingArea.name : newArea.name} onChange={e => editingArea ? setEditingArea({...editingArea, name: e.target.value}) : setNewArea({...newArea, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <input placeholder="City" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none dark:text-white font-bold" value={editingArea ? editingArea.city : newArea.city} onChange={e => editingArea ? setEditingArea({...editingArea, city: e.target.value}) : setNewArea({...newArea, city: e.target.value})} />
                   <input placeholder="ISO Code (e.g. SF)" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none dark:text-white uppercase font-black" value={editingArea ? editingArea.code : newArea.code} onChange={e => editingArea ? setEditingArea({...editingArea, code: e.target.value.toUpperCase()}) : setNewArea({...newArea, code: e.target.value.toUpperCase()})} />
                </div>
                <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => { setIsAreaModalOpen(false); setEditingArea(null); }} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold text-gray-500 uppercase text-[10px]">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">Commit Update</button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
