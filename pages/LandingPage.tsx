
import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Utensils, ShieldCheck, ShoppingBag, Sun, Moon, X, MapPin, Hash, Camera, RefreshCcw } from 'lucide-react';
import { Area } from '../types';
import jsQR from 'jsqr';

interface Props {
  onScan: (location: string, table: string) => void;
  onLoginClick: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  locations: Area[];
}

const LandingPage: React.FC<Props> = ({ onScan, onLoginClick, isDarkMode, onToggleDarkMode, locations }) => {
  const [showSimModal, setShowSimModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(locations[0]?.name || '');
  const [tableNo, setTableNo] = useState('1');
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(scanQRCode);
      }
    } catch (err: any) {
      setCameraError(err.message || 'Could not access camera');
      console.error('Camera Error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    setShowCamera(false);
  };

  const scanQRCode = (_time: number) => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          // Parse logic: assuming URL like ?loc=ZoneA&table=5 or similar
          try {
            if (code.data.startsWith('http')) {
              const url = new URL(code.data);
              const loc = url.searchParams.get("loc");
              const tbl = url.searchParams.get("table");
              if (loc && tbl) {
                onScan(loc, tbl);
                stopCamera();
                return;
              }
            } else {
              // If it's just plain text like "ZoneA,5"
              const parts = code.data.split(',');
              if (parts.length === 2) {
                onScan(parts[0].trim(), parts[1].trim());
                stopCamera();
                return;
              }
            }
          } catch (e) {
            console.error("QR Parse Error", e);
          }
          console.log("Found QR Raw:", code.data);
        }
      }
    }
    requestRef.current = requestAnimationFrame(scanQRCode);
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleSimulate = () => {
    if (!selectedLocation || !tableNo) return;
    onScan(selectedLocation, tableNo);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300 flex flex-col">
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-200 dark:shadow-none">Q</div>
          <span className="text-2xl font-black tracking-tighter dark:text-white">QuickServe</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleDarkMode}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={onLoginClick}
            className="text-gray-600 dark:text-gray-400 font-semibold hover:text-orange-500 transition-colors"
          >
            Staff Login
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="mb-12 relative w-full max-w-lg">
          <div className="absolute inset-0 bg-orange-100 dark:bg-orange-900/20 rounded-full scale-150 blur-3xl opacity-50 -z-10 animate-pulse"></div>
          <div className="p-8 md:p-12 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-orange-50 dark:border-gray-700 flex flex-col items-center">
            
            {!showCamera ? (
              <>
                <div className="relative group cursor-pointer" onClick={startCamera}>
                  <div className="absolute inset-0 bg-orange-500/10 rounded-full scale-125 group-hover:scale-150 transition-transform duration-500 blur-xl"></div>
                  <div className="w-32 h-32 bg-gray-50 dark:bg-gray-700 rounded-3xl flex items-center justify-center mb-6 relative border-4 border-dashed border-gray-200 dark:border-gray-600 group-hover:border-orange-500 transition-colors">
                    <QrCode size={80} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
                    <div className="absolute -bottom-2 -right-2 bg-orange-500 p-2 rounded-xl text-white shadow-lg">
                      <Camera size={20} />
                    </div>
                  </div>
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">Scan to Order</h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-8">Point your camera at a table QR code to start ordering</p>
                
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={startCamera}
                    className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg hover:bg-orange-600 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-orange-100 dark:shadow-none flex items-center justify-center gap-3"
                  >
                    <Camera size={24} />
                    Open Scanner
                  </button>
                  <button 
                    onClick={() => setShowSimModal(true)}
                    className="w-full py-4 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCcw size={16} />
                    Manual/Simulate Scan
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full relative">
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black shadow-inner border-4 border-orange-500">
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover" 
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Scanner overlay */}
                  <div className="absolute inset-0 border-2 border-orange-500/20 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-orange-500 rounded-2xl flex items-center justify-center">
                      <div className="w-full h-0.5 bg-orange-500/50 absolute top-0 animate-[scan_2s_infinite]"></div>
                    </div>
                  </div>
                  
                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center">
                      <div>
                        <X className="mx-auto text-red-500 mb-2" size={32} />
                        <p className="text-white font-bold text-sm mb-4">{cameraError}</p>
                        <button onClick={stopCamera} className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold uppercase">Go Back</button>
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={stopCamera}
                  className="mt-6 w-full py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all"
                >
                  Cancel Scanner
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full py-12">
          <div className="p-6 rounded-2xl bg-orange-50 dark:bg-gray-800 border border-orange-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-orange-500 shadow-sm mb-4 mx-auto md:mx-0">
              <Utensils size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2 dark:text-white">Explore Menus</h3>
            <p className="text-gray-600 dark:text-gray-400">Browse a wide variety of restaurants with interactive digital menus.</p>
          </div>
          <div className="p-6 rounded-2xl bg-orange-50 dark:bg-gray-800 border border-orange-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-orange-500 shadow-sm mb-4 mx-auto md:mx-0">
              <ShoppingBag size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2 dark:text-white">Fast Ordering</h3>
            <p className="text-gray-600 dark:text-gray-400">Add to cart and pay instantly. Your food will be served right to you.</p>
          </div>
          <div className="p-6 rounded-2xl bg-orange-50 dark:bg-gray-800 border border-orange-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-orange-500 shadow-sm mb-4 mx-auto md:mx-0">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2 dark:text-white">Secure Payments</h3>
            <p className="text-gray-600 dark:text-gray-400">Multiple payment options with industry-standard security protocols.</p>
          </div>
        </div>
      </div>
      
      {/* Manual Selection Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-in zoom-in fade-in duration-300">
            <button 
              onClick={() => setShowSimModal(false)} 
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            >
              <X size={20} />
            </button>

            <div className="mb-8">
              <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center mb-4">
                <QrCode size={28} />
              </div>
              <h2 className="text-2xl font-black dark:text-white">Manual Selection</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Select your location to begin ordering without scanning.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Physical Location</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select 
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-bold outline-none appearance-none cursor-pointer"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Table Number</label>
                <div className="relative">
                  <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="e.g. 12"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-bold outline-none"
                    value={tableNo}
                    onChange={(e) => setTableNo(e.target.value)}
                  />
                </div>
              </div>

              <button 
                onClick={handleSimulate}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-100 dark:shadow-none hover:bg-orange-600 transition-all active:scale-95"
              >
                Start Ordering
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="p-8 text-center text-gray-400 dark:text-gray-600 text-sm border-t dark:border-gray-800">
        © 2024 QuickServe Systems. All rights reserved.
      </footer>
      
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
