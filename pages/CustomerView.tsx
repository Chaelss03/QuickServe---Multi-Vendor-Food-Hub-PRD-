
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Restaurant, CartItem, Order, OrderStatus, MenuItem } from '../types';
import { ShoppingCart, Plus, Minus, X, CheckCircle, ChevronRight, Info, ThermometerSun, Maximize2, MapPin, Hash, LayoutGrid, Grid3X3, MessageSquare, AlertTriangle, UtensilsCrossed, LogIn, WifiOff, Layers, Search, Store } from 'lucide-react';

interface Props {
  restaurants: Restaurant[];
  cart: CartItem[];
  orders: Order[];
  onAddToCart: (item: CartItem) => void;
  onRemoveFromCart: (itemId: string) => void;
  onPlaceOrder: (remark: string) => void;
  locationName?: string;
  tableNo?: string;
  onLoginClick?: () => void;
  areaType?: 'MULTI' | 'SINGLE';
  allRestaurants?: Restaurant[]; 
}

const CustomerView: React.FC<Props> = ({ restaurants, cart, orders, onAddToCart, onRemoveFromCart, onPlaceOrder, locationName, tableNo, onLoginClick, areaType = 'MULTI', allRestaurants = [] }) => {
  const [activeRestaurant, setActiveRestaurant] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<{item: MenuItem, resId: string} | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedTemp, setSelectedTemp] = useState<'Hot' | 'Cold' | undefined>(undefined);
  const [selectedOtherVariant, setSelectedOtherVariant] = useState<string>('');
  const [gridColumns, setGridColumns] = useState<2 | 3>(3);
  const [orderRemark, setOrderRemark] = useState('');
  const [dismissedOrders, setDismissedOrders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('qs_dismissed_orders');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const scrollToSection = (id: string) => {
    setActiveRestaurant(id);
    const element = sectionRefs.current[id];
    if (element) {
      const offset = 180; // Adjusted for new larger navbar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const offlineCartItems = useMemo(() => {
    return cart.filter(item => {
      const res = allRestaurants.find(r => r.id === item.restaurantId);
      return res && res.isOnline === false;
    });
  }, [cart, allRestaurants]);

  useEffect(() => {
    if (areaType === 'SINGLE') return;
    const handleScroll = () => {
      const scrollPos = window.scrollY + 220;
      for (const res of restaurants) {
        const el = sectionRefs.current[res.id];
        if (el && el.offsetTop <= scrollPos && el.offsetTop + el.offsetHeight > scrollPos) {
          setActiveRestaurant(res.id);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [restaurants, areaType]);

  useEffect(() => {
    if (restaurants.length > 0 && (!activeRestaurant || !restaurants.find(r => r.id === activeRestaurant))) {
      setActiveRestaurant(restaurants[0].id);
    }
  }, [restaurants, activeRestaurant]);

  const handleInitialAdd = (item: MenuItem, resId: string) => {
    if ((item.sizes && item.sizes.length > 0) || (item.tempOptions && item.tempOptions.enabled) || (item.otherVariantsEnabled && item.otherVariants && item.otherVariants.length > 0)) {
      setSelectedItemForVariants({ item, resId });
      setSelectedSize(item.sizes?.[0]?.name || '');
      setSelectedTemp(item.tempOptions?.enabled ? 'Hot' : undefined);
      setSelectedOtherVariant(item.otherVariantsEnabled ? (item.otherVariants?.[0]?.name || '') : '');
    } else {
      onAddToCart({ ...item, quantity: 1, restaurantId: resId });
    }
  };

  const confirmVariantAdd = () => {
    if (!selectedItemForVariants) return;
    const { item, resId } = selectedItemForVariants;
    
    let finalPrice = item.price;
    if (selectedSize) {
      const sizeObj = item.sizes?.find(s => s.name === selectedSize);
      if (sizeObj) finalPrice += sizeObj.price;
    }
    if (selectedTemp === 'Hot' && item.tempOptions?.hot) finalPrice += item.tempOptions.hot;
    if (selectedTemp === 'Cold' && item.tempOptions?.cold) finalPrice += item.tempOptions.cold;
    if (selectedOtherVariant) {
      const otherObj = item.otherVariants?.find(v => v.name === selectedOtherVariant);
      if (otherObj) finalPrice += otherObj.price;
    }

    onAddToCart({
      ...item,
      price: finalPrice,
      quantity: 1,
      restaurantId: resId,
      selectedSize,
      selectedTemp,
      selectedOtherVariant
    });
    setSelectedItemForVariants(null);
  };

  const handleDismissOrder = (orderId: string) => {
    const updatedDismissed = [...dismissedOrders, orderId];
    setDismissedOrders(updatedDismissed);
    localStorage.setItem('qs_dismissed_orders', JSON.stringify(updatedDismissed));
  };

  const activeOrders = useMemo(() => {
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    return orders.filter(o => {
      const isCurrentLocation = o.locationName === locationName && o.tableNumber === tableNo;
      if (!isCurrentLocation) return false;
      const isDismissed = dismissedOrders.includes(o.id);
      if (isDismissed) return false;
      if (o.status === OrderStatus.COMPLETED) return false;
      if (o.status === OrderStatus.CANCELLED) return o.timestamp > thirtyMinutesAgo;
      return true;
    });
  }, [orders, locationName, tableNo, dismissedOrders]);

  const filteredRestaurants = useMemo(() => {
    if (!searchQuery) return restaurants;
    return restaurants.map(res => ({
      ...res,
      menu: res.menu.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(res => res.menu.length > 0);
  }, [restaurants, searchQuery]);

  return (
    <div className="relative min-h-screen pb-32 bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Enhanced Restaurant NavBar */}
      <div className="sticky top-16 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b dark:border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto">
          {/* NavBar Header - Stores & Search */}
          <div className="px-4 pt-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-hidden">
               <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm shadow-orange-200">
                  <Store size={14} />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 leading-none">Restaurant</span>
                  <span className="text-xs font-black dark:text-white uppercase leading-none mt-0.5 truncate">{locationName}</span>
               </div>
            </div>

            <div className="flex-1 max-w-xs relative">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="Search menu..." 
                 className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-[10px] font-bold dark:text-white outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
          </div>

          {/* NavBar Tab List */}
          {areaType !== 'SINGLE' && (
            <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto hide-scrollbar">
              {restaurants.map(res => (
                <button
                  key={res.id}
                  onClick={() => scrollToSection(res.id)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl transition-all shrink-0 border-2 ${
                    activeRestaurant === res.id 
                      ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900 shadow-md scale-105' 
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-orange-100 dark:hover:border-orange-900/30'
                  }`}
                >
                  <img src={res.logo} className="w-5 h-5 rounded-lg object-cover" />
                  <span className="text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">{res.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Table & View Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-900/10">
             <Hash size={16} className="text-orange-500" />
             <span className="text-xs font-black text-orange-800 dark:text-orange-300 uppercase">Table {tableNo || 'N/A'}</span>
          </div>
          
          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border dark:border-gray-700 shadow-sm">
             <button onClick={() => setGridColumns(3)} className={`p-2 rounded-lg transition-all ${gridColumns === 3 ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}><LayoutGrid size={16} /></button>
             <button onClick={() => setGridColumns(2)} className={`p-2 rounded-lg transition-all ${gridColumns === 2 ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}><Grid3X3 size={16} /></button>
          </div>
        </div>

        {/* Notifications */}
        {activeOrders.length > 0 && (
          <div className="mb-8 space-y-3">
            {activeOrders.map(order => (
              <div key={order.id} className={`relative p-4 rounded-3xl border shadow-sm flex flex-col gap-2 ${
                order.status === OrderStatus.CANCELLED ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
              } dark:bg-gray-800 dark:border-gray-700 animate-in slide-in-from-top-4 duration-500`}>
                <button onClick={() => handleDismissOrder(order.id)} className="absolute top-3 right-3 text-gray-400"><X size={16} /></button>
                <div className="flex items-center gap-2">
                   <div className={`w-2.5 h-2.5 rounded-full ${order.status === OrderStatus.CANCELLED ? 'bg-red-500' : 'bg-orange-500 animate-pulse'}`}></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
                     {order.status === OrderStatus.CANCELLED ? 'Order Refused' : 'Preparing Order'} #{order.id}
                   </span>
                </div>
                {order.status === OrderStatus.CANCELLED && (
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 ml-4.5">{order.rejectionReason}: {order.rejectionNote}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Menu Display */}
        <div className="space-y-16">
          {filteredRestaurants.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
               <Search size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
               <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No matching dishes found</p>
               <button onClick={() => setSearchQuery('')} className="mt-4 text-xs font-bold text-orange-500 uppercase">Clear Search</button>
            </div>
          ) : (
            filteredRestaurants.map(res => (
              <section 
                key={res.id} 
                id={res.id} 
                ref={el => { sectionRefs.current[res.id] = el; }}
                className="scroll-mt-56"
              >
                <div className="flex items-center gap-4 mb-6 sticky top-[164px] z-30 py-2 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
                   <img src={res.logo} className="w-10 h-10 rounded-2xl border dark:border-gray-800 shadow-sm" />
                   <h2 className="text-lg font-black dark:text-white uppercase tracking-tighter">{res.name}</h2>
                   <div className="h-0.5 flex-1 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                </div>

                <div className={`grid gap-4 md:gap-8 ${gridColumns === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
                  {res.menu.map(item => (
                    <div key={item.id} className="group bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-2xl transition-all duration-500 flex flex-col">
                       <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-900">
                          <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                          <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-xl text-[8px] font-black text-white uppercase tracking-widest">{item.category}</div>
                       </div>
                       <div className="p-5 flex-1 flex flex-col">
                          <h4 className="text-sm md:text-lg font-black dark:text-white mb-1 uppercase tracking-tight">{item.name}</h4>
                          <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">{item.description}</p>
                          <div className="mt-auto flex items-center justify-between gap-4">
                             <span className="text-lg md:text-xl font-black text-orange-500">RM{item.price.toFixed(2)}</span>
                             <button 
                               onClick={() => handleInitialAdd(item, res.id)}
                               className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition-all active:scale-95 shadow-lg shadow-gray-100 dark:shadow-none"
                             >
                               + Add
                             </button>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {/* Variant & Cart remains same... */}
      {selectedItemForVariants && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in fade-in duration-300">
            <div className="relative h-48">
              <img src={selectedItemForVariants.item.image} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <button onClick={() => setSelectedItemForVariants(null)} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-colors">
                <X size={20} />
              </button>
              <div className="absolute bottom-6 left-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedItemForVariants.item.name}</h3>
                <p className="text-[10px] text-orange-300 font-bold uppercase tracking-[0.3em]">{selectedItemForVariants.item.category}</p>
              </div>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-8">
                {selectedItemForVariants.item.sizes && selectedItemForVariants.item.sizes.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Choose Portion</label>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedItemForVariants.item.sizes.map(size => (
                        <button key={size.name} onClick={() => setSelectedSize(size.name)} className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedSize === size.name ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'border-gray-50 dark:border-gray-700 text-gray-500'}`}>
                          <p className="text-[10px] font-black uppercase mb-1">{size.name}</p>
                          <p className="font-black text-sm">+{size.price > 0 ? `RM${size.price.toFixed(2)}` : 'FREE'}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedItemForVariants.item.otherVariantsEnabled && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">{selectedItemForVariants.item.otherVariantName || "Options"}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setSelectedOtherVariant('')} className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedOtherVariant === '' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-50 dark:border-gray-700 text-gray-500'}`}><p className="text-[10px] font-black uppercase">Standard</p></button>
                      {selectedItemForVariants.item.otherVariants?.map(v => (
                        <button key={v.name} onClick={() => setSelectedOtherVariant(v.name)} className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedOtherVariant === v.name ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-50 dark:border-gray-700 text-gray-500'}`}>
                          <p className="text-[10px] font-black uppercase mb-1">{v.name}</p>
                          <p className="font-black text-sm">+RM{v.price.toFixed(2)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
            <div className="p-8 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <button onClick={confirmVariantAdd} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Add to Tray</button>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[60]">
          <button onClick={() => setShowCart(true)} className={`w-full py-4 px-6 rounded-3xl shadow-2xl flex items-center justify-between transition-all border-4 ${offlineCartItems.length > 0 ? 'bg-red-600 border-white' : 'bg-black dark:bg-white text-white dark:text-gray-900 border-white dark:border-gray-900'}`}>
            <div className="flex items-center gap-4">
               <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm">{cart.reduce((a, b) => a + b.quantity, 0)}</div>
               <span className="font-black text-xs uppercase tracking-widest">Open Tray</span>
            </div>
            <span className="font-black text-xl">RM{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 h-full flex flex-col animate-in slide-in-from-right-full duration-300">
             <div className="p-6 border-b dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">Your Tray</h2>
                <button onClick={() => setShowCart(false)} className="p-2 text-gray-400"><X size={28} /></button>
             </div>
             <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border dark:border-gray-800">
                    <img src={item.image} className="w-16 h-16 rounded-xl object-cover" />
                    <div className="flex-1">
                       <p className="font-black text-sm uppercase dark:text-white">{item.name}</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase">{item.selectedSize} {item.selectedTemp}</p>
                       <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => onRemoveFromCart(item.id)} className="p-1 text-red-500 border dark:border-gray-700 rounded-lg"><Minus size={14} /></button>
                          <span className="font-black text-xs dark:text-white">{item.quantity}</span>
                          <button onClick={() => onAddToCart(item)} className="p-1 text-green-500 border dark:border-gray-700 rounded-lg"><Plus size={14} /></button>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-orange-500">RM{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
             </div>
             <div className="p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <textarea 
                  placeholder="Kitchen Note (e.g. No onions)" 
                  className="w-full p-4 bg-white dark:bg-gray-800 border-none rounded-2xl text-xs font-bold dark:text-white mb-6 outline-none focus:ring-1 focus:ring-orange-500" 
                  rows={2} 
                  value={orderRemark}
                  onChange={(e) => setOrderRemark(e.target.value)}
                />
                <button onClick={() => { onPlaceOrder(orderRemark); setShowCart(false); }} className="w-full py-5 bg-orange-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-orange-100 dark:shadow-none">Checkout Now</button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default CustomerView;
