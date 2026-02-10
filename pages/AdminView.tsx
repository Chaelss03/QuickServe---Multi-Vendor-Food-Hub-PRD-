import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Restaurant, Order, Area, OrderStatus } from '../types';
import { Users, Store, TrendingUp, Settings, ShieldCheck, Mail, Search, Filter, X, Plus, MapPin, Power, CheckCircle2, AlertCircle, LogIn, Trash2, LayoutGrid, List, ChevronRight, Eye, Globe, Phone, ShoppingBag, Edit3, Hash, Download, Calendar } from 'lucide-react';

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
}

const AdminView: React.FC<Props> = ({ vendors, restaurants, orders, locations, onAddVendor, onUpdateVendor, onImpersonateVendor, onAddLocation, onUpdateLocation, onDeleteLocation }) => {
  const [activeTab, setActiveTab] = useState<'VENDORS' | 'LOCATIONS' | 'REPORTS'>('VENDORS');
  const [searchQuery, setSearchQuery] = useState('');
  const [areaSearchQuery, setAreaSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Report Filters
  const [reportStatus, setReportStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [reportStart, setReportStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First of current month
    return d.toISOString().split('T')[0];
  });
  const [reportEnd, setReportEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Location Registry Form State
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [isEditAreaModalOpen, setIsEditAreaModalOpen] = useState(false);
  const [newArea, setNewArea] = useState({
    name: '',
    city: '',
    state: '',
    code: ''
  });
  const [editArea, setEditArea] = useState<Area | null>(null);
  
  // Location View Options
  const [locationViewMode, setLocationViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingLocationVendors, setViewingLocationVendors] = useState<Area | null>(null);

  // Registration Form State
  const [newVendor, setNewVendor] = useState({
    username: '',
    password: '',
    restaurantName: '',
    location: '',
    email: '',
    phone: '',
  });
  const [vendorLocationSearch, setVendorLocationSearch] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  
  // Edit Form State
  const [editVendor, setEditVendor] = useState<{user: User, restaurant: Restaurant} | null>(null);
  const [editLocationSearch, setEditLocationSearch] = useState('');
  const [showEditLocationDropdown, setShowEditLocationDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const editDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
      if (editDropdownRef.current && !editDropdownRef.current.contains(event.target as Node)) {
        setShowEditLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const res = restaurants.find(r => r.id === vendor.restaurantId);
      const matchesSearch = 
        vendor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLocation = 
        locationFilter === 'All Locations' || 
        res?.location === locationFilter;

      const matchesStatus = 
        statusFilter === 'All Status' ||
        (statusFilter === 'Active' && vendor.isActive) ||
        (statusFilter === 'Deactivated' && !vendor.isActive);
      
      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [vendors, restaurants, searchQuery, locationFilter, statusFilter]);

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(areaSearchQuery.toLowerCase()) ||
      loc.city.toLowerCase().includes(areaSearchQuery.toLowerCase()) ||
      loc.state.toLowerCase().includes(areaSearchQuery.toLowerCase()) ||
      loc.code.toLowerCase().includes(areaSearchQuery.toLowerCase())
    );
  }, [locations, areaSearchQuery]);

  const filteredVendorLocations = useMemo(() => {
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(vendorLocationSearch.toLowerCase()) ||
      loc.city.toLowerCase().includes(vendorLocationSearch.toLowerCase())
    );
  }, [locations, vendorLocationSearch]);

  const filteredEditLocations = useMemo(() => {
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(editLocationSearch.toLowerCase()) ||
      loc.city.toLowerCase().includes(editLocationSearch.toLowerCase())
    );
  }, [locations, editLocationSearch]);

  const filteredReports = useMemo(() => {
    return orders.filter(o => {
      const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
      const matchesDate = orderDate >= reportStart && orderDate <= reportEnd;
      const matchesStatus = reportStatus === 'ALL' || o.status === reportStatus;
      return matchesDate && matchesStatus;
    });
  }, [orders, reportStart, reportEnd, reportStatus]);

  const handleDownloadReport = () => {
    if (filteredReports.length === 0) return;
    
    const headers = ['Order ID', 'Vendor', 'Location', 'Time', 'Status', 'Menu Items', 'Total Bill'];
    const rows = filteredReports.map(o => {
      const res = restaurants.find(r => r.id === o.restaurantId);
      return [
        o.id,
        res?.name || 'Unknown',
        res?.location || 'Unknown',
        new Date(o.timestamp).toLocaleString(),
        o.status,
        o.items.map(i => `${i.name} (x${i.quantity}${i.selectedSize ? `, ${i.selectedSize}` : ''})`).join('; '),
        o.total.toFixed(2)
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `system_all_report_${reportStart}_to_${reportEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.location) {
      alert('Please select a location');
      return;
    }
    const vendorId = `vendor_${Date.now()}`;
    const restaurantId = `res_${Date.now()}`;
    
    const newUser: User = {
      id: vendorId,
      username: newVendor.username,
      password: newVendor.password,
      role: 'VENDOR',
      restaurantId: restaurantId,
      isActive: true,
      email: newVendor.email,
      phone: newVendor.phone,
    };

    const newRestaurant: Restaurant = {
      id: restaurantId,
      name: newVendor.restaurantName,
      vendorId: vendorId,
      location: newVendor.location,
      logo: `https://picsum.photos/seed/${newVendor.restaurantName}/200/200`,
      menu: []
    };

    onAddVendor(newUser, newRestaurant);
    setIsModalOpen(false);
    setNewVendor({ username: '', password: '', restaurantName: '', location: '', email: '', phone: '' });
    setVendorLocationSearch('');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVendor) return;
    onUpdateVendor(editVendor.user, editVendor.restaurant);
    setIsEditModalOpen(false);
    setEditVendor(null);
  };

  const toggleVendorStatus = (vendor: User) => {
    const res = restaurants.find(r => r.id === vendor.restaurantId);
    if (res) {
      onUpdateVendor({ ...vendor, isActive: !vendor.isActive }, res);
    }
  };

  const toggleLocationStatus = (loc: Area) => {
    onUpdateLocation({ ...loc, isActive: !loc.isActive });
  };

  const openEditModal = (vendor: User) => {
    const res = restaurants.find(r => r.id === vendor.restaurantId);
    if (res) {
      setEditVendor({ 
        user: { ...vendor }, 
        restaurant: { ...res } 
      });
      setEditLocationSearch(res.location);
      setIsEditModalOpen(true);
    }
  };

  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (newArea.name.trim() && newArea.city.trim() && newArea.code.trim()) {
      onAddLocation({
        id: `area_${Date.now()}`,
        name: newArea.name.trim(),
        city: newArea.city.trim(),
        state: newArea.state.trim(),
        code: newArea.code.trim().toUpperCase(),
        isActive: true
      });
      setNewArea({ name: '', city: '', state: '', code: '' });
      setIsAreaModalOpen(false);
    }
  };

  const handleUpdateAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editArea) {
      onUpdateLocation(editArea);
      setIsEditAreaModalOpen(false);
      setEditArea(null);
    }
  };

  const getVendorsInLocation = (locName: string) => {
    return restaurants.filter(r => r.location === locName);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 dark:bg-gray-900 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">System Admin</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Platform overview and system-wide management</p>
        </div>
        <div className="flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 border dark:border-gray-700 shadow-sm transition-colors overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('VENDORS')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'VENDORS' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <Store size={18} />
            Vendors
          </button>
          <button 
            onClick={() => setActiveTab('LOCATIONS')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'LOCATIONS' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <MapPin size={18} />
            Locations
          </button>
          <button 
            onClick={() => setActiveTab('REPORTS')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'REPORTS' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100 dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <TrendingUp size={18} />
            All Report
          </button>
        </div>
      </div>

      {activeTab === 'VENDORS' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
          <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-700/50">
            <h3 className="font-black text-lg dark:text-white whitespace-nowrap">Vendor Directory</h3>
            
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 max-w-5xl">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search vendor, store, or email..." 
                  className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="relative">
                <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select 
                  className="pl-11 pr-10 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none font-medium dark:text-white min-w-[160px]"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                >
                  <option value="All Locations">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select 
                  className="pl-11 pr-10 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none font-medium dark:text-white min-w-[140px]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All Status">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Deactivated">Deactivated</option>
                </select>
              </div>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md shadow-orange-100 dark:shadow-none whitespace-nowrap"
              >
                + Register Vendor
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-black uppercase tracking-widest">Store / Vendor</th>
                  <th className="px-8 py-4 text-left text-xs font-black uppercase tracking-widest">Location</th>
                  <th className="px-8 py-4 text-left text-xs font-black uppercase tracking-widest">Username</th>
                  <th className="px-8 py-4 text-left text-xs font-black uppercase tracking-widest">Contact</th>
                  <th className="px-8 py-4 text-left text-xs font-black uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-right text-xs font-black uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-gray-500 dark:text-gray-400 italic">
                      No vendors found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map(vendor => {
                    const res = restaurants.find(r => r.id === vendor.restaurantId);
                    return (
                      <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <img src={res?.logo} className="w-10 h-10 rounded-lg shadow-sm" />
                            <span className="font-bold text-gray-800 dark:text-gray-200">{res?.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <MapPin size={14} className="text-orange-500" />
                            <span className="text-sm font-medium">{res?.location || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium text-sm">
                            <Users size={14} className="text-gray-400" />
                            {vendor.username}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="space-y-1">
                            {vendor.email && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <Mail size={12} className="shrink-0" />
                                <span className="truncate max-w-[140px]">{vendor.email}</span>
                              </div>
                            )}
                            {vendor.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <Phone size={12} className="shrink-0" />
                                <span>{vendor.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <button 
                            onClick={() => toggleVendorStatus(vendor)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${
                              vendor.isActive 
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100' 
                                : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100'
                            }`}
                            title={`Click to ${vendor.isActive ? 'Deactivate' : 'Activate'}`}
                          >
                            <Power size={10} />
                            {vendor.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => onImpersonateVendor(vendor)}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-500 rounded-lg transition-all"
                              title="Login as Vendor"
                            >
                              <LogIn size={18} />
                            </button>
                            <button 
                              onClick={() => openEditModal(vendor)}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 rounded-lg transition-all"
                              title="Settings"
                            >
                              <Settings size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'LOCATIONS' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
          <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-row items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-700/50 min-h-[88px]">
            <div className="flex flex-col shrink-0">
              <h3 className="font-black text-lg dark:text-white whitespace-nowrap leading-tight">Location Registry</h3>
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider leading-tight">Physical Zones Manager</p>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end min-w-0">
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border dark:border-gray-700 shadow-sm shrink-0">
                <button 
                  onClick={() => setLocationViewMode('grid')}
                  className={`p-1.5 md:p-2 rounded-lg transition-all ${locationViewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                <button 
                  onClick={() => setLocationViewMode('list')}
                  className={`p-1.5 md:p-2 rounded-lg transition-all ${locationViewMode === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
              </div>

              <div className="relative flex-1 max-w-[120px] md:max-w-xs min-w-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full pl-9 pr-3 py-2 md:py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white truncate"
                  value={areaSearchQuery}
                  onChange={(e) => setAreaSearchQuery(e.target.value)}
                />
              </div>

              <button 
                onClick={() => setIsAreaModalOpen(true)}
                className="px-3 md:px-6 py-2 md:py-2.5 bg-black dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-white transition-all shadow-md whitespace-nowrap flex items-center gap-1.5 md:gap-2 text-xs md:text-sm shrink-0"
              >
                <Plus size={16} className="md:w-[18px] md:h-[18px]" />
                <span className="hidden xs:inline">Register Area</span>
                <span className="xs:hidden">Add</span>
              </button>
            </div>
          </div>

          <div className="p-8">
            {filteredLocations.length === 0 ? (
               <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-700/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <MapPin size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">No areas found</h3>
                  <p className="text-gray-500 dark:text-gray-400">Try a different search term or add a new zone.</p>
               </div>
            ) : (
              locationViewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredLocations.map(loc => {
                    const locationVendors = getVendorsInLocation(loc.name);
                    return (
                      <div key={loc.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-3xl border dark:border-gray-600 p-6 flex flex-col transition-all hover:border-orange-200 dark:hover:border-orange-800 group">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${loc.isActive !== false ? 'bg-white dark:bg-gray-800 text-orange-500' : 'bg-gray-200 dark:bg-gray-600 text-gray-400'}`}>
                            <MapPin size={24} />
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => toggleLocationStatus(loc)}
                              className={`p-2 rounded-lg transition-all ${loc.isActive !== false ? 'text-green-500 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}
                              title={loc.isActive !== false ? 'Master Status: Active' : 'Master Status: Disabled'}
                            >
                              <Power size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                setEditArea({...loc});
                                setIsEditAreaModalOpen(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button 
                              onClick={() => onDeleteLocation(loc.id)}
                              className="p-2 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-xl text-gray-900 dark:text-white truncate">{loc.name}</h4>
                          <span className="px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black rounded text-[10px] font-black">{loc.code}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1">
                          <Globe size={12} className="text-blue-400" />
                          {loc.city}, {loc.state}
                        </p>
                        <div className="flex-1 flex items-end justify-between mt-4 pt-4 border-t dark:border-gray-700">
                          <button 
                            onClick={() => setViewingLocationVendors(loc)}
                            className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors flex items-center gap-1.5"
                          >
                            <Store size={14} />
                            {locationVendors.length} Registered
                          </button>
                          <button 
                            onClick={() => setViewingLocationVendors(loc)}
                            className="p-1.5 bg-white dark:bg-gray-800 rounded-lg text-gray-400 hover:text-orange-500 transition-colors shadow-sm"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border dark:border-gray-700 rounded-3xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-xs font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-4 text-left">Area Name</th>
                        <th className="px-8 py-4 text-left">Code</th>
                        <th className="px-8 py-4 text-left">Master Status</th>
                        <th className="px-8 py-4 text-left">Vendor Density</th>
                        <th className="px-8 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {filteredLocations.map(loc => {
                        const locationVendors = getVendorsInLocation(loc.name);
                        return (
                          <tr key={loc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-8 py-4">
                              <div className="flex items-center gap-3">
                                <MapPin size={18} className={loc.isActive !== false ? 'text-orange-500' : 'text-gray-300'} />
                                <span className={`font-bold ${loc.isActive !== false ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{loc.name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-4">
                              <span className="font-black text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{loc.code}</span>
                            </td>
                            <td className="px-8 py-4">
                              <button 
                                onClick={() => toggleLocationStatus(loc)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                  loc.isActive !== false 
                                    ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                                    : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'
                                }`}
                              >
                                <Power size={10} />
                                {loc.isActive !== false ? 'Active' : 'Disabled'}
                              </button>
                            </td>
                            <td className="px-8 py-4">
                              <button 
                                onClick={() => setViewingLocationVendors(loc)}
                                className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl text-xs font-black hover:bg-orange-500 hover:text-white transition-all flex items-center gap-2"
                              >
                                <Store size={14} />
                                {locationVendors.length} Vendors
                              </button>
                            </td>
                            <td className="px-8 py-4 text-right">
                              <div className="flex justify-end items-center gap-2">
                                <button 
                                  onClick={() => {
                                    setEditArea({...loc});
                                    setIsEditAreaModalOpen(true);
                                  }}
                                  className="p-2.5 text-gray-400 hover:text-blue-500 transition-colors"
                                >
                                  <Edit3 size={18} />
                                </button>
                                <button 
                                  onClick={() => setViewingLocationVendors(loc)}
                                  className="p-2.5 text-gray-400 hover:text-orange-500 transition-colors"
                                >
                                  <Eye size={18} />
                                </button>
                                <button 
                                  onClick={() => onDeleteLocation(loc.id)}
                                  className="p-2.5 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {activeTab === 'REPORTS' && (
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-xl">
             <div className="flex-1 flex flex-col md:flex-row gap-6 w-full">
                <div className="flex-1">
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Date Range Overview</label>
                   <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" />
                        <input 
                          type="date" 
                          value={reportStart}
                          onChange={(e) => setReportStart(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl text-xs font-black dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" 
                        />
                      </div>
                      <span className="text-gray-300 dark:text-gray-600 font-bold">~</span>
                      <div className="relative flex-1">
                        <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" />
                        <input 
                          type="date" 
                          value={reportEnd}
                          onChange={(e) => setReportEnd(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl text-xs font-black dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" 
                        />
                      </div>
                   </div>
                </div>

                <div className="w-full md:w-56">
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Order Status</label>
                   <div className="relative">
                      <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none" />
                      <select 
                        value={reportStatus}
                        onChange={(e) => setReportStatus(e.target.value as any)}
                        className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl text-xs font-black dark:text-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="ALL">All Reports</option>
                        <option value={OrderStatus.PENDING}>Pending</option>
                        <option value={OrderStatus.ONGOING}>Ongoing</option>
                        <option value={OrderStatus.COMPLETED}>Served</option>
                        <option value={OrderStatus.CANCELLED}>Cancel</option>
                      </select>
                   </div>
                </div>
             </div>

             <button 
                onClick={handleDownloadReport}
                disabled={filteredReports.length === 0}
                className="w-full md:w-auto px-8 py-4 bg-black dark:bg-white text-white dark:text-gray-900 rounded-[1.25rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg disabled:opacity-50"
             >
                <Download size={20} />
                Export CSV
             </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border dark:border-gray-700 shadow-xl overflow-hidden">
             <div className="px-8 py-6 bg-gray-50/50 dark:bg-gray-700/50 border-b dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-black text-lg dark:text-white uppercase tracking-tighter">System-Wide Transactions</h3>
                <span className="px-4 py-1.5 bg-orange-500 text-white rounded-full text-[10px] font-black">{filteredReports.length} Records</span>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/30 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-4 text-left">Order ID</th>
                      <th className="px-8 py-4 text-left">Vendor</th>
                      <th className="px-8 py-4 text-left">Location</th>
                      <th className="px-8 py-4 text-left">Time</th>
                      <th className="px-8 py-4 text-left">Status</th>
                      <th className="px-8 py-4 text-left">Menu Order</th>
                      <th className="px-8 py-4 text-right">Total Bill</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-24 text-center">
                          <div className="max-w-xs mx-auto text-gray-500 dark:text-gray-400">
                             <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                             <p className="font-bold text-lg mb-1">No matches found</p>
                             <p className="text-xs">Adjust your date or status filters to view system activity.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map(report => {
                        const res = restaurants.find(r => r.id === report.restaurantId);
                        return (
                          <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                            <td className="px-8 py-5">
                              <span className="font-black text-xs text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{report.id}</span>
                            </td>
                            <td className="px-8 py-5">
                               <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-black text-[10px] uppercase">
                                     {res?.name.charAt(0)}
                                  </div>
                                  <span className="font-bold text-xs text-gray-800 dark:text-gray-200">{res?.name}</span>
                               </div>
                            </td>
                            <td className="px-8 py-5">
                               <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter truncate max-w-[120px] block">{res?.location}</span>
                            </td>
                            <td className="px-8 py-5">
                               <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{new Date(report.timestamp).toLocaleDateString()}</p>
                               <p className="text-[9px] text-gray-400">{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </td>
                            <td className="px-8 py-5">
                               <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter whitespace-nowrap ${
                                 report.status === OrderStatus.COMPLETED ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 
                                 report.status === OrderStatus.CANCELLED ? 'bg-red-100 text-red-600 dark:bg-red-900/20' : 
                                 'bg-orange-100 text-orange-600 dark:bg-orange-900/20'
                               }`}>
                                 {report.status === OrderStatus.COMPLETED ? 'Served' : report.status === OrderStatus.CANCELLED ? 'Cancel' : report.status}
                               </span>
                            </td>
                            <td className="px-8 py-5">
                              <div className="max-w-[180px]">
                                 {report.items.map((item, idx) => (
                                   <p key={idx} className="text-[9px] text-gray-600 dark:text-gray-400 font-medium truncate leading-relaxed">
                                     <span className="text-orange-500 font-black mr-1">x{item.quantity}</span>
                                     {item.name}
                                     {item.selectedSize && <span className="ml-1 opacity-60">[{item.selectedSize}]</span>}
                                   </p>
                                 ))}
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right font-black text-sm text-gray-900 dark:text-white">
                              ${report.total.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* Viewing Vendors in Location Modal */}
      {viewingLocationVendors && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] max-w-2xl w-full p-10 shadow-2xl relative animate-in zoom-in fade-in duration-300">
            <button 
              onClick={() => setViewingLocationVendors(null)} 
              className="absolute top-8 right-8 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            >
              <X size={24} />
            </button>

            <div className="mb-8">
              <div className="flex items-center gap-3 text-orange-500 mb-2">
                <MapPin size={24} />
                <h2 className="text-2xl font-black dark:text-white">{viewingLocationVendors.name}</h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-widest">Zone: {viewingLocationVendors.code} • {getVendorsInLocation(viewingLocationVendors.name).length} Vendors Assigned</p>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-4 custom-scrollbar">
               {getVendorsInLocation(viewingLocationVendors.name).map(res => {
                  const vendor = vendors.find(v => v.restaurantId === res.id);
                  return (
                    <div key={res.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border dark:border-gray-700">
                      <div className="flex items-center gap-4">
                         <img src={res.logo} className="w-12 h-12 rounded-xl" />
                         <div>
                            <p className="font-black text-gray-900 dark:text-white leading-tight">{res.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">@{vendor?.username}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${vendor?.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {vendor?.isActive ? 'Active' : 'Disabled'}
                         </span>
                         <button 
                            onClick={() => {
                              if (vendor) {
                                setViewingLocationVendors(null);
                                onImpersonateVendor(vendor);
                              }
                            }}
                            className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-orange-500 rounded-lg shadow-sm"
                            title="Login as Vendor"
                         >
                            <LogIn size={18} />
                         </button>
                      </div>
                    </div>
                  );
               })}
               {getVendorsInLocation(viewingLocationVendors.name).length === 0 && (
                 <div className="text-center py-12">
                    <Store size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-400 font-bold">No vendors currently assigned to this zone.</p>
                 </div>
               )}
            </div>

            <button 
              onClick={() => setViewingLocationVendors(null)}
              className="w-full mt-8 py-4 bg-black dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all"
            >
              Close Lookup
            </button>
          </div>
        </div>
      )}

      {/* Register Area Modal */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setIsAreaModalOpen(false)} 
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            >
              <X size={20} />
            </button>
            <div className="mb-8">
              <div className="w-14 h-14 bg-black dark:bg-gray-700 text-white rounded-2xl flex items-center justify-center mb-4">
                <MapPin size={28} />
              </div>
              <h2 className="text-2xl font-black dark:text-white">Register New Area</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Create a new hub for restaurants and customers.</p>
            </div>
            <form onSubmit={handleAddArea} className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Area Name</label>
                  <input required type="text" placeholder="Downtown Mall" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none" value={newArea.name} onChange={(e) => setNewArea({...newArea, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Code</label>
                  <input required type="text" maxLength={3} placeholder="SF1" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-black uppercase outline-none" value={newArea.code} onChange={(e) => setNewArea({...newArea, code: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">City</label>
                  <input required type="text" placeholder="San Francisco" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none" value={newArea.city} onChange={(e) => setNewArea({...newArea, city: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">State</label>
                  <input required type="text" placeholder="CA" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none" value={newArea.state} onChange={(e) => setNewArea({...newArea, state: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setIsAreaModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold text-gray-600 dark:text-gray-300">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-black dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black">Register Area</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Area Modal */}
      {isEditAreaModalOpen && editArea && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setIsEditAreaModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={20} /></button>
            <div className="mb-8">
              <div className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center mb-4"><Edit3 size={28} /></div>
              <h2 className="text-2xl font-black dark:text-white">Edit Area Info</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Update zone details and identification code.</p>
            </div>
            <form onSubmit={handleUpdateAreaSubmit} className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Area Name</label>
                  <input required type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none" value={editArea.name} onChange={(e) => setEditArea({...editArea, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Code</label>
                  <input required type="text" maxLength={3} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-black uppercase outline-none" value={editArea.code} onChange={(e) => setEditArea({...editArea, code: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">City</label>
                  <input required type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none" value={editArea.city} onChange={(e) => setEditArea({...editArea, city: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">State</label>
                  <input required type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none" value={editArea.state} onChange={(e) => setEditArea({...editArea, state: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setIsEditAreaModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold text-gray-600 dark:text-gray-300">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-blue-500 text-white rounded-2xl font-black">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={20} /></button>
            <h2 className="text-2xl font-black mb-2 dark:text-white">Register New Vendor</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Set up account and store details for a new platform vendor.</p>
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Store Name</label>
                  <input required type="text" placeholder="e.g. Pasta Hub" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none" value={newVendor.restaurantName} onChange={(e) => setNewVendor({...newVendor, restaurantName: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-1" ref={dropdownRef}>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Location Selection</label>
                  <div className="relative">
                    <div className="relative">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder={newVendor.location || "Search area..."} className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none text-sm transition-all ${newVendor.location ? 'border-orange-500' : 'border-transparent'}`} value={vendorLocationSearch} onFocus={() => setShowLocationDropdown(true)} onChange={(e) => { setVendorLocationSearch(e.target.value); setShowLocationDropdown(true); }} />
                    </div>
                    {showLocationDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl shadow-2xl z-[100] max-h-48 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                        {filteredVendorLocations.length > 0 ? filteredVendorLocations.map(loc => (
                          <button key={loc.id} type="button" onClick={() => { setNewVendor({...newVendor, location: loc.name}); setVendorLocationSearch(loc.name); setShowLocationDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors border-b dark:border-gray-700 last:border-none">
                            <MapPin size={16} className="text-orange-500 shrink-0" />
                            <div className="min-w-0"><p className="font-bold text-sm text-gray-900 dark:text-white truncate">{loc.name}</p><p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">{loc.city}, {loc.state}</p></div>
                          </button>
                        )) : (
                          <div className="px-4 py-8 text-center"><MapPin size={24} className="mx-auto text-gray-300 mb-2" /><p className="text-xs text-gray-500">No areas matching "{vendorLocationSearch}"</p></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label><input type="email" placeholder="e.g. chef@store.com" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none text-sm" value={newVendor.email} onChange={(e) => setNewVendor({...newVendor, email: e.target.value})} /></div>
                <div><label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label><input type="tel" placeholder="e.g. +1 234 567" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none text-sm" value={newVendor.phone} onChange={(e) => setNewVendor({...newVendor, phone: e.target.value})} /></div>
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold text-gray-600 dark:text-gray-300">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {isEditModalOpen && editVendor && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={20} /></button>
            <div className="flex items-center justify-between mb-2"><h2 className="text-2xl font-black dark:text-white">Edit Vendor</h2></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Modify store settings or reassigned physical location.</p>
            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Restaurant Name</label><input required type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none" value={editVendor.restaurant.name} onChange={(e) => setEditVendor({...editVendor, restaurant: {...editVendor.restaurant, name: e.target.value}})} /></div>
                
                <div className="col-span-2" ref={editDropdownRef}>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Location Assignment</label>
                  <div className="relative">
                    <div className="relative">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search area..." 
                        className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none text-sm transition-all ${editVendor.restaurant.location ? 'border-blue-500' : 'border-transparent'}`} 
                        value={editLocationSearch} 
                        onFocus={() => setShowEditLocationDropdown(true)} 
                        onChange={(e) => { setEditLocationSearch(e.target.value); setShowEditLocationDropdown(true); }} 
                      />
                    </div>
                    {showEditLocationDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl shadow-2xl z-[100] max-h-48 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                        {filteredEditLocations.length > 0 ? filteredEditLocations.map(loc => (
                          <button key={loc.id} type="button" onClick={() => { setEditVendor({...editVendor, restaurant: {...editVendor.restaurant, location: loc.name}}); setEditLocationSearch(loc.name); setShowEditLocationDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors border-b dark:border-gray-700 last:border-none">
                            <MapPin size={16} className="text-orange-500 shrink-0" />
                            <div className="min-w-0"><p className="font-bold text-sm text-gray-900 dark:text-white truncate">{loc.name}</p><p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">{loc.city}, {loc.state}</p></div>
                          </button>
                        )) : (
                          <div className="px-4 py-8 text-center"><MapPin size={24} className="mx-auto text-gray-300 mb-2" /><p className="text-xs text-gray-500">No areas matching "{editLocationSearch}"</p></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-2 md:col-span-1"><label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label><input type="email" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none text-sm" value={editVendor.user.email || ''} onChange={(e) => setEditVendor({...editVendor, user: {...editVendor.user, email: e.target.value}})} /></div>
                <div className="col-span-2 md:col-span-1"><label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label><input type="tel" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium outline-none text-sm" value={editVendor.user.phone || ''} onChange={(e) => setEditVendor({...editVendor, user: {...editVendor.user, phone: e.target.value}})} /></div>
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-orange-600 transition-all active:scale-[0.98]">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;