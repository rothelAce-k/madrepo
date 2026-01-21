import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const SensorContext = createContext();

export const useSensor = () => {
    const context = useContext(SensorContext);
    if (!context) {
        throw new Error('useSensor must be used within a SensorProvider');
    }
    return context;
};

// INITIAL TOPOLOGY
const INITIAL_SENSORS = [
    { id: 'SENSOR_A', name: 'Sensor A (Inlet)', location: 'Segment A-B', lat: 51.505, lng: -0.15, status: 'normal', pressure: 75, flow: 350, temp: 32, vibration: 0.02, corrosion: 0.01 },
    { id: 'SENSOR_B', name: 'Sensor B (Mid)', location: 'Segment B-C', lat: 51.508, lng: -0.12, status: 'normal', pressure: 74, flow: 350, temp: 32, vibration: 0.02, corrosion: 0.01 },
    { id: 'SENSOR_C', name: 'Sensor C (Crit)', location: 'Segment C-D', lat: 51.512, lng: -0.09, status: 'normal', pressure: 73, flow: 350, temp: 32, vibration: 0.02, corrosion: 0.01 },
    { id: 'SENSOR_D', name: 'Sensor D (Down)', location: 'Segment D-E', lat: 51.509, lng: -0.06, status: 'normal', pressure: 72, flow: 350, temp: 32, vibration: 0.02, corrosion: 0.01 },
    { id: 'SENSOR_E', name: 'Sensor E (Out)', location: 'Segment D-E', lat: 51.506, lng: -0.03, status: 'normal', pressure: 71, flow: 350, temp: 32, vibration: 0.02, corrosion: 0.01 },
];

export const SensorProvider = ({ children }) => {
    // 1. STATE
    const [sensors, setSensors] = useState(INITIAL_SENSORS);
    const [segmentHealth, setSegmentHealth] = useState({ 'A-B': 100, 'B-C': 100, 'C-D': 100, 'D-E': 100 });
    const [systemHealth, setSystemHealth] = useState(100);
    const [systemHealthDetails, setSystemHealthDetails] = useState({});

    // Connectivity
    const [isLive, setIsLive] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');

    // Live Chart Buffer
    const [history, setHistory] = useState([]);

    const ws = useRef(null);
    // Ref to hold latest health for the simulation loop to access
    const healthRef = useRef(segmentHealth);
    const detailsRef = useRef({}); // Ref to hold detailed metrics

    // 2. WEBSOCKET (Backend Connection)
    // PURPOSE: Only for Health Scores & Models (REAL DATA)
    useEffect(() => {
        const connect = () => {
            setConnectionStatus('connecting');
            const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
            const socket = new WebSocket(`${wsUrl}/ws`);

            socket.onopen = () => {
                console.log('Connected to P-Health Backend (Model Stream)');
                setConnectionStatus('connected');
                // setIsLive(true); // Don't override user control
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleBackendUpdate(data);
                } catch (e) {
                    console.error('WS Error:', e);
                }
            };

            socket.onclose = () => {
                console.log('WS Disconnected');
                setConnectionStatus('disconnected');
                // setIsLive(false); // Don't stop simulation on disconnect
                setTimeout(connect, 3000);
            };
            ws.current = socket;
        };
        connect();
        return () => { if (ws.current) ws.current.close(); };
    }, []);

    // 3. HANDLE REAL BACKEND DATA (Health Only)
    const handleBackendUpdate = (data) => {
        if (!data) return;

        // A. Update Health Scores
        if (data.system_health) {
            setSystemHealthDetails(data.system_health);
            detailsRef.current = data.system_health; // Sync Ref for Sim

            // Overall Score
            const scores = Object.values(data.system_health).map(s => s.health_score || 100);
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            setSystemHealth(avgScore);

            // Segment Mapping
            const segHealth = {};
            Object.entries(data.system_health).forEach(([seg, details]) => {
                segHealth[seg] = details.health_score || 100;
            });
            setSegmentHealth(segHealth);
            healthRef.current = segHealth; // Update ref for simulation
        }
    };

    // Ref for live status to access inside interval
    const isLiveRef = useRef(isLive);
    useEffect(() => { isLiveRef.current = isLive; }, [isLive]);

    // 4. FRONTEND SIMULATION ENGINE (The "Lively" Layer)
    // PURPOSE: Generate smooth, relevant fluid metrics (Pressure, Flow, etc.) locally.
    useEffect(() => {
        // Run every 1000ms (1s) for "Smooth" animation
        const interval = setInterval(() => {
            if (isLiveRef.current) {
                simulateFluidMetrics();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const simulateFluidMetrics = () => {
        setSensors(prevSensors => {
            const currentHealth = healthRef.current;
            const details = detailsRef.current || {};

            // --- SPATIAL PHYSICS ENGINE (CASCADE MODEL) ---
            // 1. Define Source (Pump) Conditions at Inlet
            let streamPressure = 80.0; // PSI (Source)
            let streamFlow = 355.0;    // LPM (Source)
            const streamTemp = 32.0;   // Base C

            // 2. Iterate sequentially (A -> B -> C -> D -> E) to propagate physics
            const newSensors = prevSensors.map((sensor, index) => {
                // Identify Segment
                let segmentId = 'A-B';
                if (sensor.id === 'SENSOR_B') segmentId = 'B-C';
                if (sensor.id === 'SENSOR_C') segmentId = 'C-D';
                if (sensor.id === 'SENSOR_D' || sensor.id === 'SENSOR_E') segmentId = 'D-E';

                const health = currentHealth[segmentId] || 100;

                // --- CALCULATE LOSSES FOR THIS SEGMENT ---
                // Friction Loss (Natural): 1.5 PSI per hop
                // Leak Loss (Health based): Up to 30 PSI drop if Critical
                // Flow Loss (Leak): Fluid escaping system

                function hasDriver(drv) {
                    const segDetails = details[segmentId];
                    if (!segDetails || !segDetails.drivers) return false;
                    return segDetails.drivers.some(d => d.name.toLowerCase().includes(drv));
                }

                const isCritical = health < 75;
                const isWarning = health < 90;

                // Damage Factor
                const damage = (100 - health) / 100;

                // --- DRIVER SPECIFIC PENALTIES ---
                // If it's just "Corrosion", pressure might not drop much, but Corrosion metric SPIKES.
                // If it's "Leak", pressure drops massively.

                const isLeak = hasDriver('leak') || hasDriver('failure');
                const isBlockage = hasDriver('clog') || hasDriver('buildup');
                const isCorrosion = hasDriver('corrosion');

                // Physics Constants (TUNED)
                const frictionLoss = 0.8; // Reduced from 1.2 for less punishment

                let leakPressureDrop = 0;
                let leakFlowLoss = 0;

                if (isLeak || isCritical) {
                    leakPressureDrop = damage * 25.0; // Reduced from 35
                    leakFlowLoss = damage * 40.0;     // Reduced from 60
                }

                if (isBlockage) {
                    leakPressureDrop = 0; // Pressure builds up or stays same
                    streamPressure += (damage * 5); // Slight backpressure
                }

                // Apply to Stream (State carries to next sensor)
                streamPressure = Math.max(0, streamPressure - frictionLoss - leakPressureDrop);
                streamFlow = Math.max(0, streamFlow - leakFlowLoss);

                // Vibration & Corrosion (Local)
                let targetVib = 0.02;
                if (hasDriver('vibration') || isCritical) targetVib += (damage * 0.8);
                if (isBlockage) targetVib += 0.3;

                let targetCorrosion = 0.01;
                if (isCorrosion || isCritical) targetCorrosion += (damage * 0.6);

                // Acoustic
                let targetAcoustic = 40;
                if (isLeak) targetAcoustic += (damage * 50); // Leaks are loud
                if (isBlockage) targetAcoustic += (damage * 20);

                // Status 
                let status = 'normal';
                if (isWarning) status = 'warning';
                if (isCritical) status = 'critical';

                // --- NOISE GENERATION (Alive but Smooth) ---
                const chaos = damage;
                // Reduced noise significantly for "Smooth" request
                const noiseP = (Math.random() - 0.5) * (0.8 + chaos * 3);
                const noiseF = (Math.random() - 0.5) * (2.0 + chaos * 8);
                const noiseV = Math.random() * (0.005 + chaos * 0.05);
                const noiseA = (Math.random() - 0.5) * (0.5 + chaos * 2);

                // --- SMOOTHING ALGORITHM (High Inertia) ---
                // 90% Old, 10% New -> Very slow, smooth transitions (Alive feel)
                const smooth = (prev, target) => {
                    if (!prev && prev !== 0) return target;
                    return (prev * 0.9) + (target * 0.1);
                };

                return {
                    ...sensor,
                    pressure: parseFloat(Math.max(0, smooth(sensor.pressure, streamPressure + noiseP)).toFixed(2)),
                    flow: parseFloat(Math.max(0, smooth(sensor.flow, streamFlow + noiseF)).toFixed(1)),
                    temp: parseFloat(smooth(sensor.temp, 32 + (damage * 5) + (Math.random() - 0.5)).toFixed(1)),
                    vibration: parseFloat(smooth(sensor.vibration, targetVib + noiseV).toFixed(3)),
                    acoustic: parseFloat(smooth(sensor.acoustic, targetAcoustic + noiseA).toFixed(1)),
                    corrosion: parseFloat(targetCorrosion.toFixed(4)),
                    status: status
                };
            });

            // Update History Buffer
            updateHistory(newSensors);

            return newSensors;
        });
    };

    const updateHistory = (currentSensors) => {
        setHistory(prev => {
            // Create a history entry that looks like the backend packet
            // But populated with our SIMULATED data
            const entry = {
                timestamp: new Date().toLocaleTimeString(),
                // Format for Recharts (Flattened)
                pressure: currentSensors[0].pressure, // Use Sensor A as representative for chart
                flow: currentSensors[0].flow,
                temp: currentSensors[0].temp,
                // Add specific sensors if needed
            };
            const updated = [...prev, entry];
            return updated.slice(-30); // Keep last 30 seconds
        });
    };

    // Helper: Get latest reading
    const getSensorReading = (sensorId) => {
        const sensor = sensors.find(s => s.id === sensorId);
        if (!sensor) return { pressure: 0, flow: 0, temp: 0, vibration: 0, corrosion: 0 };
        return sensor;
    };

    const runDiagnostics = async () => {
        // Toggle Logic
        if (isLive) {
            setIsLive(false);
            return 'paused';
        } else {
            // Start Sequence
            return new Promise(resolve => {
                setTimeout(() => {
                    setIsLive(true);
                    resolve('started');
                }, 6000); // 6s Delay
            });
        }
    };

    return (
        <SensorContext.Provider value={{
            sensors,
            history,
            systemHealth,
            systemHealthDetails, // Still Real
            segmentHealth,       // Still Real
            isLive,
            setIsLive,
            connectionStatus,
            runDiagnostics,
            getSensorReading
        }}>
            {children}
        </SensorContext.Provider>
    );
};
