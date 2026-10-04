import os

def patch_customer_app():
    file_path = "src/CustomerApp.jsx"
    with open(file_path, "r") as f:
        content = f.read()

    # 1. Fix fetch stalls to also compute liveWait for sorting
    # Actually, fetching for 8 stalls takes tiny time locally. 
    # But wait, we can just compute it per stall.
    # No, we can just do Promise.all
    fetch_func = """        const fetchStalls = async () => {
            try {
                setLoadingStalls(true);
                const res = await fetch(`${API_BASE}/stalls`);
                if (!res.ok) throw new Error("Failed to fetch stalls");
                const data = await res.json();
                
                // Fetch predictions for all stalls for Nearby / Best sort to work
                const now = new Date();
                const hour = now.getHours();
                const dayOfWeek = now.getDay();
                
                const merged = await Promise.all(data.map(async s => {
                    const mock = MOCK_STALLS.find(m => m.id === s.id) || {};
                    let liveWait = 99;
                    let liveCrowd = 'Medium';
                    try {
                        const pRes = await fetch(`${API_BASE}/predict?stall_id=${s.id}&hour=${hour}&day_of_week=${dayOfWeek}&weather=Clear`);
                        if (pRes.ok) {
                            const pData = await pRes.json();
                            liveWait = pData.wait_minutes;
                            liveCrowd = pData.crowd_level;
                        }
                    } catch(e){}
                    return { ...mock, ...s, liveWait, liveCrowd };
                }));
                
                setStalls(merged);
                setErrorStalls(null);"""

    old_fetch = """        const fetchStalls = async () => {
            try {
                setLoadingStalls(true);
                const res = await fetch(`${API_BASE}/stalls`);
                if (!res.ok) throw new Error("Failed to fetch stalls");
                const data = await res.json();
                const merged = data.map(s => {
                    const mock = MOCK_STALLS.find(m => m.id === s.id) || {};
                    return { ...mock, ...s };
                });
                setStalls(merged);
                setErrorStalls(null);"""
    
    content = content.replace(old_fetch, fetch_func)

    # 2. Fix onSelectStall to fetch 6 hours forecast
    select_stall = """
            const pRes = await fetch(`${API_BASE}/predict?stall_id=${stall.id}&hour=${hour}&day_of_week=${dayOfWeek}&weather=${wData.condition}`);
            
            const forecastArr = [];
            for (let i = 0; i < 6; i++) {
                const fHour = (hour + i) % 24;
                try {
                    const fRes = await fetch(`${API_BASE}/predict?stall_id=${stall.id}&hour=${fHour}&day_of_week=${dayOfWeek}&weather=Clear`);
                    if (fRes.ok) {
                        const fData = await fRes.json();
                        forecastArr.push({ time: `${fHour > 12 ? fHour - 12 : fHour === 0 ? 12 : fHour} ${fHour >= 12 ? 'PM' : 'AM'}`, wait: fData.wait_minutes || 0, crowd: fData.crowd_level });
                    }
                } catch(e){}
            }

            if (pRes.ok) {
                const pData = await pRes.json();
                setSelectedStall(prev => ({ ...prev, liveCrowd: pData.crowd_level, liveWait: pData.wait_minutes, forecast: forecastArr }));
            }"""

    old_select_stall = """
            const pRes = await fetch(`${API_BASE}/predict?stall_id=${stall.id}&hour=${hour}&day_of_week=${dayOfWeek}&weather=${wData.condition}`);
            if (pRes.ok) {
                const pData = await pRes.json();
                setSelectedStall(prev => ({ ...prev, liveCrowd: pData.crowd_level, liveWait: pData.wait_minutes, forecast: pData.forecast_data }));
            }"""

    content = content.replace(old_select_stall, select_stall)

    # 3. Sort Mode Nearby
    sort_code = """    const filteredStalls = stalls.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        if (sortMode === 'wait') return (a.liveWait || 99) - (b.liveWait || 99);
        if (sortMode === 'nearby') {
            const distA = Math.hypot(a.lat - 13.0827, a.lon - 80.2707);
            const distB = Math.hypot(b.lat - 13.0827, b.lon - 80.2707);
            return distA - distB;
        }
        return 0;
    });"""

    old_sort_code = """    const filteredStalls = stalls.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        if (sortMode === 'wait') return (a.liveWait || 99) - (b.liveWait || 99);
        return 0;
    });"""

    content = content.replace(old_sort_code, sort_code)

    # 4. Map the forecast in HTML
    forecast_html = """                                        <div className="flex justify-between items-end h-32 gap-3 overflow-x-auto pb-2">
                                            {(selectedStall.forecast && selectedStall.forecast.length > 0 ? selectedStall.forecast : []).map((f, i) => (
                                                <div key={i} className="flex-1 min-w-[40px] flex flex-col items-center gap-2">
                                                    <div className={`w-full max-w-[48px] rounded-t-md transition-all duration-300 hover:opacity-80 ${f.crowd === 'High' ? 'bg-red-400' : f.crowd === 'Medium' ? 'bg-amber-400' : 'bg-green-400'}`} style={{ height: `${Math.max((f.wait / 30) * 100, 10)}%` }} />
                                                    <div className="text-[11px] text-slate-500 font-bold whitespace-nowrap">{f.time}</div>
                                                </div>
                                            ))}
                                            {(!selectedStall.forecast || selectedStall.forecast.length === 0) && (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Loading forecast...</div>
                                            )}
                                        </div>"""

    old_forecast_html = """                                        <div className="flex justify-between items-end h-32 gap-3 overflow-x-auto pb-2">
                                            {[2, 3, 6, 10, 14, 5].map((h, i) => (
                                                <div key={i} className="flex-1 min-w-[40px] flex flex-col items-center gap-2">
                                                    <div className={`w-full max-w-[48px] rounded-t-md transition-all duration-300 hover:opacity-80 ${h > 8 ? 'bg-red-400' : h > 4 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ height: `${Math.max(h * 8, 10)}%` }} />
                                                    <div className="text-[11px] text-slate-500 font-bold">{6 + i} PM</div>
                                                </div>
                                            ))}
                                        </div>"""
    
    content = content.replace(old_forecast_html, forecast_html)

    # 5. Fix Alerts Feed to use actual alerts if empty
    alerts_code_old = """                                    savedStalls.filter(s => s.liveCrowd === 'High').map(stall => ("""
    alerts_code_new = """                                    ((savedStalls.length > 0 ? savedStalls : stalls).filter(s => s.liveCrowd === 'High') || []).map(stall => ("""

    # Also fix "No alerts yet" condition
    alerts_no_alert_old = """                            <div className="space-y-4">
                                {savedStalls.length === 0 ? ("""
    alerts_no_alert_new = """                            <div className="space-y-4">
                                {(savedStalls.length > 0 ? savedStalls : stalls).filter(s => s.liveCrowd === 'High').length === 0 ? ("""
    
    content = content.replace(alerts_no_alert_old, alerts_no_alert_new)
    content = content.replace(alerts_code_old, alerts_code_new)

    with open(file_path, "w") as f:
        f.write(content)

def patch_vendor_app():
    file_path = "src/VendorApp.jsx"
    with open(file_path, "r") as f:
        content = f.read()

    vendor_fetch = """                const pRes = await fetch(`${API_BASE}/predict?stall_id=${myStall.id}&hour=${now.getHours()}&day_of_week=${now.getDay()}&weather=${wData.condition}`);
                
                const forecastArr = [];
                for (let i = 0; i < 6; i++) {
                    const fHour = (now.getHours() + i) % 24;
                    try {
                        const fRes = await fetch(`${API_BASE}/predict?stall_id=${myStall.id}&hour=${fHour}&day_of_week=${now.getDay()}&weather=Clear`);
                        if (fRes.ok) {
                            const fData = await fRes.json();
                            forecastArr.push({
                                time: `${fHour > 12 ? fHour - 12 : fHour === 0 ? 12 : fHour} ${fHour >= 12 ? 'PM' : 'AM'}`,
                                act: i < 2 ? Math.max(0, fData.wait_minutes - Math.floor(Math.random() * 5)) : null,
                                exp: fData.wait_minutes
                            });
                        }
                    } catch(e){}
                }

                if (pRes.ok) {
                    const pData = await pRes.json();
                    myStall.liveCrowd = pData.crowd_level;
                    myStall.liveWait = pData.wait_minutes;
                    if (forecastArr.length > 0) {
                        setForecastData(forecastArr);
                    }
                }"""

    old_vendor_fetch = """                const pRes = await fetch(`${API_BASE}/predict?stall_id=${myStall.id}&hour=${now.getHours()}&day_of_week=${now.getDay()}&weather=${wData.condition}`);
                if (pRes.ok) {
                    const pData = await pRes.json();
                    myStall.liveCrowd = pData.crowd_level;
                    myStall.liveWait = pData.wait_minutes;
                    if (pData.forecast_data) {
                        const newForecast = pData.forecast_data.map((val, idx) => ({
                            time: `${6 + idx} PM`,
                            act: idx < 3 ? Math.max(0, val - Math.floor(Math.random() * 5)) : null,
                            exp: val
                        }));
                        setForecastData(newForecast);
                    }
                }"""
                
    content = content.replace(old_vendor_fetch, vendor_fetch)

    with open(file_path, "w") as f:
        f.write(content)

patch_customer_app()
patch_vendor_app()
print("Patched!")
