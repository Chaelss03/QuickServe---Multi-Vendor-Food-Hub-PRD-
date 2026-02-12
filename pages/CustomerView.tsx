
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Restaurant, CartItem, Order, OrderStatus, MenuItem } from '../types';
import { ShoppingCart, Plus, Minus, X, CheckCircle, ChevronRight, Info, ThermometerSun, Maximize2, MapPin, Hash, LayoutGrid, Grid3X3, MessageSquare, AlertTriangle, UtensilsCrossed, LogIn, WifiOff } from 'lucide-react';

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
  allRestaurants?: Restaurant[]; // For cart offline validation
}

const CustomerView: React.FC<Props> = ({ restaurants, cart, orders, onAddToCart, onRemoveFromCart, onPlaceOrder, locationName, tableNo, onLoginClick, areaType = 'MULTI', allRestaurants = [] }) => {
  const [activeRestaurant, setActiveRestaurant] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<{item: MenuItem, resId: string} | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedTemp, setSelectedTemp] = useState<'Hot' | 'Cold' | undefined>(undefined);
  const [gridColumns, setGridColumns] = useState<2 | 3>(3);
  const [orderRemark, setOrderRemark] = useState('');
  const [dismissedOrders, setDismissedOrders] = useState<string[]>([]);
  
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const scrollToSection = (id: string) => {
    setActiveRestaurant(id);
    const element = sectionRefs.current[id];
    if (element) {
      const offset = 140; // Adjust for sticky header + nav height
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

  // Check for any cart items from restaurants that are now offline
  const offlineCartItems = useMemo(() => {
    return cart.filter(item => {
      const res = allRestaurants.find(r => r.id === item.restaurantId);
      return res && res.isOnline === false;
    });
  }, [cart, allRestaurants]);

  useEffect(() => {
    if (areaType === 'SINGLE') return;
    const handleScroll = () => {
      const scrollPos = window.scrollY + 180;
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
    if ((item.sizes && item.sizes.length > 0) || (item.tempOptions && item.tempOptions.enabled)) {
      setSelectedItemForVariants({ item, resId });
      setSelectedSize(item.sizes?.[0]?.name || '');
      setSelectedTemp(item.tempOptions?.enabled ? 'Hot' : undefined);
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

    onAddToCart({
      ...item,
      price: finalPrice,
      quantity: 1,
      restaurantId: resId,
      selectedSize,
      selectedTemp
    });
    setSelectedItemForVariants(null);
  };

  const toggleGrid = () => {
    setGridColumns(prev => (prev === 3 ? 2 : 3));
  };

  const handleDismissOrder = (orderId: string) => {
    setDismissedOrders(prev => [...prev, orderId]);
  };

  const activeOrders = orders.filter(o => o.status !== OrderStatus.COMPLETED && !dismissedOrders.includes(o.id));

  return (
    <div className="relative min-h-screen pb-28 bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Restaurant Navbar - Only shown for MULTI vendor hubs */}
      {areaType !== 'SINGLE' && (
        <div className="sticky top-16 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b dark:border-gray-700 shadow-md">
          <div className="px-4 py-2 border-b dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <UtensilsCrossed size={14} className="text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] dark:text-gray-300">Available Kitchens</span>
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase">{restaurants.length} Stores Online</span>
          </div>
          <nav className="overflow-x-auto hide-scrollbar flex items-center px-4 py-3 gap-3">
            {restaurants.map(res => (
              <button
                key={res.id}
                onClick={() => scrollToSection(res.id)}
                className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all duration-300 border-2 ${
                  activeRestaurant === res.id 
                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-100 dark:shadow-none scale-105' 
                    : 'bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-orange-200'
                }`}
              >
                <img src={res.logo} className="w-4 h-4 rounded-full object-cover" />
                {res.name}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-2 md:px-4 py-4">
        {/* Compact Location Info */}
        <div className="mb-4 px-3 py-2 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-orange-500 shrink-0" />
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Serving At</span>
               <h2 className="text-[11px] font-black dark:text-white leading-tight uppercase tracking-tight truncate">
                 {locationName || 'QuickServe Hub'}
               </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {tableNo && (
              <div className="flex items-center gap-1 px-3 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-black text-[10px] uppercase tracking-tighter">
                <Hash size={12} className="text-orange-500" />
                Table {tableNo}
              </div>
            )}
            
            <button 
              onClick={toggleGrid}
              className="p-2 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-300 rounded-lg hover:text-orange-500 transition-colors flex items-center gap-1.5 border dark:border-gray-600"
            >
              {gridColumns === 3 ? <LayoutGrid size={14} /> : <Grid3X3 size={14} />}
            </button>
          </div>
        </div>

        {/* Active/Cancelled Orders Ticker */}
        {activeOrders.length > 0 && (
          <div className="mb-6 space-y-2">
            {activeOrders.map(order => (
              <div key={order.id} className={`relative p-4 rounded-2xl border flex flex-col gap-2 transition-all shadow-sm ${
                order.status === OrderStatus.CANCELLED 
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' 
                  : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30'
              }`}>
                <button 
                  onClick={() => handleDismissOrder(order.id)}
                  className="absolute top-3 right-3 p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
                <div className="flex items-center justify-between pr-8">
                   <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${order.status === OrderStatus.CANCELLED ? 'bg-red-500' : 'bg-orange-500 animate-pulse'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${order.status === OrderStatus.CANCELLED ? 'text-red-700 dark:text-red-400' : 'text-orange-800 dark:text-orange-200'}`}>
                        {order.status === OrderStatus.CANCELLED ? `Rejected: ${order.id}` : `Preparing Your Meal: ${order.id}`}
                      </span>
                   </div>
                </div>
                {order.status === OrderStatus.CANCELLED && (
                  <div className="pl-4 border-l-2 border-red-200 dark:border-red-800">
                    <p className="text-[10px] font-bold text-red-800 dark:text-red-300">
                      {order.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Menu Sections */}
        <div className="space-y-12">
          {restaurants.map(res => (
            <section 
              key={res.id} 
              id={res.id} 
              ref={el => { sectionRefs.current[res.id] = el; }}
              className={areaType === 'SINGLE' ? "mt-4" : "scroll-mt-48"}
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border dark:border-gray-700 shadow-sm">
                    <img src={res.logo} alt={res.name} className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white leading-tight tracking-tight uppercase">{res.name}</h2>
                </div>
              </div>

              <div className={`grid gap-3 md:gap-6 ${gridColumns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {res.menu.map(item => (
                  <div key={item.id} className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg text-[8px] font-black text-white shadow-sm uppercase tracking-widest">
                        {item.category}
                      </div>
                    </div>
                    <div className="p-2 md:p-4 flex-1 flex flex-col">
                      <div className="mb-2">
                        <h4 className={`font-black text-gray-900 dark:text-white leading-tight line-clamp-1 mb-1 ${gridColumns === 3 ? 'text-[10px] md:text-sm' : 'text-xs md:text-base'}`}>{item.name}</h4>
                        <p className="font-black text-orange-500 text-xs md:text-lg">RM{item.price.toFixed(2)}</p>
                      </div>
                      
                      <button 
                        onClick={() => handleInitialAdd(item, res.id)}
                        className={`mt-auto w-full py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-black uppercase tracking-tighter hover:bg-orange-500 dark:hover:bg-orange-500 hover:text-white transition-all active:scale-95 shadow-sm text-[9px] md:text-xs`}
                      >
                        Add to Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Empty State */}
        {restaurants.length === 0 && (
          <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700">
            <UtensilsCrossed size={48} className="mx-auto mb-4 text-gray-200" />
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">No Active Kitchens</h3>
            <p className="text-gray-400 text-xs mt-2">Check back later or try another location.</p>
          </div>
        )}

        <div className="mt-16 text-center pb-8 border-t dark:border-gray-800 pt-8 flex flex-col items-center gap-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">© QuickServe Platform</p>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {selectedItemForVariants && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in fade-in duration-300">
            <div className="relative h-48">
              <img src={selectedItemForVariants.item.image} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <button 
                onClick={() => setSelectedItemForVariants(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="absolute bottom-6 left-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedItemForVariants.item.name}</h3>
                <p className="text-[10px] text-orange-300 font-bold uppercase tracking-[0.3em]">{selectedItemForVariants.item.category}</p>
              </div>
            </div>
            
            <div className="p-8">
              <div className="space-y-6">
                {selectedItemForVariants.item.sizes && selectedItemForVariants.item.sizes.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-1">Choose Portion</label>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedItemForVariants.item.sizes.map(size => (
                        <button
                          key={size.name}
                          onClick={() => setSelectedSize(size.name)}
                          className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 ${
                            selectedSize === size.name 
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 shadow-lg shadow-orange-100 dark:shadow-none' 
                              : 'border-gray-50 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-orange-200'
                          }`}
                        >
                          <p className="text-[10px] font-black uppercase tracking-tighter mb-1">{size.name}</p>
                          <p className="font-black text-sm">+{size.price > 0 ? `RM${size.price.toFixed(2)}` : 'FREE'}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItemForVariants.item.tempOptions?.enabled && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-1">Temperature</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedTemp('Hot')}
                        className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-300 ${
                          selectedTemp === 'Hot' 
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 shadow-lg' 
                            : 'border-gray-50 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <ThermometerSun size={20} className="text-orange-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Hot Serving</span>
                      </button>
                      <button
                        onClick={() => setSelectedTemp('Cold')}
                        className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-300 ${
                          selectedTemp === 'Cold' 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-lg' 
                            : 'border-gray-50 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <Info size={20} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cold Serving</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-10 pt-6 border-t dark:border-gray-700 flex items-center justify-between gap-6">
                <div className="text-left">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Price</p>
                   <p className="text-3xl font-black dark:text-white">
                      RM{(
                        selectedItemForVariants.item.price + 
                        (selectedItemForVariants.item.sizes?.find(s => s.name === selectedSize)?.price || 0) +
                        (selectedTemp === 'Hot' ? (selectedItemForVariants.item.tempOptions?.hot || 0) : (selectedTemp === 'Cold' ? (selectedItemForVariants.item.tempOptions?.cold || 0) : 0))
                      ).toFixed(2)}
                   </p>
                </div>
                <button 
                  onClick={confirmVariantAdd}
                  className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-100 dark:shadow-none hover:bg-orange-600 transition-all active:scale-95"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Cart FAB - Adjusted height to be smaller (py-2.5) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[340px] px-4 z-50">
          <button 
            onClick={() => setShowCart(true)}
            className={`w-full py-2.5 px-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between hover:scale-[1.02] active:scale-95 transition-all border-4 ${
              offlineCartItems.length > 0 
                ? 'bg-red-600 text-white border-white dark:border-gray-800' 
                : 'bg-black dark:bg-gray-100 text-white dark:text-gray-900 border-white dark:border-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${offlineCartItems.length > 0 ? 'bg-white text-red-600' : 'bg-orange-500 text-white'}`}>
                {cart.length}
              </div>
              <span className="font-black text-[10px] uppercase tracking-[0.2em]">
                {offlineCartItems.length > 0 ? 'Action Required' : 'View Your Tray'}
              </span>
            </div>
            <span className="font-black text-lg tracking-tight">RM{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col animate-slide-left transition-colors">
            <div className="p-6 border-b dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-sm font-black dark:text-white uppercase tracking-[0.3em]">Your Order Summary</h2>
              <button onClick={() => setShowCart(false)} className="p-3 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full dark:text-gray-400 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {offlineCartItems.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
                  <WifiOff size={20} className="text-red-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Kitchen Offline</p>
                    <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Some items in your tray are from a kitchen that just went offline. Please remove them to proceed.</p>
                  </div>
                </div>
              )}

              {cart.map((item, idx) => {
                const res = allRestaurants.find(r => r.id === item.restaurantId);
                const isOffline = res && res.isOnline === false;
                return (
                  <div key={`${item.id}-${idx}`} className={`flex gap-4 p-4 rounded-2xl border transition-all shadow-sm ${isOffline ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 grayscale opacity-60' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'}`}>
                    <img src={item.image} className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                    <div className="flex-1">
                      <div className="flex justify-between font-bold dark:text-white mb-2">
                        <div className="flex flex-col">
                          <p className="text-xs font-black uppercase tracking-tight">{item.name}</p>
                          {isOffline && <span className="text-[8px] text-red-500 font-black uppercase">UNAVAILABLE</span>}
                        </div>
                        <p className="text-xs font-black text-orange-500">RM{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.selectedSize && <span className="text-[8px] font-black px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded uppercase">{item.selectedSize}</span>}
                        {item.selectedTemp && <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${item.selectedTemp === 'Hot' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{item.selectedTemp}</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-white dark:bg-gray-700 rounded-xl border dark:border-gray-600 overflow-hidden shadow-inner">
                          <button onClick={() => onRemoveFromCart(item.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Minus size={12} /></button>
                          <span className="px-4 font-black text-xs dark:text-white">{item.quantity}</span>
                          <button onClick={() => onAddToCart(item)} className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors"><Plus size={12} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {cart.length === 0 && (
                 <div className="text-center py-24">
                    <ShoppingCart size={48} className="mx-auto mb-4 text-gray-200" />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Your tray is empty</p>
                 </div>
              )}

              {cart.length > 0 && (
                <div className="pt-6 mt-6 border-t dark:border-gray-800">
                   <div className="flex items-center gap-2 mb-3">
                     <MessageSquare size={16} className="text-orange-500" />
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chef Instructions</label>
                   </div>
                   <textarea 
                     className="w-full p-4 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-2xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none shadow-inner"
                     placeholder="e.g. No dairy, extra spicy..."
                     rows={3}
                     value={orderRemark}
                     onChange={(e) => setOrderRemark(e.target.value)}
                   />
                </div>
              )}
            </div>

            <div className="p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 backdrop-blur-xl">
              <div className="space-y-3 mb-8">
                <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span className="text-gray-900 dark:text-white font-black">RM{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-2xl font-black text-gray-900 dark:text-white border-t pt-6 mt-6 uppercase tracking-tighter">
                  <span>Grand Total</span>
                  <span className="text-orange-500">RM{cartTotal.toFixed(2)}</span>
                </div>
              </div>
              <button 
                disabled={cart.length === 0 || offlineCartItems.length > 0} 
                onClick={() => { onPlaceOrder(orderRemark); setShowCart(false); setOrderRemark(''); }} 
                className={`w-full py-5 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 ${offlineCartItems.length > 0 ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'}`}
              >
                {offlineCartItems.length > 0 ? 'Remove Offline Items' : 'Send Order to Kitchen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerView;
