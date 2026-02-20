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
  
  // --- TRACK LAST KNOWN STATES ---
  const lastOrderTimestamp = useRef<number>(Date.now());
  const lastRestaurantUpdate = useRef<string>('');
  const processedOrderIds = useRef<Set<string>>(new Set());
  const pendingStatusUpdates = useRef<Map<string, OrderStatus>>(new Map());
  const initialLoadDone = useRef<boolean>(false);
  
  // --- TRANSACTION LOCKS ---
  const lockedOrderIds = useRef<Set<string>>(new Set());
  const isStatusLocked = useRef<boolean>(false);
  const isFetchingRef = useRef(false);
  const isFetchingRestaurantsRef = useRef(false);
  
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

  const fetchUsers = useCallback(async (force = false) => {
    if (!force && allUsers.length > 0) return allUsers;
    
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) {
      const mapped = data.map(u => ({
        id: u.id, username: u.username, role: u.role as Role,
        restaurantId: u.restaurant_id, password: u.password,
        isActive: u.is_active, email: u.email, phone: u.phone
      }));
      setAllUsers(mapped);
      persistCache('qs_cache_users', mapped);
      return mapped;
    }
    return allUsers;
  }, [allUsers]);

  const fetchLocations = useCallback(async (force = false) => {
    if (!force && locations.length > 0) return locations;
    
    const { data, error } = await supabase.from('areas').select('*').order('name');
    if (!error && data) {
      const mapped = data.map(l => ({
        id: l.id, name: l.name, city: l.city, state: l.state, code: l.code, isActive: l.is_active ?? true, type: l.type as 'MULTI' | 'SINGLE'
      }));
      setLocations(mapped);
      persistCache('qs_cache_locations', mapped);
      return mapped;
    }
    return locations;
  }, [locations]);

  const fetchRestaurants = useCallback(async (force = false) => {
    if (isFetchingRestaurantsRef.current) return;
    if (isStatusLocked.current && !force) return;
    
    isFetchingRestaurantsRef.current = true;
    
    try {
      const { data: resData, error: resError } = await supabase.from('restaurants').select('*');
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
    } finally {
      isFetchingRestaurantsRef.current = false;
    }
  }, []);

  // Load historical orders for vendors/admins
  const loadHistoricalOrders = useCallback(async () => {
    if (!currentUser) return;
    
    let query = supabase
      .from('orders')
      .select('*')
      .order('timestamp', { ascending: false });

    if (currentUser.role === 'VENDOR' && currentUser.restaurantId) {
      query = query.eq('restaurant_id', currentUser.restaurantId);
    }

    const { data, error } = await query.limit(50);

    if (!error && data) {
      const mappedOrders = data.map(o => ({
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
      }));

      setOrders(mappedOrders);
      
      if (mappedOrders.length > 0) {
        const maxTimestamp = Math.max(...mappedOrders.map(o => o.timestamp));
        lastOrderTimestamp.current = maxTimestamp;
        mappedOrders.forEach(o => processedOrderIds.current.add(o.id));
      }
      
      persistCache('qs_cache_orders', mappedOrders);
    }
  }, [currentUser]);

  // CRITICAL FIX: Always fetch latest orders, not just new ones
  const fetchLatestOrders = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (!currentUser) return;
    
    isFetchingRef.current = true;

    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('timestamp', { ascending: false });

      if (currentUser.role === 'VENDOR' && currentUser.restaurantId) {
        query = query.eq('restaurant_id', currentUser.restaurantId);
      }

      const { data, error } = await query.limit(50);

      if (!error && data) {
        // Update last timestamp for future incremental fetches
        if (data.length > 0) {
          const newestTimestamp = Math.max(...data.map(o => parseTimestamp(o.timestamp)));
          lastOrderTimestamp.current = Math.max(lastOrderTimestamp.current, newestTimestamp);
        }

        setOrders(prev => {
          const existingOrders = new Map(prev.map(o => [o.id, o]));
          
          data.forEach(o => {
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

            // Apply any pending status updates
            const pendingStatus = pendingStatusUpdates.current.get(o.id);
            if (pendingStatus) {
              mappedOrder.status = pendingStatus;
            }
            
            existingOrders.set(o.id, mappedOrder);
          });

          const updatedOrders = Array.from(existingOrders.values());
          persistCache('qs_cache_orders', updatedOrders);
          return updatedOrders;
        });
      }
    } catch (e) {
      console.error("Fetch orders failed", e);
    } finally {
      isFetchingRef.current = false;
    }
  }, [currentUser]);

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

  // Initialize app
  useEffect(() => {
    const initApp = async () => {
      if (initialLoadDone.current) return;
      
      setIsLoading(true);
      
      // Load essential data
      await Promise.allSettled([
        fetchUsers(),
        fetchLocations(),
        fetchRestaurants(true)
      ]);
      
      // Load orders based on user role
      if (currentUser) {
        await loadHistoricalOrders();
        lastOrderTimestamp.current = Date.now();
      }
      
      initialLoadDone.current = true;
      setIsLoading(false);
    };
    
    initApp();
  }, [currentUser]);

  // CRITICAL FIX: Set up aggressive polling for vendors
  useEffect(() => {
    if (!currentUser || !initialLoadDone.current) return;

    let interval: NodeJS.Timeout;
    
    // More frequent polling for vendors
    if (currentUser.role === 'VENDOR') {
      // Poll every 2 seconds to ensure vendors see orders quickly
      interval = setInterval(() => {
        fetchLatestOrders();
      }, 2000);
    } else if (currentUser.role === 'ADMIN') {
      interval = setInterval(() => {
        fetchLatestOrders();
        fetchRestaurants();
      }, 5000);
    } else if (currentUser.role === 'CUSTOMER') {
      interval = setInterval(fetchRestaurants, 30000);
    }

    return () => { 
      if (interval) clearInterval(interval); 
    };
  }, [currentUser, fetchLatestOrders, fetchRestaurants]);

  // CRITICAL FIX: Real-time subscriptions with immediate updates
  useEffect(() => {
    if (!currentUser) return;

    // Create a unique channel name to avoid conflicts
    const channel = supabase.channel(`orders-${currentUser.id}-${Date.now()}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders' 
        }, 
        (payload) => {
          console.log('New order received:', payload);
          
          // Check if this order is relevant to the current user
          const isRelevant = 
            currentUser.role === 'ADMIN' ||
            (currentUser.role === 'VENDOR' && payload.new.restaurant_id === currentUser.restaurantId);

          if (isRelevant) {
            // Fetch immediately to get the full order details
            fetchLatestOrders();
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders' 
        }, 
        (payload) => {
          console.log('Order updated:', payload);
          
          // Check if this order is relevant
          const isRelevant = 
            currentUser.role === 'ADMIN' ||
            (currentUser.role === 'VENDOR' && payload.new.restaurant_id === currentUser.restaurantId);

          if (isRelevant) {
            // Update the specific order immediately
            setOrders(prev => prev.map(o => 
              o.id === payload.new.id 
                ? { 
                    ...o, 
                    status: payload.new.status as OrderStatus,
                    rejectionReason: payload.new.rejection_reason,
                    rejectionNote: payload.new.rejection_note
                  } 
                : o
            ));
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'restaurants' 
        }, 
        () => {
          if (currentUser.role !== 'CUSTOMER') {
            fetchRestaurants();
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [currentUser, fetchLatestOrders, fetchRestaurants]);

  // Dark mode effect
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
        id: finalOrderId, 
        items: itemsForThisRestaurant, 
        total: totalForThisRestaurant,
        status: OrderStatus.PENDING, 
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
      // Immediately fetch latest orders to show the new one
      fetchLatestOrders();
      alert(`Your order(s) have been placed! Reference: ${baseOrderId}`); 
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user); 
    setCurrentRole(user.role); 
    setView('APP');
    localStorage.setItem('qs_user', JSON.stringify(user));
    localStorage.setItem('qs_role', user.role);
    localStorage.setItem('qs_view', 'APP');
    
    // Reset tracking
    processedOrderIds.current.clear();
    pendingStatusUpdates.current.clear();
    initialLoadDone.current = false; // Force reload on login
  };

  const handleLogout = () => {
    setCurrentUser(null); 
    setCurrentRole(null); 
    setSessionLocation(null);
    setSessionTable(null); 
    setView('LANDING'); 
    localStorage.clear();
    
    // Reset all tracking
    lastOrderTimestamp.current = Date.now();
    processedOrderIds.current.clear();
    pendingStatusUpdates.current.clear();
    initialLoadDone.current = false;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, reason?: string, note?: string) => {
    lockedOrderIds.current.add(orderId);
    pendingStatusUpdates.current.set(orderId, status);
    
    // Optimistic update
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status, rejectionReason: reason, rejectionNote: note } : o
    ));
    
    // Update in database
    const { error } = await supabase
      .from('orders')
      .update({ 
        status, 
        rejection_reason: reason, 
        rejection_note: note 
      })
      .eq('id', orderId);
    
    if (error) {
      // Revert on error
      pendingStatusUpdates.current.delete(orderId);
      fetchLatestOrders();
    }
    
    setTimeout(() => {
      lockedOrderIds.current.delete(orderId);
      pendingStatusUpdates.current.delete(orderId);
    }, 3000);
  };

  const toggleVendorOnline = async (restaurantId: string, currentStatus: boolean) => {
    const res = restaurants.find(r => r.id === restaurantId);
    const vendor = allUsers.find(u => u.restaurantId === restaurantId);
    
    if (!currentStatus && vendor && vendor.isActive === false) {
      alert("Cannot turn online: Master Activation is disabled for this vendor.");
      return;
    }

    const newStatus = !currentStatus;
    isStatusLocked.current = true;
    setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, isOnline: newStatus } : r));
    
    const { error } = await supabase.from('restaurants').update({ is_online: newStatus }).eq('id', restaurantId);
    
    if (error) fetchRestaurants(true);
    setTimeout(() => isStatusLocked.current = false, 3000);
  };

  const addToCart = (item: CartItem) => {
    const res = restaurants.find(r => r.id === item.restaurantId);
    if (res && res.isOnline === false) { 
      alert("This kitchen is currently offline."); 
      return; 
    }
    
    setCart(prev => {
      const existing = prev.find(i => 
        i.id === item.id && 
        i.selectedSize === item.selectedSize && 
        i.selectedTemp === item.selectedTemp && 
        i.selectedOtherVariant === item.selectedOtherVariant
      );
      
      if (existing) {
        return prev.map(i => 
          (i.id === item.id && 
           i.selectedSize === item.selectedSize && 
           i.selectedTemp === item.selectedTemp && 
           i.selectedOtherVariant === item.selectedOtherVariant) 
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  // Menu item handlers
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
    else fetchRestaurants(true);
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
    else fetchRestaurants(true);
  };

  const handleDeleteMenuItem = async (restaurantId: string, itemId: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (!error) fetchRestaurants(true);
  };

  // Vendor & Hub handlers
  const handleAddVendor = async (user: User, restaurant: Restaurant) => {
    const userId = crypto.randomUUID();
    const resId = crypto.randomUUID();
    
    const { error: userError } = await supabase.from('users').insert({
      id: userId, 
      username: user.username, 
      password: user.password, 
      role: 'VENDOR',
      restaurant_id: resId, 
      is_active: true, 
      email: user.email, 
      phone: user.phone
    });
    
    if (userError) { 
      alert("Error adding user: " + userError.message); 
      return; 
    }
    
    const { error: resError } = await supabase.from('restaurants').insert({
      id: resId, 
      name: restaurant.name, 
      logo: restaurant.logo, 
      vendor_id: userId,
      location_name: restaurant.location, 
      is_online: true
    });
    
    if (resError) alert("Error adding restaurant: " + resError.message);
    fetchUsers(true); 
    fetchRestaurants(true);
  };

  const handleUpdateVendor = async (user: User, restaurant: Restaurant) => {
    const { error: userError } = await supabase.from('users').update({
      username: user.username, 
      password: user.password, 
      email: user.email, 
      phone: user.phone, 
      is_active: user.isActive
    }).eq('id', user.id);
    
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
    fetchUsers(true); 
    fetchRestaurants(true);
  };

  const handleAddLocation = async (area: Area) => {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('areas').insert({
      id, 
      name: area.name, 
      city: area.city, 
      state: area.state, 
      code: area.code, 
      is_active: true, 
      type: area.type || 'MULTI'
    });
    
    if (!error) fetchLocations(true);
  };

  const handleUpdateLocation = async (area: Area) => {
    const { error } = await supabase.from('areas').update({
      name: area.name, 
      city: area.city, 
      state: area.state, 
      code: area.code, 
      is_active: area.isActive, 
      type: area.type
    }).eq('id', area.id);
    
    if (!error) fetchLocations(true);
  };

  const handleDeleteLocation = async (areaId: string) => {
    const { error } = await supabase.from('areas').delete().eq('id', areaId);
    if (!error) fetchLocations(true);
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
    return <LandingPage 
      onScan={handleScanSimulation} 
      onLoginClick={() => setView('LOGIN')} 
      isDarkMode={isDarkMode} 
      onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
      locations={locations.filter(l => l.isActive !== false)} 
    />;
  }

  if (view === 'LOGIN') {
    return <LoginPage 
      allUsers={allUsers} 
      onLogin={handleLogin} 
      onBack={() => setView('LANDING')} 
    />;
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
              <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">
        {currentRole === 'CUSTOMER' && (
          <CustomerView 
            restaurants={restaurants.filter(r => r.location === sessionLocation && r.isOnline === true)} 
            cart={cart} 
            orders={orders.filter(o => o.locationName === sessionLocation && o.tableNumber === sessionTable)} 
            onAddToCart={addToCart} 
            onRemoveFromCart={removeFromCart} 
            onPlaceOrder={placeOrder} 
            locationName={sessionLocation || undefined} 
            tableNo={sessionTable || undefined} 
            areaType={currentArea?.type || 'MULTI'} 
            allRestaurants={restaurants} 
          />
        )}
        
        {currentRole === 'VENDOR' && activeVendorRes && (
          <VendorView 
            restaurant={activeVendorRes} 
            orders={orders.filter(o => o.restaurantId === currentUser?.restaurantId)} 
            onUpdateOrder={updateOrderStatus} 
            onUpdateMenu={handleUpdateMenuItem} 
            onAddMenuItem={handleAddMenuItem} 
            onPermanentDeleteMenuItem={handleDeleteMenuItem} 
            onToggleOnline={() => toggleVendorOnline(activeVendorRes.id, activeVendorRes.isOnline ?? true)} 
            lastSyncTime={lastSyncTime} 
          />
        )}
        
        {currentRole === 'ADMIN' && (
          <AdminView 
            vendors={allUsers.filter(u => u.role === 'VENDOR')} 
            restaurants={restaurants} 
            orders={orders} 
            locations={locations} 
            onAddVendor={handleAddVendor} 
            onUpdateVendor={handleUpdateVendor} 
            onImpersonateVendor={handleLogin} 
            onAddLocation={handleAddLocation} 
            onUpdateLocation={handleUpdateLocation} 
            onDeleteLocation={handleDeleteLocation} 
            onToggleOnline={toggleVendorOnline} 
            onRemoveVendorFromHub={(rid) => supabase.from('restaurants').update({ location_name: null }).eq('id', rid).then(() => fetchRestaurants(true))} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
