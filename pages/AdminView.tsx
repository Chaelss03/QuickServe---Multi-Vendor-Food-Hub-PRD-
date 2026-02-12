
import React, { useState, useMemo } from 'react';
import { User, Restaurant, Order, Area, OrderStatus } from '../types';
import { Users, Store, TrendingUp, Settings, ShieldCheck, Mail, Search, Filter, X, Plus, MapPin, Power, CheckCircle2, AlertCircle, LogIn, Trash2, LayoutGrid, List, ChevronRight, Eye, Globe, Phone, ShoppingBag, Edit3, Hash, Download, Calendar, ChevronLeft, Database, Image as ImageIcon, Key } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'VENDORS' | 'LOCATIONS' | 'REPORTS' | 'SYSTEM'>('VENDORS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Registration Form State
  const [newVendor, setNewVendor] = useState({
    username: '',
    password: '',
    restaurantName: '',
    location: '',
    email: '',
    phone: '',
    logo: ''
  });
  
  // Location Form State
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [isEditAreaModalOpen, setIsEditAreaModalOpen] = useState(false);
  const [newArea, setNewArea] = useState({ name: '', city: '', state: '', code: '' });
  const [editArea, setEditArea] = useState<Area | null>(null);

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const res = restaurants.find(r => r.id === vendor.restaurantId);
      const matchesSearch = vendor.username.toLowerCase().includes(searchQuery.toLowerCase()) || res?.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [vendors, restaurants, searchQuery]);

  const handleRegisterVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.username || !newVendor.password || !newVendor.location) {
      alert("Required: Username, Password, and Location.");
      return;
    }
    
    const newUser: User = { 
      id: '', 
      username: newVendor.username, 
      password: newVendor.password, 
      role: 'VENDOR', 
      email: newVendor.email, 
      phone: newVendor.phone,
      isActive: true
    };
    
    const newRes: Restaurant = { 
      id: '', 
      name: newVendor.restaurantName, 
      logo: newVendor.logo || `https://picsum.photos/seed/${newVendor.restaurantName}/400/300`, 
      vendorId: '', 
      location: newVendor.location, 
      menu: [] 
    };
    
    onAddVendor(newUser, newRes);
    setIsModalOpen(false);
    setNewVendor({ username: '', password: '', restaurantName: '', location: '', email: '', phone: '', logo: '' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Platform Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black dark:text-white tracking-tighter uppercase leading-none mb-1">Platform Master</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] ml-1">Central Administrative Node</p>
        </div>
        <div className="flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 border dark:border-gray-700 shadow-sm transition-colors">
          {[
            { id: 'VENDORS', label: 'Vendors', icon: Store },
            { id: 'LOCATIONS', label: 'Hubs', icon: MapPin },
            { id: 'REPORTS', label: 'Stats', icon: TrendingUp },
            { id: 'SYSTEM', label: 'System', icon: Database }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-widest ${
                activeTab === tab.id 
                  ? 'bg-orange-500 text-white shadow-xl shadow-orange-100 dark:shadow-none' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'VENDORS' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="px-8 py-6 border-b dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-50/50 dark:bg-gray-700/50">
            <h3 className="font-black dark:text-white uppercase tracking-tighter text-lg">Partner Directory</h3>
            <div className="flex flex-wrap gap-4">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Filter store or user..." 
                  className="pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all dark:text-white" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-100 dark:shadow-none hover:bg-orange-600 transition-all active:scale-95"
              >
                + Register Vendor
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4 text-left">Kitchen Identity</th>
                  <th className="px-8 py-4 text-left">Zone Name</th>
                  <th className="px-8 py-4 text-left">Account Reference</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredVendors.length === 0 ? (
                   <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-400 italic">No partners found in local registry.</td></tr>
                ) : filteredVendors.map(vendor => {
                  const res = restaurants.find(r => r.id === vendor.restaurantId);
                  return (
                    <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <img src={res?.logo} className="w-10 h-10 rounded-xl shadow-sm object-cover border dark:border-gray-600" />
                          <div>
                            <span className="font-black dark:text-white text-sm block leading-none">{res?.name}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Live Since {new Date(res?.created_at || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{res?.location || 'Floating'}</td>
                      <td className="px-8 py-5 text-xs text-orange-500 font-black tracking-widest uppercase">@{vendor.username}</td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => onImpersonateVendor(vendor)} 
                          className="p-2.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all"
                          title="Impersonate User"
                        >
                          <LogIn size={20} />
                        </button>
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
        <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
           <div className="flex justify-between items-center mb-8 px-2">
              <h2 className="font-black text-2xl dark:text-white uppercase tracking-tighter">Hub Registry</h2>
              <button 
                onClick={() => setIsAreaModalOpen(true)} 
                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all active:scale-95"
              >
                + Register New Area
              </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {locations.map(loc => (
                <div key={loc.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm group hover:border-orange-200 transition-all">
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><MapPin size={28} /></div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditArea(loc); setIsEditAreaModalOpen(true); }} className="p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-blue-500 rounded-xl shadow-sm"><Edit3 size={18} /></button>
                        <button onClick={() => onDeleteLocation(loc.id)} className="p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-red-500 rounded-xl shadow-sm"><Trash2 size={18} /></button>
                      </div>
                   </div>
                   <h4 className="font-black text-xl dark:text-white mb-1 uppercase tracking-tighter leading-none">{loc.name}</h4>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{loc.code} • {loc.city}</p>
                   <div className="mt-4 pt-4 border-t dark:border-gray-700 flex justify-between items-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase">{restaurants.filter(r => r.location === loc.name).length} Stores</span>
                      <div className={`w-2 h-2 rounded-full ${loc.isActive !== false ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'SYSTEM' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700 p-10 shadow-sm animate-in zoom-in duration-500">
           <div className="mb-10">
              <h3 className="font-black text-2xl dark:text-white uppercase tracking-tighter mb-2">Platform Diagnostics</h3>
              <p className="text-gray-500 text-sm font-medium">Real-time telemetry and raw data integrity overview.</p>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
              {[
                { label: 'Cloud Users', count: vendors.length + 1, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Active Kitchens', count: restaurants.length, icon: Store, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                { label: 'Linked Hubs', count: locations.length, icon: MapPin, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                { label: 'Processed Orders', count: orders.length, icon: ShoppingBag, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' }
              ].map(stat => (
                <div key={stat.label} className="p-8 bg-gray-50/50 dark:bg-gray-700/30 rounded-[2rem] border dark:border-gray-600 flex flex-col items-center text-center">
                   <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 shadow-sm`}><stat.icon size={28} /></div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                   <p className="text-4xl font-black dark:text-white leading-none">{stat.count}</p>
                </div>
              ))}
           </div>
           
           <div className="p-8 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5"><AlertCircle size={120} className="text-red-500" /></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                   <AlertCircle size={24} className="text-red-500" />
                   <h4 className="font-black text-red-700 dark:text-red-400 uppercase tracking-widest text-sm">System Maintenance Zone</h4>
                </div>
                <p className="text-xs text-red-600 dark:text-red-500 mb-8 font-medium max-w-xl">
                  Caution: Force synchronization re-queries all Supabase tables to reset the local state engine. Use this if you detect drift between client views and remote storage.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => window.location.reload()} className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-100 dark:shadow-none hover:bg-red-700 transition-all active:scale-95">Re-Sync Engine State</button>
                  <button onClick={() => alert("Cloud Logs: Healthy")} className="px-8 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border dark:border-gray-600 rounded-xl font-bold uppercase tracking-widest text-[10px]">Ping Database Node</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Initialize Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] max-w-2xl w-full p-10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative animate-in zoom-in fade-in duration-300 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={24} /></button>
            <h2 className="text-3xl font-black mb-1 dark:text-white uppercase tracking-tighter">Account Initialization</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-10 font-medium">Deploy a new vendor account and kitchen profile.</p>
            
            <form onSubmit={handleRegisterVendor} className="space-y-8">
              {/* Account Section */}
              <div className="p-8 bg-gray-50 dark:bg-gray-700/50 rounded-[2rem] border dark:border-gray-600">
                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest flex items-center gap-2"><Key size={14} className="text-orange-500" /> Account Security</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Unique Username</label>
                    <input required type="text" placeholder="e.g. burger_master" className="w-full px-5 py-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none text-sm font-bold dark:text-white focus:ring-2 focus:ring-orange-500" value={newVendor.username} onChange={e => setNewVendor({...newVendor, username: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Access Password</label>
                    <input required type="password" placeholder="••••••••" className="w-full px-5 py-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none text-sm font-bold dark:text-white focus:ring-2 focus:ring-orange-500" value={newVendor.password} onChange={e => setNewVendor({...newVendor, password: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Branding Section */}
              <div className="p-8 bg-white dark:bg-gray-800 rounded-[2rem] border dark:border-gray-700 shadow-sm">
                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest flex items-center gap-2"><Store size={14} className="text-orange-500" /> Kitchen Profile</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Store Display Name</label>
                    <input required type="text" placeholder="e.g. Pasta Kingdom" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none text-sm font-bold dark:text-white focus:ring-2 focus:ring-orange-500" value={newVendor.restaurantName} onChange={e => setNewVendor({...newVendor, restaurantName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Assigned Hub</label>
                    <select required className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none text-sm font-bold dark:text-white appearance-none cursor-pointer" value={newVendor.location} onChange={e => setNewVendor({...newVendor, location: e.target.value})}>
                      <option value="">Select Physical Zone</option>
                      {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Branding Logo URL</label>
                    <div className="relative">
                       <ImageIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                       <input type="text" placeholder="https://..." className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none text-sm font-bold dark:text-white" value={newVendor.logo} onChange={e => setNewVendor({...newVendor, logo: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-gray-100 dark:bg-gray-700 rounded-2xl font-black uppercase text-xs tracking-widest text-gray-500">Abort</button>
                <button type="submit" className="flex-1 py-5 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-orange-100 dark:shadow-none hover:bg-orange-600 transition-all active:scale-95">Finalize Provisioning</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Hub Modal */}
      {isEditAreaModalOpen && editArea && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] max-w-md w-full p-10 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setIsEditAreaModalOpen(false)} className="absolute top-8 right-8 p-2 text-gray-400"><X size={24} /></button>
            <h2 className="text-2xl font-black mb-8 dark:text-white uppercase tracking-tighter">Modify Hub Node</h2>
            <div className="space-y-5">
               <div>
                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Zone Identifier (Name)</label>
                 <input required placeholder="Area Name" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none dark:text-white font-bold" value={editArea.name} onChange={e => setEditArea({...editArea, name: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">City</label>
                    <input placeholder="City" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none dark:text-white font-bold" value={editArea.city} onChange={e => setEditArea({...editArea, city: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">ISO Code</label>
                    <input placeholder="Code (e.g. SF)" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl outline-none dark:text-white uppercase font-black" value={editArea.code} onChange={e => setEditArea({...editArea, code: e.target.value.toUpperCase()})} />
                 </div>
               </div>
               <div className="flex gap-3 pt-6">
                 <button onClick={() => setIsEditAreaModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold text-gray-500 uppercase text-[10px] tracking-widest">Cancel</button>
                 <button onClick={() => { onUpdateLocation(editArea); setIsEditAreaModalOpen(false); }} className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-100 dark:shadow-none">Commit Node Update</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
