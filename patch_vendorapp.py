import os

def patch_vendor():
    file_path = "src/VendorApp.jsx"
    with open(file_path, "r") as f:
        content = f.read()

    # 1. State for Weather Weekly Impact & Extended Forecast Data
    old_state = """    const [forecastData, setForecastData] = useState(FORECAST_DATA);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);"""

    new_state = """    const [forecastData, setForecastData] = useState(FORECAST_DATA);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [extendedForecast, setExtendedForecast] = useState([]);
    const [showWeeklyImpact, setShowWeeklyImpact] = useState(false);"""
    
    if "const [showWeeklyImpact" not in content:
        content = content.replace(old_state, new_state)

    # 2. Add Extended Forecast Generation in useEffect
    old_fetch_logic = """                    // Generate Synthetic Forecast 
                    const hour = now.getHours();
                    const baseWait = myStall.liveWait || 15;
                    const forecastArr = Array.from({length: 6}).map((_, i) => {
                        const h = (hour + i + 1) % 24;
                        let mult = 0.8;
                        if (h >= 12 && h <= 14) mult = 1.3;
                        else if (h >= 18 && h <= 20) mult = 1.6;
                        else if (h < 11 || h >= 22) mult = 0.4;
                        
                        const simWait = Math.max(2, Math.round(baseWait * mult + (Math.random() * 6 - 3)));
                        const h12 = h % 12 === 0 ? 12 : h % 12;
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        return {
                            time: `${h12} ${ampm}`,
                            act: i < 2 ? Math.max(simWait - 2, 0) : null,
                            exp: simWait
                        };
                    });
                    if (forecastArr.length > 0) {
                        setForecastData(forecastArr);
                    }"""

    new_fetch_logic = """                    // Generate Synthetic Forecast 
                    const hour = now.getHours();
                    const baseWait = myStall.liveWait || 15;
                    const forecastArr = Array.from({length: 6}).map((_, i) => {
                        const h = (hour + i + 1) % 24;
                        let mult = 0.8;
                        if (h >= 12 && h <= 14) mult = 1.3;
                        else if (h >= 18 && h <= 20) mult = 1.6;
                        else if (h < 11 || h >= 22) mult = 0.4;
                        
                        const simWait = Math.max(2, Math.round(baseWait * mult + (Math.random() * 6 - 3)));
                        const h12 = h % 12 === 0 ? 12 : h % 12;
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        return {
                            time: `${h12} ${ampm}`,
                            act: i < 2 ? Math.max(simWait - 2, 0) : null,
                            exp: simWait
                        };
                    });
                    if (forecastArr.length > 0) {
                        setForecastData(forecastArr);
                    }
                    
                    // Generate Extended 48Hr Forecast
                    const extArr = Array.from({length: 48}).map((_, i) => {
                         const h = (hour + i + 1) % 24;
                         const dayOffset = Math.floor((hour + i + 1) / 24);
                         let mult = 0.8;
                         if (dayOffset === 1 && (h >= 18 && h <= 21)) mult = 2.0; // spike next evening
                         if (h >= 12 && h <= 14) mult *= 1.3;
                         else if (h >= 18 && h <= 20) mult *= 1.6;
                         else if (h < 11 || h >= 22) mult *= 0.4;
                         
                         const simWait = Math.max(2, Math.round(baseWait * mult + (Math.random() * 6 - 3)));
                         const h12 = h % 12 === 0 ? 12 : h % 12;
                         const ampm = h >= 12 ? 'PM' : 'AM';
                         let dStr = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tmrw' : '+2d';
                         return { time: `${dStr} ${h12} ${ampm}`, exp: simWait };
                    });
                    setExtendedForecast(extArr);"""

    if "setExtendedForecast(extArr);" not in content:
        content = content.replace(old_fetch_logic, new_fetch_logic)

    # 3. Weather impact button action
    old_weather_card = """                                <Card className="bg-gradient-to-br from-brand-900 to-brand-800 text-white border-0">
                                    <h3 className="font-bold flex items-center gap-2 mb-3"><CloudRain size={18} className="text-accent" /> AI Weather Insight</h3>
                                    <p className="text-sm text-brand-100 mb-4">A moderate chance of rain is expected tomorrow evening (6 PM - 8 PM). Historically, this reduces foot traffic by 25% for your category.</p>
                                    <Button variant="secondary" className="w-full text-brand-900 font-bold border-0 hover:bg-white bg-brand-50">View Weekly Impact</Button>
                                </Card>"""

    new_weather_card = """                                <Card className="bg-gradient-to-br from-brand-900 to-brand-800 text-white border-0">
                                    <h3 className="font-bold flex items-center gap-2 mb-3"><CloudRain size={18} className="text-accent" /> AI Weather Insight</h3>
                                    <p className="text-sm text-brand-100 mb-4">A moderate chance of rain is expected tomorrow evening (6 PM - 8 PM). Historically, this reduces foot traffic by 25% for your category.</p>
                                    <Button onClick={() => setShowWeeklyImpact(!showWeeklyImpact)} variant="secondary" className="w-full text-brand-900 font-bold border-0 hover:bg-white bg-brand-50">
                                        {showWeeklyImpact ? "Hide Weekly Impact" : "View Weekly Impact"}
                                    </Button>
                                    {showWeeklyImpact && (
                                        <div className="mt-4 pt-4 border-t border-brand-700/50 space-y-3 animate-fadeUp">
                                            {[
                                                { d: 'Mon', w: 'Clear', e: '+10%', c: 'text-green-400' },
                                                { d: 'Tue', w: 'Rain', e: '-25%', c: 'text-red-400' },
                                                { d: 'Wed', w: 'Cloudy', e: '-5%', c: 'text-amber-400' },
                                                { d: 'Thu', w: 'Clear', e: '+15%', c: 'text-green-400' },
                                                { d: 'Fri', w: 'Clear', e: '+30%', c: 'text-green-400' },
                                                { d: 'Sat', w: 'Clear', e: '+45%', c: 'text-green-400' },
                                                { d: 'Sun', w: 'Hot', e: '-10%', c: 'text-red-400' }
                                            ].map((day, i) => (
                                                <div key={i} className="flex justify-between items-center text-sm">
                                                    <span className="font-semibold w-12">{day.d}</span>
                                                    <span className="text-brand-100/70">{day.w}</span>
                                                    <span className={`font-bold ${day.c}`}>{day.e} Traffic</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>"""
    if "setShowWeeklyImpact(!showWeeklyImpact)" not in content:
         content = content.replace(old_weather_card, new_weather_card)

    # 4. Forecast Tab implementation
    old_cases = """            case 'settings':"""

    new_cases = """            case 'forecast':
                return (
                    <div className="space-y-6 animate-fadeUp">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                                Extended Demand Forecast 
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase tracking-wider ml-2">Projected AI Estimate</span>
                            </h2>
                            <p className="text-slate-500">A 48-hour projected view of expected foot traffic based on recent AI models.</p>
                        </div>

                        <Card>
                            <h3 className="font-bold text-slate-800 mb-6">48-Hour Expected Volume</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={extendedForecast}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={10} interval="preserveStartEnd" minTickGap={30} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Line type="monotone" dataKey="exp" name="AI Expected" stroke="#2E7A6A" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-amber-50 border-amber-200">
                                <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2"><Target size={18} /> Approaching Peak Periods</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-amber-100">
                                        <span className="font-bold text-slate-800">Today, 7 - 9 PM</span>
                                        <Badge className="bg-red-100 text-red-700 font-bold border-0">Very High</Badge>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-amber-100">
                                        <span className="font-bold text-slate-800">Tomorrow, 12 - 2 PM</span>
                                        <Badge className="bg-amber-100 text-amber-700 font-bold border-0">Medium</Badge>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-amber-100">
                                        <span className="font-bold text-slate-800">Tomorrow, 7 - 9 PM</span>
                                        <Badge className="bg-red-100 text-red-700 font-bold border-0">Very High</Badge>
                                    </div>
                                </div>
                            </Card>

                            <Card className="bg-green-50 border-green-200">
                                <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2"><Clock size={18} /> Best Restock Windows</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-green-100">
                                        <span className="font-bold text-slate-800">Today, 4 - 5 PM</span>
                                        <Badge className="bg-green-100 text-green-700 font-bold border-0">Optimal</Badge>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-green-100">
                                        <span className="font-bold text-slate-800">Tomorrow, 10 - 11 AM</span>
                                        <Badge className="bg-green-100 text-green-700 font-bold border-0">Optimal</Badge>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-green-100">
                                        <span className="font-bold text-slate-800">Tomorrow, 4 - 5 PM</span>
                                        <Badge className="bg-green-100 text-green-700 font-bold border-0">Optimal</Badge>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                );

            case 'settings':"""
    if "case 'forecast':" not in content:
        content = content.replace(old_cases, new_cases)

    with open("src/VendorApp.jsx", "w") as f:
        f.write(content)
        
patch_vendor()
print("Success")
