
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
  
  // --- TRANSACTION LOCKS (Prevent Polling Flickering) ---
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
    // If it's a string from ISO or DB, try parsing it
    if (typeof ts === 'string') {
      const date = new Date(ts);
      const time = date.getTime();
      return isNaN(time) ? Date.now() : time;
    }
    // If it's already a number (bigint returned as number)
    if (typeof ts === 'number') return ts;
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

    const { data: resData, error: resError } = await supabase.from('restaurants').select('*');
    const { data: menuData, error: menuError } = await supabase.from('menu_items').select('*');
    if (!resError && !menuError && resData && menuData) {
      const formatted: Restaurant[] = resData.map(res => ({
        id: res.id, name: res.name, logo: res.logo, vendorId: res.vendor_id,
        location: res.location_name, created_at: res.created_at,
        isOnline: res.is_online === true || res.is_online === null,
        menu: menuData.filter(m => m.restaurant_id === res.id).map(m => ({
          id: m.id, name: m.name, description: m.description, price: Number(m.price),
          image: m.image, category: m.category, isArchived: m.is_archived,
          sizes: m.sizes, tempOptions: m.temp_options,
          otherVariantName: m.other_variant_name,
          otherVariants: m.other_variants, 
          otherVariantsEnabled: m.other_variants_enabled,
          variantGroups: m.variant_groups // Load new variant groups
        }))
      }));
      setRestaurants(formatted);
      persistCache('qs_cache_restaurants', formatted);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data, error } = await supabase.from('orders').select('*').order('timestamp', { ascending: false }).limit(200);
      if (!error && data) {
        setOrders(prev => {
          const mapped = data.map(o => {
            const mappedOrder: Order = {
              id: o.id, items: o.items || [], total: Number(o.total || 0),
              status: o.status as OrderStatus, timestamp: parseTimestamp(o.timestamp),
              customerId: o.customer_id, restaurantId: o.restaurant_id,
              tableNumber: o.table_number, locationName: o.location_name,
              remark: o.remark, rejectionReason: o.rejection_reason, rejectionNote: o.rejection_note
            };

            if (lockedOrderIds.current.has(o.id)) {
              const localOrder = prev.find(p => p.id === o.id);
              if (localOrder) {
                mappedOrder.status = localOrder.status;
              }
            }
            return mappedOrder;
          });
          persistCache('qs_cache_orders', mapped);
          return mapped;
        });
        setLastSyncTime(new Date());
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Handling direct QR Code Navigation from URL params
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
      // Strip params from URL for a clean experience
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      await Promise.allSettled([fetchUsers(), fetchLocations(), fetchRestaurants(), fetchOrders()]);
      setIsLoading(false);
    };
    initApp();

    const channel = supabase.channel('order-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => {
        fetchRestaurants();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [fetchUsers, fetchLocations, fetchRestaurants, fetchOrders]);

  useEffect(() => {
    const activeVendorRes = currentUser?.role === 'VENDOR' ? restaurants.find(r => r.id === currentUser.restaurantId) : null;
    const isOffline = activeVendorRes && activeVendorRes.isOnline === false;

    if (isOffline) return;

    const interval = setInterval(() => {
      fetchOrders();
      fetchRestaurants();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchOrders, fetchRestaurants, restaurants, currentUser]);

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
      
      const finalOrderId = uniqueRestaurantIdsInCart.length > 1 
        ? `${baseOrderId}-${index + 1}` 
        : baseOrderId;

      return {
        id: finalOrderId,
        items: itemsForThisRestaurant,
        total: totalForThisRestaurant,
        status: OrderStatus.PENDING,
        // Use Date.now() for bigint column compatibility
        timestamp: Date.now(),
        customer_id: 'guest_user',
        restaurant_id: rid,
        table_number: sessionTable || 'N/A',
        location_name: sessionLocation || 'Unspecified',
        remark: remark
      };
    });

    const { error } = await supabase.from('orders').insert(ordersToInsert);

    if (error) {
      alert("Placement Error: " + error.message);
    } else {
      setCart([]);
      fetchOrders();
      alert(`Your order(s) have been placed! Reference: ${baseOrderId}${uniqueRestaurantIdsInCart.length > 1 ? ` (Split into ${uniqueRestaurantIdsInCart.length} kitchens)` : ''}`);
    }
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
    setTimeout(() => {
      lockedOrderIds.current.delete(orderId);
    }, 3000);
    fetchOrders();
  };

  const toggleVendorOnline = async (restaurantId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    isStatusLocked.current = true;
    setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, isOnline: newStatus } : r));
    const { error } = await supabase.from('restaurants').update({ is_online: newStatus }).eq('id', restaurantId);
    if (error) fetchRestaurants();
    setTimeout(() => {
      isStatusLocked.current = false;
    }, 3000);
  };

  const addToCart = (item: CartItem) => {
    const res = restaurants.find(r => r.id === item.restaurantId);
    if (res && res.isOnline === false) {
      alert("This kitchen is currently offline and cannot take new orders.");
      return;
    }
    setCart(prev => {
      // Create a unique key for the item based on all selected options
      const createItemKey = (i: CartItem) => {
        const variantsKey = i.selectedVariants 
          ? Object.entries(i.selectedVariants).sort().map(([k,v]) => `${k}:${v}`).join('|')
          : '';
        return `${i.id}-${i.selectedSize || ''}-${i.selectedTemp || ''}-${i.selectedOtherVariant || ''}-${variantsKey}`;
      };

      const newItemKey = createItemKey(item);
      const existingIndex = prev.findIndex(i => createItemKey(i) === newItemKey);

      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += 1;
        return newCart;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string, itemIdx?: number) => {
    setCart(prev => {
        // If we pass an index (best for duplicate items with different options), remove specific
        // But for simplicity in this app structure, we might just filter or decrement based on ID logic.
        // Given the Cart UI iteration, let's find the item object directly if possible or loop.
        // The current UI passes item.id which isn't unique enough for variants.
        // We will improve this by decrementing the exact match if we had the full object, 
        // but here we likely need to handle it carefully.
        
        // However, the CustomerView passes ID. Let's assume for now unique IDs in cart would be better
        // but to keep it simple: We need to match the item instance.
        // Since `removeFromCart` in CustomerView maps over `cart` array, let's just use the index if possible.
        // BUT, `removeFromCart` signature is (itemId: string). 
        
        // NOTE: Standard practice would be to generate a unique cartId. 
        // For now, let's match the first instance of that ID if we don't have better tracking,
        // OR better, update CustomerView to pass the whole item or a unique key.
        
        // Actually, let's just find the first item with that ID for now (legacy behavior) 
        // OR if the caller sends the object in `CustomerView` we could match it.
        
        // To support the existing `removeFromCart(item.id)` call from CustomerView without breaking changes:
        // We will try to find *one* instance. Ideally CustomerView should pass the unique combination.
        // Let's assume the user is clicking "-" on a specific rendered row.
        
        // We'll update CustomerView to handle cart mutations better locally or pass index.
        return prev; // Placeholder, see CustomerView for actual implementation which likely needs to pass index or unique obj
    });
  };

  // Re-implementing a robust removeFromCart that accepts an item to match
  const removeSpecificItemFromCart = (itemToRemove: CartItem) => {
    setCart(prev => {
      const createItemKey = (i: CartItem) => {
        const variantsKey = i.selectedVariants 
          ? Object.entries(i.selectedVariants).sort().map(([k,v]) => `${k}:${v}`).join('|')
          : '';
        return `${i.id}-${i.selectedSize || ''}-${i.selectedTemp || ''}-${i.selectedOtherVariant || ''}-${variantsKey}`;
      };
      
      const targetKey = createItemKey(itemToRemove);
      const idx = prev.findIndex(i => createItemKey(i) === targetKey);
      
      if (idx > -1) {
        const newCart = [...prev];
        if (newCart[idx].quantity > 1) {
          newCart[idx].quantity -= 1;
        } else {
          newCart.splice(idx, 1);
        }
        return newCart;
      }
      return prev;
    });
  };

  const addSpecificItemToCart = (itemToAdd: CartItem) => {
     addToCart(itemToAdd);
  };

  const handleAddVendor = async (newUser: User, newRestaurant: Restaurant) => {
    const { data: userData, error: userError } = await supabase.from('users').insert([{
      username: newUser.username, password: newUser.password, role: 'VENDOR', email: newUser.email, phone: newUser.phone, is_active: true
    }]).select();
    if (!userError && userData?.[0]) {
      const uid = userData[0].id;
      const { data: resData, error: resError } = await supabase.from('restaurants').insert([{
        name: newRestaurant.name, logo: newRestaurant.logo, vendor_id: uid, location_name: newRestaurant.location, is_online: true
      }]).select();
      if (!resError && resData?.[0]) await supabase.from('users').update({ restaurant_id: resData[0].id }).eq('id', uid);
      await Promise.all([fetchUsers(), fetchRestaurants()]);
    }
  };

  const handleUpdateVendor = async (u: User, r: Restaurant) => {
    await supabase.from('users').update({ username: u.username, email: u.email, phone: u.phone, is_active: u.isActive, password: u.password }).eq('id', u.id);
    await supabase.from('restaurants').update({ name: r.name, logo: r.logo, location_name: r.location }).eq('id', r.id);
    await Promise.all([fetchUsers(), fetchRestaurants()]);
  };

  const handleAddLocation = async (a: Area) => {
    await supabase.from('areas').insert([{ name: a.name, city: a.city, state: a.state, code: a.code, is_active: a.isActive, type: a.type }]);
    fetchLocations();
  };

  const handleUpdateLocation = async (a: Area) => {
    await supabase.from('areas').update({ name: a.name, city: a.city, state: a.state, code: a.code, is_active: a.isActive, type: a.type }).eq('id', a.id);
    await Promise.all([fetchLocations(), fetchRestaurants()]);
  };

  const handleDeleteLocation = async (id: string) => {
    await supabase.from('areas').delete().eq('id', id);
    fetchLocations();
  };

  const handleUpdateMenuItem = async (rid: string, item: MenuItem) => {
    const { error } = await supabase.from('menu_items').update({ 
      name: item.name, 
      description: item.description, 
      price: item.price, 
      image: item.image, 
      category: item.category, 
      is_archived: item.isArchived, 
      sizes: item.sizes, 
      temp_options: item.tempOptions,
      other_variant_name: item.otherVariantName,
      other_variants: item.otherVariants,
      other_variants_enabled: item.otherVariantsEnabled,
      variant_groups: item.variantGroups // Persist new variant groups
    }).eq('id', item.id);
    if (error) console.error("Error updating menu item:", error);
    fetchRestaurants();
  };

  const handleAddMenuItem = async (rid: string, item: MenuItem) => {
    const { error } = await supabase.from('menu_items').insert([{ 
      restaurant_id: rid, 
      name: item.name, 
      description: item.description, 
      price: item.price, 
      image: item.image, 
      category: item.category, 
      sizes: item.sizes, 
      temp_options: item.tempOptions,
      other_variant_name: item.otherVariantName,
      other_variants: item.otherVariants,
      other_variants_enabled: item.otherVariantsEnabled,
      variant_groups: item.variantGroups // Persist new variant groups
    }]);
    if (error) console.error("Error adding menu item:", error);
    fetchRestaurants();
  };

  const handleDeleteMenuItem = async (rid: string, mid: string) => {
    await supabase.from('menu_items').delete().eq('id', mid);
    fetchRestaurants();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]">Syncing Command Hub...</p>
      </div>
    );
  }

  if (view === 'LANDING') {
    return <LandingPage onScan={handleScanSimulation} onLoginClick={() => setView('LOGIN')} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} locations={locations.filter(l => l.isActive !== false)} />;
  }

  if (view === 'LOGIN') {
    return <LoginPage allUsers={allUsers} onLogin={handleLogin} onBack={() => setView('LANDING')} />;
  }

  const activeVendorRes = currentUser?.role === 'VENDOR' ? restaurants.find(r => r.id === currentUser.restaurantId) : null;
  const currentArea = locations.find(l => l.name === sessionLocation);

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
        {currentRole === 'CUSTOMER' && <CustomerView restaurants={restaurants.filter(r => r.location === sessionLocation && r.isOnline === true)} cart={cart} orders={orders} onAddToCart={addSpecificItemToCart} onRemoveFromCart={removeSpecificItemFromCart} onPlaceOrder={placeOrder} locationName={sessionLocation || undefined} tableNo={sessionTable || undefined} areaType={currentArea?.type || 'MULTI'} allRestaurants={restaurants} />}
        {currentRole === 'VENDOR' && activeVendorRes && <VendorView restaurant={activeVendorRes} orders={orders.filter(o => o.restaurantId === currentUser?.restaurantId)} onUpdateOrder={updateOrderStatus} onUpdateMenu={handleUpdateMenuItem} onAddMenuItem={handleAddMenuItem} onPermanentDeleteMenuItem={handleDeleteMenuItem} onToggleOnline={() => toggleVendorOnline(activeVendorRes.id, activeVendorRes.isOnline ?? true)} lastSyncTime={lastSyncTime} />}
        {currentRole === 'ADMIN' && <AdminView vendors={allUsers.filter(u => u.role === 'VENDOR')} restaurants={restaurants} orders={orders} locations={locations} onAddVendor={handleAddVendor} onUpdateVendor={handleUpdateVendor} onImpersonateVendor={handleLogin} onAddLocation={handleAddLocation} onUpdateLocation={handleUpdateLocation} onDeleteLocation={handleDeleteLocation} onRemoveVendorFromHub={(rid) => supabase.from('restaurants').update({ location_name: null }).eq('id', rid).then(() => fetchRestaurants())} />}
      </main>
    </div>
  );
};

export default App;
