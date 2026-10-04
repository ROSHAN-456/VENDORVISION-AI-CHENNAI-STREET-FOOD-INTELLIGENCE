import re

with open('VendorVisionApp.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update React import
code = code.replace(
    'import React, { useState, useMemo } from "react";',
    'import React, { useState, useMemo, useEffect } from "react";'
)

# 2. Add API_BASE
code = code.replace(
    '/*  Shared data                                                        */\n/* ------------------------------------------------------------------ */',
    '/*  Shared data                                                        */\n/* ------------------------------------------------------------------ */\n\nconst API_BASE = "http://localhost:8000";\nconst FALLBACK_METADATA = {\n  S1: { area: "Anna Nagar", tag: "Chaat", avgWait: 6.9 },\n  S2: { area: "T Nagar", tag: "Dosa · Chaat", avgWait: 12.4 },\n  S3: { area: "Velachery", tag: "Kabab", avgWait: 2.5 },\n  S4: { area: "Adyar", tag: "Juice · Snacks", avgWait: 1.4 },\n  S5: { area: "Avadi", tag: "Bhajji · Tea", avgWait: 3.8 }\n};'
)

# 3. Strip STALLS, HOURLY, peakHour
code = re.sub(r'const STALLS = \[.*?\];\n', '', code, flags=re.DOTALL)
code = re.sub(r'const HOURLY = \{.*?\};\n', '', code, flags=re.DOTALL)
code = re.sub(r'function peakHour\(id.*?return best;\n}\n', '', code, flags=re.DOTALL)

# 4. Replace VendorDashboard
vendor_old = '''function VendorDashboard({ onLogout }) {
  const [stallId, setStallId] = useState("S2");
  const stall = STALLS.find((s) => s.id === stallId);
  const peak = useMemo(() => peakHour(stallId), [stallId]);

  const forecastData = useMemo(() => {
    return Object.entries(HOURLY).map(([hour, vals]) => {
      const predicted = vals[stallId];
      const noise = ((parseInt(hour, 10) * 37 + stallId.charCodeAt(1) * 13) % 7) - 3;
      const actual = Math.max(0, Math.round((predicted + noise) * 10) / 10);
      return { hour: `${hour}:00`, predicted: Math.round(predicted * 10) / 10, actual };
    });
  }, [stallId]);

  const prepQty = Math.round(peak.val * 1.2);
  const prepTime = `${parseInt(peak.hour, 10) - 1}:30`;'''

vendor_new = '''function VendorDashboard({ onLogout }) {
  const [stalls, setStalls] = useState([]);
  const [stallId, setStallId] = useState("S2");
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [peak, setPeak] = useState({ hour: "19", val: 0 });

  useEffect(() => {
    fetch(`${API_BASE}/stalls`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        setStalls(data);
        if (data.length > 0 && !data.find(s => s.id === stallId)) setStallId(data[0].id);
      })
      .catch(e => setError("Failed to fetch stalls. Is backend running?"));
  }, []);

  useEffect(() => {
    if (!stallId) return;
    setLoading(true);
    const hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    Promise.all(hours.map(h => 
      fetch(`${API_BASE}/predict?stall_id=${stallId}&hour=${h}&day_of_week=5&weather=Clear`).then(r => r.json())
    )).then(resps => {
      let b = null;
      const fd = resps.map((d, i) => {
        const h = hours[i]; 
        const p = d.footfall;
        if (!b || p > b.val) b = { hour: h.toString(), val: p };
        const noise = ((h * 37 + stallId.charCodeAt(1) * 13) % 7) - 3;
        return { hour: `${h}:00`, predicted: Math.round(p * 10) / 10, actual: Math.max(0, Math.round((p + noise) * 10) / 10) };
      });
      setForecastData(fd);
      if(b) setPeak(b);
      setLoading(false);
      setError("");
    }).catch(e => { setError("Failed to fetch predictions."); setLoading(false); });
  }, [stallId]);

  if (error) return <div style={{ fontFamily: "'Inter', sans-serif", padding: 40, color: "#C1443A" }}>{error}</div>;
  if (!stalls.length || loading) return <div style={{ fontFamily: "'Inter', sans-serif", padding: 40, color: "#8A8168" }}>Loading data from backend...</div>;

  let stall = stalls.find((s) => s.id === stallId) || stalls[0];
  const meta = FALLBACK_METADATA[stallId] || { area: "Chennai", tag: "Food", avgWait: 5 };
  stall = { ...stall, ...meta };

  const prepQty = Math.round(peak.val * 1.2);
  const prepTime = `${parseInt(peak.hour, 10) - 1}:30`;'''

code = code.replace(vendor_old, vendor_new)

# 5. Replace CustomerDashboard
cust_old = '''function CustomerDashboard({ onLogout }) {
  const [weather, setWeather] = useState("Clear");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const weatherFactor = useMemo(() => {
    const base = WEATHER_IMPACT.find((w) => w.weather === "Clear").footfall;
    const cur = WEATHER_IMPACT.find((w) => w.weather === weather).footfall;
    return cur / base;
  }, [weather]);

  const liveStalls = useMemo(() => {
    const rows = STALLS.map((s) => {
      const ff = s.avgFootfall * weatherFactor;
      const crowd = ff < 20 ? "Low" : ff < 33 ? "Medium" : "High";
      const wait = Math.max(0, Math.round(((ff - 22) / 22) * 18 * 10) / 10);
      return { ...s, liveFootfall: Math.round(ff * 10) / 10, liveCrowd: crowd, liveWait: wait };
    });
    return rows
      .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.area.toLowerCase().includes(query.toLowerCase()) || s.tag.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.liveWait - b.liveWait);
  }, [weatherFactor, query]);

  const focus = selected || liveStalls[0]?.id;
  const focusStall = STALLS.find((s) => s.id === focus);

  const hourlyChartData = useMemo(() => {
    if (!focus) return [];
    return Object.entries(HOURLY).map(([hour, vals]) => ({
      hour: `${hour}:00`,
      footfall: Math.round(vals[focus] * weatherFactor * 10) / 10,
    }));
  }, [focus, weatherFactor]);'''

cust_new = '''function CustomerDashboard({ onLogout }) {
  const [stalls, setStalls] = useState([]);
  const [liveStallsData, setLiveStallsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weather, setWeather] = useState("Clear");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [hourlyChartData, setHourlyChartData] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/stalls`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setStalls(data))
      .catch(e => setError("Failed to fetch stalls. Is backend running?"));
  }, []);

  useEffect(() => {
    if (!stalls.length) return;
    setLoading(true);
    Promise.all(stalls.map(s => 
      fetch(`${API_BASE}/predict?stall_id=${s.id}&hour=13&day_of_week=5&weather=${weather}`)
        .then(r => r.json())
        .then(d => {
           const meta = FALLBACK_METADATA[s.id] || { area: "Chennai", tag: "Food", avgWait: 5 };
           return { ...s, ...meta, liveFootfall: d.footfall, liveCrowd: d.crowd_level, liveWait: d.wait_minutes };
        })
    )).then(d => {
      setLiveStallsData(d);
      setLoading(false);
      setError("");
    }).catch(e => { setError("Failed to fetch stall predictions"); setLoading(false); });
  }, [stalls, weather]);

  const liveStalls = useMemo(() => {
    return liveStallsData
      .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.area.toLowerCase().includes(query.toLowerCase()) || s.tag.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.liveWait - b.liveWait);
  }, [liveStallsData, query]);

  const focus = selected || liveStalls[0]?.id;
  const focusStall = liveStallsData.find(s => s.id === focus);

  useEffect(() => {
    if (!focus) return;
    const hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    Promise.all(hours.map(h => 
      fetch(`${API_BASE}/predict?stall_id=${focus}&hour=${h}&day_of_week=5&weather=${weather}`).then(r => r.json())
    )).then(resps => {
      setHourlyChartData(resps.map((d, i) => ({ hour: `${hours[i]}:00`, footfall: Math.round(d.footfall * 10) / 10 })));
    }).catch(e => console.error("Chart fetch failed"));
  }, [focus, weather]);
  
  if (error) return <div style={{ fontFamily: "'Inter', sans-serif", padding: 40, color: "#C1443A" }}>{error}</div>;
  if (!stalls.length || loading) return <div style={{ fontFamily: "'Inter', sans-serif", padding: 40, color: "#8A8168" }}>Loading live data...</div>;'''

code = code.replace(cust_old, cust_new)

with open('VendorVisionApp.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
