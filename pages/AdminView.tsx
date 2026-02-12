import React, { useState, useMemo, useEffect } from 'react';
import { User, Restaurant, Order, Area, OrderStatus } from '../types';
import { Users, Store, TrendingUp, Settings, ShieldCheck, Mail, Search, Filter, X, Plus, MapPin, Power, CheckCircle2, AlertCircle, LogIn, Trash2, LayoutGrid, List, ChevronRight, Eye, EyeOff, Globe, Phone, ShoppingBag, Edit3, Hash, Download, Calendar, ChevronLeft, Database, Image as ImageIcon, Key, QrCode, Printer, Layers } from 'lucide-react';

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
  const [newArea, setNewArea] = useState({ name: '', city: '', state: '', code: '' });
  
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
  const [reportStatus, setReportStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [reportStart, setReportStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); 
    return d.toISOString().split('T')[0];
  });
  const [reportEnd, setReportEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Synchronize Hub form when editing
  useEffect(() => {
    if (editingArea) {
      setNewArea({
        name: editingArea.name,
        city: editingArea.city,
        state: editingArea.state,
        code: editingArea.code
      });
    } else {
      setNewArea({ name: '', city: '', state: '', code: '' });
    }
  }, [editingArea]);

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
      return matchesDate && matchesStatus;
    });
  }, [orders, reportStart, reportEnd, reportStatus]);

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

  const toggleVendorStatus = (user: User) => {
    const res = restaurants.find(r => r.id === user.restaurantId);
    if (res) onUpdateVendor({ ...user, isActive: !user.isActive }, res);
  };

  const handleHubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArea) {
      onUpdateLocation({ ...editingArea, ...newArea });
    } else {
      onAddLocation({ ...newArea, id: '', isActive: true });
    }
    setIsAreaModalOpen(false);
    setEditingArea(null);
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
              <h3 className="font-black dark:text-white uppercase tracking-tighter text-lg">Vendor Directory</h3>
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
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-700/50">
              <h3 className="font-black dark:text-white uppercase tracking-tighter text-lg">Hub Registry</h3>
              <div className="flex flex-wrap gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search hubs..." className="pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm" value={hubSearchQuery} onChange={e => setHubSearchQuery(e.target.value)} />
                </div>
                <button onClick={() => setIsHubSelectionModalOpen(true)} className="px-6 py-2.5 bg-white dark:bg-gray-700 text-orange-500 border-2 border-orange-500 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm flex items-center gap-2 hover:bg-orange-500 hover:text-white transition-all">
                  <QrCode size={16} /> Generate QR
                </button>
                <button onClick={() => { setEditingArea(null); setIsAreaModalOpen(true); }} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">+ Add Hub</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4 text-left">Hub Identity</th>
                    <th className="px-8 py-4 text-left">City / State</th>
                    <th className="px-8 py-4 text-center">Partners</th>
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
                      <td className="px-8 py-5 text-sm font-bold text-gray-500 uppercase">{loc.city}</td>
                      <td className="px-8 py-5 text-center">
                        <button onClick={() => setViewingHubVendors(loc)} className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 text-orange-500 rounded-full font-black text-[10px] uppercase hover:bg-orange-500 hover:text-white transition-all">
                          {restaurants.filter(r => r.location === loc.name).length} Kitchens
                        </button>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button onClick={() => toggleHubStatus(loc)} className={`p-2 rounded-xl transition-all ${loc.isActive !== false ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 bg-gray-50 dark:bg-gray-700'}`}>
                           {loc.isActive !== false ? <Power size={20} /> : <Power size={20} className="opacity-40" />}
                        </button>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setGeneratingQrHub(loc)} className="p-2 text-gray-400 hover:text-orange-500" title="QR Codes"><QrCode size={18} /></button>
                          <button onClick={() => { setEditingArea(loc); setIsAreaModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-500" title="Edit Hub"><Edit3 size={18} /></button>
                          <button onClick={() => onDeleteLocation(loc.id)} className="p-2 text-gray-400 hover:text-red-500" title="Delete Hub"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'REPORTS' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
             {/* Report view simplified to match requested context */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-center gap-6 mb-8">
              <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Period Selection</label>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-orange-500" />
                    <input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-700 border-none rounded-lg text-xs font-bold dark:text-white p-2" />
                    <span className="text-gray-400 font-bold">to</span>
                    <input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-700 border-none rounded-lg text-xs font-bold dark:text-white p-2" />
                  </div>
                </div>
              </div>
              <button onClick={handleDownloadReport} disabled={filteredReports.length === 0} className="px-6 py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-orange-500 transition-all"><Download size={18} /> Global Export</button>
            </div>
          </div>
        )}
      </div>

      {/* Vendor Modal - Compact Layout */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] max-w-lg w-full p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            <h2 className="text-2xl font-black mb-6 dark:text-white uppercase tracking-tighter">{editingVendor ? 'Edit Vendor' : 'Register Vendor'}</h2>
            <form onSubmit={handleSubmitVendor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
                  <input required placeholder="Login ID" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm font-bold dark:text-white" value={formVendor.username} onChange={e => setFormVendor({...formVendor, username: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative">
                    <input required placeholder="••••••••" type={showPassword ? 'text' : 'password'} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm font-bold dark:text-white" value={formVendor.password} onChange={e => setFormVendor({...formVendor, password: e.target.value})} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Contact</label>
                  <input type="email" placeholder="vendor@example.com" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm font-bold dark:text-white" value={formVendor.email} onChange={e => setFormVendor({...formVendor, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input type="tel" placeholder="+60 12-345 6789" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm font-bold dark:text-white" value={formVendor.phone} onChange={e => setFormVendor({...formVendor, phone: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kitchen Name</label>
                <input required placeholder="e.g. Burger Palace" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm font-bold dark:text-white" value={formVendor.restaurantName} onChange={e => setFormVendor({...formVendor, restaurantName: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Physical Hub</label>
                  <select required className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm font-bold dark:text-white appearance-none cursor-pointer" value={formVendor.location} onChange={e => setFormVendor({...formVendor, location: e.target.value})}>
                    <option value="">Select Hub</option>
                    {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Logo URL</label>
                  <input placeholder="Image Link" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm font-bold dark:text-white" value={formVendor.logo} onChange={e => setFormVendor({...formVendor, logo: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-black uppercase text-[10px] tracking-widest text-gray-500">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hub Modal - Compact Layout */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] max-w-sm w-full p-8 shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => { setIsAreaModalOpen(false); setEditingArea(null); }} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            <h2 className="text-2xl font-black mb-6 dark:text-white uppercase tracking-tighter">{editingArea ? 'Modify Hub' : 'Register Hub'}</h2>
            <form onSubmit={handleHubSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Hub Name</label>
                <input required placeholder="e.g. Floor 1 Zone A" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm font-bold dark:text-white" value={newArea.name} onChange={e => setNewArea({...newArea, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
                  <input required placeholder="Kuala Lumpur" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm font-bold dark:text-white" value={newArea.city} onChange={e => setNewArea({...newArea, city: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Code</label>
                  <input required placeholder="KL" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm font-bold dark:text-white uppercase" value={newArea.code} onChange={e => setNewArea({...newArea, code: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">State / Territory</label>
                <input required placeholder="Selangor" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl outline-none text-sm font-bold dark:text-white" value={newArea.state} onChange={e => setNewArea({...newArea, state: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setIsAreaModalOpen(false); setEditingArea(null); }} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-black uppercase text-[10px] tracking-widest text-gray-500">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">Save Hub</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;