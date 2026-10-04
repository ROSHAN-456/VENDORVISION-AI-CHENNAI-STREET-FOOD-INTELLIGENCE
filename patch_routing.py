import os

file_path = "src/CustomerApp.jsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update MapView to support user location and routing
map_view_code = """// --- Vanilla Leaflet Map Component ---
function MapView({ stalls, selectedId, onSelectStall, userLoc, hasLocPermission, onRouteFound }) {
    const mapRef = useRef(null);
    const containerRef = useRef(null);
    const markersRef = useRef({});
    const userMarkerRef = useRef(null);
    const routingControlRef = useRef(null);

    // Initialize Map and Stall Markers
    useEffect(() => {
        if (!containerRef.current || !window.L) return;

        if (!mapRef.current) {
            mapRef.current = window.L.map(containerRef.current).setView([13.0827, 80.2707], 11);
            window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; CartoDB'
            }).addTo(mapRef.current);
        }

        // 1. Draw stall markers
        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};

        stalls.forEach(s => {
            if (!s.lat || !s.lon) return;
            const dotColor = s.liveCrowd === 'High' ? '#ef4444' : s.liveCrowd === 'Low' ? '#22c55e' : '#f59e0b';
            const html = `<div style="background:${dotColor};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>`;
            const icon = window.L.divIcon({ html, className: '', iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10] });

            const marker = window.L.marker([s.lat, s.lon], { icon }).addTo(mapRef.current);
            marker.bindPopup(`<div style="font-family:'Inter',sans-serif;font-size:13px;color:#1e293b;"><b>${s.name}</b><br>Wait: <b>${s.liveWait || '-'} min</b></div>`);
            marker.on('click', () => onSelectStall(s));

            markersRef.current[s.id] = marker;
        });

        // 2. Draw user marker
        if (userLoc) {
            if (userMarkerRef.current) userMarkerRef.current.remove();
            const userIconHtml = `<div style="background:#3b82f6;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>`;
            const uIcon = window.L.divIcon({ html: userIconHtml, className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
            userMarkerRef.current = window.L.marker([userLoc.lat, userLoc.lon], { icon: uIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
            userMarkerRef.current.bindPopup(hasLocPermission ? "<b>You are here</b>" : "<b>Default Location</b><br>Enable location for accuracy");
        }

    }, [stalls, userLoc, hasLocPermission, onSelectStall]);

    // Handle Selection & Routing
    useEffect(() => {
        if (!mapRef.current || !window.L) return;

        // Clear previous route
        if (routingControlRef.current) {
            mapRef.current.removeControl(routingControlRef.current);
            routingControlRef.current = null;
        }

        if (selectedId && markersRef.current[selectedId]) {
            const target = markersRef.current[selectedId];
            target.openPopup();

            if (userLoc && window.L.Routing) {
                // Draw route
                routingControlRef.current = window.L.Routing.control({
                    waypoints: [
                        window.L.latLng(userLoc.lat, userLoc.lon),
                        target.getLatLng()
                    ],
                    routeWhileDragging: false,
                    show: false, // hide the text instructions
                    addWaypoints: false,
                    fitSelectedRoutes: true,
                    lineOptions: {
                        styles: [{ color: '#3b82f6', opacity: 0.8, weight: 5 }]
                    },
                    createMarker: () => null // don't create duplicate markers for start/end
                }).addTo(mapRef.current);

                routingControlRef.current.on('routesfound', (e) => {
                    const routes = e.routes;
                    if (routes && routes.length > 0 && onRouteFound) {
                        const summary = routes[0].summary;
                        const dist = summary.totalDistance > 1000 
                            ? (summary.totalDistance / 1000).toFixed(1) + ' km' 
                            : Math.round(summary.totalDistance) + ' m';
                        const time = Math.round(summary.totalTime / 60) + ' min drive';
                        onRouteFound(`${dist} · ${time}`);
                    }
                });
            } else {
                mapRef.current.setView(target.getLatLng(), 14, { animate: true });
            }
        } else {
            // No selection -> reset view to user or default
            if (onRouteFound) onRouteFound(null);
            if (userLoc) {
                mapRef.current.setView([userLoc.lat, userLoc.lon], 11, { animate: true });
            }
        }
        
        return () => {
            if (routingControlRef.current && mapRef.current) {
                mapRef.current.removeControl(routingControlRef.current);
            }
        };
    }, [selectedId, userLoc]);

    return <div ref={containerRef} className="w-full h-48 sm:h-64 rounded-xl border border-slate-200 shadow-sm z-0 relative overflow-hidden" />;
}"""

old_map_view = content.split("// --- Vanilla Leaflet Map Component ---")[1].split("export default function CustomerApp")[0]
content = content.replace("// --- Vanilla Leaflet Map Component ---" + old_map_view, map_view_code + "\n")

# 2. Add hasLocPermission, routeInfo to CustomerApp state
state_code = """    const [userLoc, setUserLoc] = useState(CHENNAI_CENTER);
    const [hasLocPermission, setHasLocPermission] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);
    const [alertsFeed, setAlertsFeed] = useState([]);"""

old_state_code = """    const [userLoc, setUserLoc] = useState(CHENNAI_CENTER);
    const [alertsFeed, setAlertsFeed] = useState([]);"""
content = content.replace(old_state_code, state_code)

# 3. Update geolocation setter
geo_code = """    // Try to get user geolocation
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                    setHasLocPermission(true);
                },
                () => { setHasLocPermission(false); } // silently use default Chennai center
            );
        }
    }, []);"""

old_geo_code = """    // Try to get user geolocation
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                () => { } // silently use default Chennai center
            );
        }
    }, []);"""
content = content.replace(old_geo_code, geo_code)

# 4. MapView props on Home tab
home_map = """                            <div className="mb-8 relative">
                                {loadingStalls && <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>}
                                <MapView stalls={stalls} selectedId={null} onSelectStall={onSelectStall} userLoc={userLoc} hasLocPermission={hasLocPermission} onRouteFound={setRouteInfo} />
                                {!hasLocPermission && (
                                    <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded shadow-sm text-amber-700">
                                        Enable location for directions
                                    </div>
                                )}
                            </div>"""
old_home_map = """                            <div className="mb-8 relative">
                                {loadingStalls && <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>}
                                <MapView stalls={stalls} selectedId={null} onSelectStall={onSelectStall} />
                            </div>"""
content = content.replace(old_home_map, home_map)

# 5. Add MapView to Stall details view so route can be drawn and "Clear route" action
# In stall details, replace the distance display with an actual Map box or add "Clear Route"
# Wait, let's look at how stall details are rendered. 
stall_details_back = """                        <div className="animate-fadeUp">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={() => setSelectedStall(null)} className="text-brand-500 font-bold flex items-center gap-1 hover:text-brand-600 transition-colors">
                                    ← Back to List
                                </button>
                                {routeInfo && (
                                    <button onClick={() => setSelectedStall(null)} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                                        <X size={14}/> Clear route
                                    </button>
                                )}
                            </div>"""

old_stall_details_back = """                        <div className="animate-fadeUp">
                            <button onClick={() => setSelectedStall(null)} className="mb-4 text-brand-500 font-bold flex items-center gap-1 hover:text-brand-600 transition-colors">
                                ← Back to List
                            </button>"""
content = content.replace(old_stall_details_back, stall_details_back)

stall_map = """                                    <Card className="border-accent/40 bg-gradient-to-br from-white to-amber-50 mb-6 lg:mb-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="font-bold text-slate-800 flex items-center gap-2 text-lg">Live AI Prediction</div>
                                        </div>
                                        <div className="text-sm text-slate-600 mb-5">Real-time crowd intelligence based on weather, time, and history.</div>
                                        <div className="mb-5 relative h-32 rounded-lg overflow-hidden border border-slate-200">
                                            <MapView stalls={[selectedStall]} selectedId={selectedStall.id} onSelectStall={() => {}} userLoc={userLoc} hasLocPermission={hasLocPermission} onRouteFound={setRouteInfo} />
                                            {routeInfo && (
                                                <div className="absolute top-2 right-2 z-[1000] bg-white text-brand-900 border border-brand-200 font-bold text-[11px] px-2.5 py-1 rounded shadow-md">
                                                    {routeInfo}
                                                </div>
                                            )}
                                        </div>"""

old_stall_map = """                                    <Card className="border-accent/40 bg-gradient-to-br from-white to-amber-50 mb-6 lg:mb-0">
                                        <div className="font-bold text-slate-800 mb-1 flex items-center gap-2 text-lg">Live AI Prediction</div>
                                        <div className="text-sm text-slate-600 mb-5">Real-time crowd intelligence based on weather, time, and history.</div>"""
content = content.replace(old_stall_map, stall_map)

# 6. Change activeTab home -> map view clean selected stall
# Already done by navigate() -> setActiveTab(tab); setSelectedStall(null);

with open(file_path, "w") as f:
    f.write(content)
print("Routing Patched")
