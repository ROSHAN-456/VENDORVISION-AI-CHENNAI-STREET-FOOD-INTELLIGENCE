import re

with open('VendorVisionApp.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add state to CustomerDashboard
state_injection = '''function CustomerDashboard({ onLogout }) {
  const [stalls, setStalls] = useState([]);
  const [liveStallsData, setLiveStallsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weather, setWeather] = useState("Clear");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [hourlyChartData, setHourlyChartData] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState({});

  const handleCheckIn = (stallId, level) => {
    const now = Date.now();
    const lastCheckIn = localStorage.getItem(`checkin_${stallId}`);
    if (lastCheckIn && now - parseInt(lastCheckIn) < 30 * 60 * 1000) {
      setCheckInStatus(prev => ({ ...prev, [stallId]: "You already reported recently!" }));
      return;
    }
    
    fetch(`${API_BASE}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stall_id: stallId,
        reported_crowd_level: level,
        timestamp: new Date().toISOString()
      })
    }).then(r => r.json()).then(() => {
      localStorage.setItem(`checkin_${stallId}`, now.toString());
      setCheckInStatus(prev => ({ ...prev, [stallId]: "Thanks! This helps others." }));
    }).catch(e => {
      setCheckInStatus(prev => ({ ...prev, [stallId]: "Error connecting to server." }));
    });
  };'''

code = re.sub(
    r'function CustomerDashboard\(\{ onLogout \}\) \{.*?(?=  useEffect\(\(\) => \{)',
    state_injection + '\n\n',
    code,
    flags=re.DOTALL
)

# 2. Add UI for check-in just above or below the Chart in focusStall
chart_block_old = '''        {focusStall && (
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${LINE}`, padding: "18px 20px" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Hourly crowd trend — {focusStall.name}</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 12 }}>Plan your visit for a quieter hour, adjusted for current weather</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={hourlyChartData} margin={{ top: 12, left: -14 }}>
                <CartesianGrid stroke="#EFE7CF" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10.5, fill: MUTED }} interval={1} />
                <YAxis tick={{ fontSize: 10.5, fill: MUTED }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LINE}` }} />
                <Line type="monotone" dataKey="footfall" stroke={CHILI} strokeWidth={2.2} dot={{ r: 2.5 }} name="Footfall" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}'''

chart_block_new = '''        {focusStall && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${LINE}`, padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Report Current Crowd</div>
              <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 12 }}>Help others by sharing the live situation at {focusStall.name}</div>
              
              {checkInStatus[focusStall.id] ? (
                <div style={{ fontSize: 13, fontWeight: 600, color: TEAL, padding: "8px 0" }}>
                  {checkInStatus[focusStall.id]}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <button onClick={() => handleCheckIn(focusStall.id, "Low")} style={{ background: CROWD_STYLE.Low.bg, color: CROWD_STYLE.Low.fg, border: "none", padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Low</button>
                  <button onClick={() => handleCheckIn(focusStall.id, "Medium")} style={{ background: CROWD_STYLE.Medium.bg, color: CROWD_STYLE.Medium.fg, border: "none", padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Medium</button>
                  <button onClick={() => handleCheckIn(focusStall.id, "High")} style={{ background: CROWD_STYLE.High.bg, color: CROWD_STYLE.High.fg, border: "none", padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>High</button>
                </div>
              )}
            </div>
            
            <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${LINE}`, padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Hourly crowd trend — {focusStall.name}</div>
              <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 12 }}>Plan your visit for a quieter hour, adjusted for current weather</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={hourlyChartData} margin={{ top: 12, left: -14 }}>
                  <CartesianGrid stroke="#EFE7CF" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10.5, fill: MUTED }} interval={1} />
                  <YAxis tick={{ fontSize: 10.5, fill: MUTED }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LINE}` }} />
                  <Line type="monotone" dataKey="footfall" stroke={CHILI} strokeWidth={2.2} dot={{ r: 2.5 }} name="Footfall" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}'''

code = code.replace(chart_block_old, chart_block_new)

with open('VendorVisionApp.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
    
print("Rewrite OK.")
