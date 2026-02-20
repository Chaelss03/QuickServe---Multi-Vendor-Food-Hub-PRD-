
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Role, Restaurant, Order, OrderStatus, CartItem, MenuItem, Area } from './types';
import CustomerView from './pages/CustomerView';
import VendorView from './pages/VendorView';
import AdminView from './pages/AdminView';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import { supabase } from './lib/supabase';
import { LogOut, Sun, Moon, MapPin, LogIn, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // --- HYDRATED STATE ---
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('qs_cache_users');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    try {
      const saved = localStorage.getItem('qs_cache_restaurants');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('qs_cache_orders');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [locations, setLocations] = useState<Area[]>(() => {
    try {
      const saved = localStorage.getItem('qs_cache_locations');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [isLoading, setIsLoading] = useState(() => {
    try {
      const hasRes = localStorage.getItem('qs_cache_restaurants');
      const hasLoc = localStorage.getItem('qs_cache_locations');
      return !(hasRes && hasLoc);
    } catch { return true; }
  });

  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // --- TRANSACTION LOCKS ---
  const lockedOrderIds = useRef<Set<string>>(new Set());
  const isStatusLocked = useRef<boolean>(false);
  const isFetchingRef = useRef(false);
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('qs_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  
  const [currentRole, setCurrentRole] = useState<Role | null>(() => {
    return localStorage.getItem('qs_role') as Role | null;
  });
  
  const [view, setView] = useState<'LANDING' | 'LOGIN' | 'APP'>(() => {
    return (localStorage.getItem('qs_view') as any) || 'LANDING';
  });
  
  const [sessionLocation, setSessionLocation] = useState<string | null>(() => {
    return localStorage.getItem('qs_session_location');
  });
  
  const [sessionTable, setSessionTable] = useState<string | null>(() => {
    return localStorage.getItem('qs_session_table');
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const persistCache = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage quota exceeded.");
    }
  };

  const parseTimestamp = (ts: any): number => {
    if (!ts) return Date.now();
    if (typeof ts === 'string') {
      if (/^\d+$/.test(ts)) return parseInt(ts, 10);
      const date = new Date(ts);
      const time = date.getTime();
      return isNaN(time) ? Date.now() : time;
    }
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'bigint') return Number(ts);
    return Date.now();
  };

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) {
      const mapped = data.map(u => ({
        id: u.id, username: u.username, role: u.role as Role,
        restaurantId: u.restaurant_id, password: u.password,
        isActive: u.is_active, email: u.email, phone: u.phone
      }));
      setAllUsers(mapped);
      persistCache('qs_cache_users', mapped);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    const { data, error } = await supabase.from('areas').select('*').order('name');
    if (!error && data) {
      const mapped = data.map(l => ({
        id: l.id, name: l.name, city: l.city, state: l.state, code: l.code, isActive: l.is_active ?? true, type: l.type as 'MULTI' | 'SINGLE'
      }));
      setLocations(mapped);
      persistCache('qs_cache_locations', mapped);
    }
  }, []);

  const fetchRestaurants = useCallback(async () => {
    if (isStatusLocked.current) return;
    
    let query = supabase.from('restaurants').select('*');
    
    // Optimization: If customer, only fetch restaurants for their location
    const savedRole = localStorage.getItem('qs_role');
    const savedLoc = localStorage.getItem('qs_session_location');
    if (savedRole === 'CUSTOMER' && savedLoc) {
      query = query.eq('location_name', savedLoc);
    }

    const { data: resData, error: resError } = await query;
    const { data: menuData, error: menuError } = await supabase.from('menu_items').select('*');
    if (!resError && !menuError && resData && menuData) {
      const formatted: Restaurant[] = resData.map(res => ({
        id: res.id, name: res.name, logo: res.logo, vendorId: res.vendor_id,
        location: res.location_name, created_at: res.created_at,
        isOnline: res.is_online === true || res.is_online === null,
        menu: menuData.filter(m => m.restaurant_id === res.id).map(m => {
          const temp = m.temp_options || {};
          const others = m.other_variants || {};
          return {
            id: m.id, name: m.name, description: m.description, price: Number(m.price),
            image: m.image, category: m.category, isArchived: m.is_archived,
            sizes: m.sizes,
            tempOptions: {
              enabled: temp.enabled ?? false,
              hot: temp.hot ?? 0,
              cold: temp.cold ?? 0
            },
            otherVariantName: others.name || '',
            otherVariants: others.options || [],
            otherVariantsEnabled: others.enabled ?? false
          };
        })
      }));
      setRestaurants(formatted);
      persistCache('qs_cache_restaurants', formatted);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      let query = supabase.from('orders').select('*').order('timestamp', { ascending: false }).limit(200);
      
      // Optimization: Vendors only need their own orders
      const savedUser = localStorage.getItem('qs_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user.role === 'VENDOR' && user.restaurantId) {
          query = query.eq('restaurant_id', user.restaurantId);
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        setOrders(prev => {
          const mapped = data.map(o => {
            const mappedOrder: Order = {
              id: o.id, 
              items: Array.isArray(o.items) ? o.items : (typeof o.items === 'string' ? JSON.parse(o.items) : []), 
              total: Number(o.total || 0),
              status: o.status as OrderStatus, 
              timestamp: parseTimestamp(o.timestamp),
              customerId: o.customer_id, 
              restaurantId: o.restaurant_id,
              tableNumber: o.table_number, 
              locationName: o.location_name,
              remark: o.remark, 
              rejectionReason: o.rejection_reason, 
              rejectionNote: o.rejection_note
            };
            if (lockedOrderIds.current.has(o.id)) {
              const localOrder = prev.find(p => p.id === o.id);
              if (localOrder) mappedOrder.status = localOrder.status;
            }
            return mappedOrder;
          });
          persistCache('qs_cache_orders', mapped);
          return mapped;
        });
      }
    } catch (e) {
      console.error("Fetch orders failed", e);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Combined refresh function to ensure heartbeat works reliably
  const refreshAppData = useCallback(async () => {
    await Promise.allSettled([fetchOrders(), fetchRestaurants()]);
    setLastSyncTime(new Date());
  }, [fetchOrders, fetchRestaurants]);

  // QR Redirection Logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get('loc');
    const table = params.get('table');
    if (loc && table) {
      setSessionLocation(loc);
      setSessionTable(table);
      setCurrentRole('CUSTOMER');
      setView('APP');
      localStorage.setItem('qs_role', 'CUSTOMER');
      localStorage.setItem('qs_view', 'APP');
      localStorage.setItem('qs_session_location', loc);
      localStorage.setItem('qs_session_table', table);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Global Data Polling (Simplified Dependencies)
  useEffect(() => {
    const initApp = async () => {
      await Promise.allSettled([fetchUsers(), fetchLocations(), fetchRestaurants(), fetchOrders()]);
      setLastSyncTime(new Date());
      setIsLoading(false);
    };
    initApp();

    const channel = supabase.channel('qs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const o = payload.new;
        const mappedOrder: Order = {
          id: o.id, 
          items: Array.isArray(o.items) ? o.items : (typeof o.items === 'string' ? JSON.parse(o.items) : []), 
          total: Number(o.total || 0),
          status: o.status as OrderStatus, 
          timestamp: parseTimestamp(o.timestamp),
          customerId: o.customer_id, 
          restaurantId: o.restaurant_id,
          tableNumber: o.table_number, 
          locationName: o.location_name,
          remark: o.remark, 
          rejectionReason: o.rejection_reason, 
          rejectionNote: o.rejection_note
        };
        
        setOrders(prev => {
          if (prev.some(existing => existing.id === mappedOrder.id)) return prev;
          const updated = [mappedOrder, ...prev].slice(0, 200);
          persistCache('qs_cache_orders', updated);
          return updated;
        });
        setLastSyncTime(new Date());
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const o = payload.new;
        setOrders(prev => {
          const updated = prev.map(existing => {
            if (existing.id === o.id) {
              // Only update if not locked or if the status matches what we expect
              if (lockedOrderIds.current.has(o.id) && existing.status === o.status) {
                lockedOrderIds.current.delete(o.id);
              }
              
              if (lockedOrderIds.current.has(o.id)) return existing;

              return {
                ...existing,
                status: o.status as OrderStatus,
                rejectionReason: o.rejection_reason,
                rejectionNote: o.rejection_note
              };
            }
            return existing;
          });
          persistCache('qs_cache_orders', updated);
          return updated;
        });
        setLastSyncTime(new Date());
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurants' }, (payload) => {
        const res = payload.new;
        setRestaurants(prev => {
          const updated = prev.map(r => r.id === res.id ? { ...r, isOnline: res.is_online === true || res.is_online === null } : r);
          persistCache('qs_cache_restaurants', updated);
          return updated;
        });
        setLastSyncTime(new Date());
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [fetchUsers, fetchLocations, fetchRestaurants, fetchOrders]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleScanSimulation = (locationName: string, tableNo: string) => {
    setSessionLocation(locationName);
    setSessionTable(tableNo);
    setCurrentRole('CUSTOMER');
    setView('APP');
    localStorage.setItem('qs_role', 'CUSTOMER');
    localStorage.setItem('qs_view', 'APP');
    localStorage.setItem('qs_session_location', locationName);
    localStorage.setItem('qs_session_table', tableNo);
  };

  const placeOrder = async (remark: string) => {
    if (cart.length === 0) return;
    const uniqueRestaurantIdsInCart = Array.from(new Set(cart.map(item => item.restaurantId)));
    const offlineRestaurants = uniqueRestaurantIdsInCart
      .map(rid => restaurants.find(r => r.id === rid))
      .filter(res => !res || res.isOnline === false);

    if (offlineRestaurants.length > 0) {
      alert(`Error: The following kitchen(s) are currently offline: ${offlineRestaurants.map(r => r?.name).join(', ')}. Please remove these items from your cart.`);
      return;
    }

    const area = locations.find(l => l.name === sessionLocation);
    const code = area?.code || 'QS';
    let nextNum = 1;
    const { data: lastOrder } = await supabase.from('orders')
      .select('id')
      .ilike('id', `${code}%`)
      .order('id', { ascending: false })
      .limit(1);

    if (lastOrder && lastOrder[0]) {
      const lastIdFull = lastOrder[0].id;
      const basePart = lastIdFull.split('-')[0];
      const numPart = basePart.substring(code.length);
      const parsed = parseInt(numPart);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    const baseOrderId = `${code}${String(nextNum).padStart(7, '0')}`;

    const ordersToInsert = uniqueRestaurantIdsInCart.map((rid, index) => {
      const itemsForThisRestaurant = cart.filter(item => item.restaurantId === rid);
      const totalForThisRestaurant = itemsForThisRestaurant.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const finalOrderId = uniqueRestaurantIdsInCart.length > 1 ? `${baseOrderId}-${index + 1}` : baseOrderId;
      return {
        id: finalOrderId, items: itemsForThisRestaurant, total: totalForThisRestaurant,
        status: OrderStatus.PENDING, timestamp: Date.now(), customer_id: 'guest_user',
        restaurant_id: rid, table_number: sessionTable || 'N/A', location_name: sessionLocation || 'Unspecified',
        remark: remark
      };
    });

    const { error } = await supabase.from('orders').insert(ordersToInsert);
    if (error) alert("Placement Error: " + error.message);
    else { setCart([]); alert(`Your order(s) have been placed! Reference: ${baseOrderId}`); }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user); setCurrentRole(user.role); setView('APP');
    localStorage.setItem('qs_user', JSON.stringify(user));
    localStorage.setItem('qs_role', user.role);
    localStorage.setItem('qs_view', 'APP');
  };

  const handleLogout = () => {
    setCurrentUser(null); setCurrentRole(null); setSessionLocation(null);
    setSessionTable(null); setView('LANDING'); localStorage.clear();
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, reason?: string, note?: string) => {
    lockedOrderIds.current.add(orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, rejectionReason: reason, rejectionNote: note } : o));
    await supabase.from('orders').update({ status, rejection_reason: reason, rejection_note: note }).eq('id', orderId);
    setTimeout(() => lockedOrderIds.current.delete(orderId), 3000);
  };

  const toggleVendorOnline = async (restaurantId: string, currentStatus: boolean) => {
    const res = restaurants.find(r => r.id === restaurantId);
    const vendor = allUsers.find(u => u.restaurantId === restaurantId);
    
    // If master activation is disabled, cannot turn online
    if (!currentStatus && vendor && vendor.isActive === false) {
      alert("Cannot turn online: Master Activation is disabled for this vendor.");
      return;
    }

    const newStatus = !currentStatus;
    isStatusLocked.current = true;
    setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, isOnline: newStatus } : r));
    const { error } = await supabase.from('restaurants').update({ is_online: newStatus }).eq('id', restaurantId);
    if (error) fetchRestaurants();
    setTimeout(() => isStatusLocked.current = false, 3000);
  };

  const addToCart = (item: CartItem) => {
    const res = restaurants.find(r => r.id === item.restaurantId);
    if (res && res.isOnline === false) { alert("This kitchen is currently offline."); return; }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.selectedSize === item.selectedSize && i.selectedTemp === item.selectedTemp && i.selectedOtherVariant === item.selectedOtherVariant);
      if (existing) return prev.map(i => (i.id === item.id && i.selectedSize === item.selectedSize && i.selectedTemp === item.selectedTemp && i.selectedOtherVariant === item.selectedOtherVariant) ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i.id !== itemId);
    });
  };

  // --- MENU ITEM HANDLERS ---
  const handleUpdateMenuItem = async (restaurantId: string, item: MenuItem) => {
    const { error } = await supabase.from('menu_items').update({
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.category,
      is_archived: item.isArchived,
      sizes: item.sizes,
      temp_options: item.tempOptions || { enabled: false, hot: 0, cold: 0 },
      other_variants: {
        name: item.otherVariantName,
        options: item.otherVariants,
        enabled: item.otherVariantsEnabled
      }
    }).eq('id', item.id);
    if (error) alert("Error updating menu item: " + error.message);
    else fetchRestaurants();
  };

  const handleAddMenuItem = async (restaurantId: string, item: MenuItem) => {
    const { error } = await supabase.from('menu_items').insert({
      id: item.id,
      restaurant_id: restaurantId,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.category,
      is_archived: false,
      sizes: item.sizes,
      temp_options: item.tempOptions || { enabled: false, hot: 0, cold: 0 },
      other_variants: {
        name: item.otherVariantName,
        options: item.otherVariants,
        enabled: item.otherVariantsEnabled
      }
    });
    if (error) alert("Error adding menu item: " + error.message);
    else fetchRestaurants();
  };

  const handleDeleteMenuItem = async (restaurantId: string, itemId: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (!error) fetchRestaurants();
  };

  // --- VENDOR & HUB HANDLERS ---
  const handleAddVendor = async (user: User, restaurant: Restaurant) => {
    const userId = crypto.randomUUID();
    const resId = crypto.randomUUID();
    const { error: userError } = await supabase.from('users').insert({
      id: userId, username: user.username, password: user.password, role: 'VENDOR',
      restaurant_id: resId, is_active: true, email: user.email, phone: user.phone
    });
    if (userError) { alert("Error adding user: " + userError.message); return; }
    const { error: resError } = await supabase.from('restaurants').insert({
      id: resId, name: restaurant.name, logo: restaurant.logo, vendor_id: userId,
      location_name: restaurant.location, is_online: true
    });
    if (resError) alert("Error adding restaurant: " + resError.message);
    fetchUsers(); fetchRestaurants();
  };

  const handleUpdateVendor = async (user: User, restaurant: Restaurant) => {
    const { error: userError } = await supabase.from('users').update({
      username: user.username, password: user.password, email: user.email, phone: user.phone, is_active: user.isActive
    }).eq('id', user.id);
    
    // If deactivating vendor, also set restaurant offline
    const resUpdate: any = {
      name: restaurant.name, 
      logo: restaurant.logo, 
      location_name: restaurant.location
    };
    if (user.isActive === false) {
      resUpdate.is_online = false;
    }

    const { error: resError } = await supabase.from('restaurants').update(resUpdate).eq('id', restaurant.id);
    if (userError || resError) alert("Error updating vendor");
    fetchUsers(); fetchRestaurants();
  };

  const handleAddLocation = async (area: Area) => {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('areas').insert({
      id, name: area.name, city: area.city, state: area.state, code: area.code, is_active: true, type: area.type || 'MULTI'
    });
    if (!error) fetchLocations();
  };

  const handleUpdateLocation = async (area: Area) => {
    const { error } = await supabase.from('areas').update({
      name: area.name, city: area.city, state: area.state, code: area.code, is_active: area.isActive, type: area.type
    }).eq('id', area.id);
    if (!error) fetchLocations();
  };

  const handleDeleteLocation = async (areaId: string) => {
    const { error } = await supabase.from('areas').delete().eq('id', areaId);
    if (!error) fetchLocations();
  };

  const activeVendorRes = currentUser?.role === 'VENDOR' ? restaurants.find(r => r.id === currentUser.restaurantId) : null;
  const currentArea = locations.find(l => l.name === sessionLocation);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]">Syncing Hub...</p>
      </div>
    );
  }

  if (view === 'LANDING') {
    return <LandingPage onScan={handleScanSimulation} onLoginClick={() => setView('LOGIN')} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} locations={locations.filter(l => l.isActive !== false)} />;
  }

  if (view === 'LOGIN') {
    return <LoginPage allUsers={allUsers} onLogin={handleLogin} onBack={() => setView('LANDING')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b dark:border-gray-700 h-16 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('LANDING')}>
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black">Q</div>
          <h1 className="text-xl font-black dark:text-white">QuickServe</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-gray-400 font-bold uppercase">{currentUser.role}</p>
                <p className="text-xs font-black dark:text-white">{currentUser.username}</p>
              </div>
              <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"><LogOut size={20} /></button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">
        {currentRole === 'CUSTOMER' && <CustomerView restaurants={restaurants.filter(r => r.location === sessionLocation && r.isOnline === true)} cart={cart} orders={orders} onAddToCart={addToCart} onRemoveFromCart={removeFromCart} onPlaceOrder={placeOrder} locationName={sessionLocation || undefined} tableNo={sessionTable || undefined} areaType={currentArea?.type || 'MULTI'} allRestaurants={restaurants} />}
        {currentRole === 'VENDOR' && activeVendorRes && <VendorView restaurant={activeVendorRes} orders={orders.filter(o => o.restaurantId === currentUser?.restaurantId)} onUpdateOrder={updateOrderStatus} onUpdateMenu={handleUpdateMenuItem} onAddMenuItem={handleAddMenuItem} onPermanentDeleteMenuItem={handleDeleteMenuItem} onToggleOnline={() => toggleVendorOnline(activeVendorRes.id, activeVendorRes.isOnline ?? true)} lastSyncTime={lastSyncTime} />}
        {currentRole === 'ADMIN' && <AdminView vendors={allUsers.filter(u => u.role === 'VENDOR')} restaurants={restaurants} orders={orders} locations={locations} onAddVendor={handleAddVendor} onUpdateVendor={handleUpdateVendor} onImpersonateVendor={handleLogin} onAddLocation={handleAddLocation} onUpdateLocation={handleUpdateLocation} onDeleteLocation={handleDeleteLocation} onToggleOnline={toggleVendorOnline} onRemoveVendorFromHub={(rid) => supabase.from('restaurants').update({ location_name: null }).eq('id', rid).then(() => fetchRestaurants())} />}
      </main>
    </div>
  );
};

export default App;
