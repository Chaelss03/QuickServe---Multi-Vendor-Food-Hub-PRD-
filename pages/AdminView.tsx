
import React, { useState, useMemo, useEffect } from 'react';
import { User, Restaurant, Order, Area, OrderStatus } from '../types';
import { Users, Store, TrendingUp, Settings, ShieldCheck, Mail, Search, Filter, X, Plus, MapPin, Power, CheckCircle2, AlertCircle, LogIn, Trash2, LayoutGrid, List, ChevronRight, Eye, EyeOff, Globe, Phone, ShoppingBag, Edit3, Hash, Download, Calendar, ChevronLeft, Database, Image as ImageIcon, Key, QrCode, Printer, Layers, Info, ExternalLink, XCircle } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
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
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formArea, setFormArea] = useState<{ name: string; city: string; state: string; code: string; type: 'MULTI' | 'SINGLE' }>({ 
    name: '', city: '', state: '', code: '', type: 'MULTI' 
  });
  
  const [viewingHubVendors, setViewingHubVendors] = useState<Area | null>(null);

  // QR Modal State
  const [generatingQrHub, setGeneratingQrHub] = useState<Area | null>(null);
  const [qrMode, setQrMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [qrTableNo, setQrTableNo] = useState<string>('1');
  const [qrStartRange, setQrStartRange] = useState<string>('1');
  const [qrEndRange, setQrEndRange] = useState<string>('10');
  
  // Global QR Selection State
  const [isHubSelectionModalOpen, setIsHubSelectionModalOpen] = useState(false);

  // Reports State
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportStatus, setReportStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [reportStart, setReportStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); 
    return d.toISOString().split('T')[0];
  });
  const [reportEnd, setReportEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(25);
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

  const filteredReports = useMemo(() => {
    return orders.filter(o => {
      let orderDate = '';
      try {
        const d = new Date(o.timestamp);
        if (isNaN(d.getTime())) return false; 
        orderDate = d.toISOString().split('T')[0];
      } catch { return false; }
      const matchesDate = orderDate >= reportStart && orderDate <= reportEnd;
      const matchesStatus = reportStatus === 'ALL' || o.status === reportStatus;
      
      const res = restaurants.find(r => r.id === o.restaurantId);
      const searchLower = reportSearchQuery.toLowerCase();
      const matchesSearch = o.id.toLowerCase().includes(searchLower) || 
                           (res?.name.toLowerCase().includes(searchLower) || false);
      
      return matchesDate && matchesStatus && matchesSearch;
    });
  }, [orders, reportStart, reportEnd, reportStatus, reportSearchQuery, restaurants]);

  const totalPages = Math.ceil(filteredReports.length / entriesPerPage);

  const paginatedReports = useMemo(() => {
    const startIdx = (currentPage - 1) * entriesPerPage;
    return filteredReports.slice(startIdx, startIdx + entriesPerPage);
  }, [filteredReports, currentPage, entriesPerPage]);

  const handleDownloadReport = () => {
    if (filteredReports.length === 0) return;
    const headers = ['Order ID', 'Kitchen', 'Time', 'Status', 'Menu Order', 'Total Bill'];
    const rows = filteredReports.map(o => {
      const res = restaurants.find(r => r.id === o.restaurantId);
      return [o.id, res?.name || 'Unknown', new Date(o.timestamp).toLocaleString(), o.status, o.items.map(i => `${i.name} (x${i.quantity})`).join('; '), o.total.toFixed(2)];
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
      setShowPassword(false);
      setIsModalOpen(true);
    }
  };

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormVendor({ username: '', password: '', restaurantName: '', location: '', email: '', phone: '', logo: '' });
    setShowPassword(false);
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
    if (editingVendor) onUpdateVendor(userPayload, resPayload);
    else onAddVendor(userPayload, resPayload);
    setIsModalOpen(false);
  };

  const handleOpenHubEdit = (loc: Area) => {
    setEditingArea(loc);
    setFormArea({ name: loc.name, city: loc.city, state: loc.state, code: loc.code, type: loc.type || 'MULTI' });
    setIsAreaModalOpen(true);
  };

  const handleOpenHubAdd = () => {
    setEditingArea(null);
    setFormArea({ name: '', city: '', state: '', code: '', type: 'MULTI' });
    setIsAreaModalOpen(true);
  };

  const handleHubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArea) {
      onUpdateLocation({ ...editingArea, ...formArea });
    } else {
      onAddLocation({ ...formArea, id: '', isActive: true });
    }
    setIsAreaModalOpen(false);
  };

  const toggleVendorStatus = (user: User) => {
    const res = restaurants.find(r => r.id === user.restaurantId);
    if (res) onUpdateVendor({ ...user, isActive: !user.isActive }, res);
  };

  const toggleHubStatus = (loc: Area) => {
    onUpdateLocation({ ...loc, isActive: !loc.isActive });
  };

  const getQrUrl = (hubName: string, table: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?loc=${encodeURIComponent(hubName)}&table=${table}`;
  };

  const handlePrintQr = () => window.print();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6 no-print">
        <div>
          <h1 className="text-3xl md:text-4xl font-black dark:text-white tracking-tighter uppercase leading-none mb-1">Platform Master</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[8px] md:text-[10px] ml-1">Administrative Controls</p>
        </div>
        <div className="flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 border dark:border-gray-700 shadow-sm transition-colors overflow-x-auto hide-scrollbar">
          {[
            { id: 'VENDORS', label: 'Vendors', icon: Store },
            { id: 'LOCATIONS', label: 'Hubs', icon: MapPin },
            { id: 'REPORTS', label: 'Report', icon: TrendingUp },
            { id: 'SYSTEM', label: 'System', icon: Database }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 md:px-6 md:py-3 rounded-xl font-black transition-all text-[10px] md:text-xs uppercase tracking-widest ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-xl' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="no-print">
        {activeTab === 'VENDORS' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-4 md:px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-700/50">
              <h3 className="font-black dark:text-white uppercase tracking-tighter text-lg">Vendor Directory</h3>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search..." className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl text-sm outline-none font-bold dark:text-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="relative flex-1 sm:flex-none">
                   <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                   <select className="w-full pl-11 pr-8 py-2.5 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl text-sm appearance-none outline-none font-bold dark:text-white" value={vendorFilter} onChange={e => setVendorFilter(e.target.value as any)}>
                      <option value="ALL">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Deactive</option>
                   </select>
                </div>
                <button onClick={handleOpenAdd} className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95">+ Register</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4 text-left">Kitchen</th>
                    <th className="px-8 py-4 text-left">Hub</th>
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
                            <div>
                                <span className="font-black dark:text-white text-sm block">{res?.name}</span>
                                <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">@{vendor.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase truncate max-w-[120px]">{res?.location || 'Unassigned'}</td>
                        <td className="px-8 py-5 text-center">
                          <button onClick={() => toggleVendorStatus(vendor)} className={`p-2 rounded-xl transition-all ${vendor.isActive ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 bg-gray-50 dark:bg-gray-700'}`}>
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
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-4 md:px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-700/50">
              <h3 className="font-black dark:text-white uppercase tracking-tighter text-lg">Hub Registry</h3>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search hubs..." className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl text-sm outline-none font-bold dark:text-white" value={hubSearchQuery} onChange={e => setHubSearchQuery(e.target.value)} />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsHubSelectionModalOpen(true)} className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-gray-900 text-orange-500 border-2 border-orange-500 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-sm flex items-center justify-center gap-2 hover:bg-orange-500 hover:text-white transition-all">
                      <QrCode size={16} /> QR
                    </button>
                    <button onClick={handleOpenHubAdd} className="flex-[2] sm:flex-none px-6 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">+ Hub</button>
                </div>
              </div>
            </div>
            {/* Hub Table Logic Follows Vendor pattern with Horizontal Scroll */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4 text-left">Hub</th>
                    <th className="px-8 py-4 text-left">Type</th>
                    <th className="px-8 py-4 text-center">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredHubs.map(loc => (
                    <tr key={loc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 text-orange-500 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-orange-500 group-hover:text-white transition-all"><MapPin size={20} /></div>
                          <div>
                            <span className="font-black dark:text-white text-sm block uppercase tracking-tight">{loc.name}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{loc.code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter ${loc.type === 'SINGLE' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'}`}>
                          {loc.type || 'MULTI'}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button onClick={() => toggleHubStatus(loc)} className={`p-2 rounded-xl transition-all ${loc.isActive !== false ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 bg-gray-50 dark:bg-gray-700'}`}>
                           {loc.isActive !== false ? <Power size={20} /> : <Power size={20} className="opacity-40" />}
                        </button>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setGeneratingQrHub(loc)} className="p-2 text-gray-400 hover:text-orange-500"><QrCode size={18} /></button>
                          <button onClick={() => handleOpenHubEdit(loc)} className="p-2 text-gray-400 hover:text-blue-500"><Edit3 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ... Reports Tab remains same with enhanced responsiveness ... */}
        {activeTab === 'REPORTS' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="px-4 md:px-8 py-6 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black dark:text-white uppercase tracking-tighter text-lg">Sales Analysis</h3>
              </div>
              <div className="relative w-full md:w-64">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="ID or Kitchen..." 
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-orange-500 transition-all dark:text-white"
                  value={reportSearchQuery}
                  onChange={e => {setReportSearchQuery(e.target.value); setCurrentPage(1);}}
                />
              </div>
            </div>
            
            <div className="p-4 md:p-8">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border dark:border-gray-700 flex flex-col md:flex-row items-center gap-6 mb-8">
                <div className="flex-1 flex flex-col sm:flex-row gap-4 w-full">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Period Selection</label>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-orange-500 shrink-0" />
                      <input type="date" value={reportStart} onChange={(e) => {setReportStart(e.target.value); setCurrentPage(1);}} className="flex-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg text-[10px] font-black dark:text-white p-2" />
                      <span className="text-gray-400 font-black">to</span>
                      <input type="date" value={reportEnd} onChange={(e) => {setReportEnd(e.target.value); setCurrentPage(1);}} className="flex-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg text-[10px] font-black dark:text-white p-2" />
                    </div>
                  </div>
                </div>
                <button onClick={handleDownloadReport} disabled={filteredReports.length === 0} className="w-full md:w-auto px-6 py-2.5 bg-black dark:bg-white text-white dark:text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-500 transition-all shadow-lg"><Download size={16} /> Global Export</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <p className="text-gray-400 dark:text-gray-500 text-[8px] md:text-[9px] font-black mb-1 uppercase tracking-widest">Platform Revenue</p>
                  <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                    RM{filteredReports.filter(o => o.status === OrderStatus.COMPLETED).reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <p className="text-gray-400 dark:text-gray-500 text-[8px] md:text-[9px] font-black mb-1 uppercase tracking-widest">Global Orders</p>
                  <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{filteredReports.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <p className="text-gray-400 dark:text-gray-500 text-[8px] md:text-[9px] font-black mb-1 uppercase tracking-widest">Global Health</p>
                  <p className="text-xl md:text-2xl font-black text-green-500 tracking-tighter leading-none">
                    {filteredReports.length > 0 ? Math.round((filteredReports.filter(r => r.status === OrderStatus.COMPLETED).length / filteredReports.length) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-8 py-3 text-left">ID</th>
                          <th className="px-8 py-3 text-left">Kitchen</th>
                          <th className="px-8 py-3 text-left">Time</th>
                          <th className="px-8 py-3 text-right">Total Bill</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {paginatedReports.map(report => {
                          const res = restaurants.find(r => r.id === report.restaurantId);
                          return (
                            <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="px-8 py-2.5 text-[10px] font-black dark:text-white uppercase tracking-widest">{report.id}</td>
                              <td className="px-8 py-2.5">
                                 <div className="flex items-center gap-2">
                                   <img src={res?.logo} className="w-4 h-4 rounded object-cover" />
                                   <span className="text-[10px] font-black dark:text-white uppercase tracking-tight truncate max-w-[80px]">{res?.name}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-2.5">
                                <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tighter">{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </td>
                              <td className="px-8 py-2.5 text-right font-black dark:text-white text-[10px]">RM{report.total.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default AdminView;
