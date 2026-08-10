import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { BirthRecord } from '../types';

interface RegistrationVelocityAnalyticsProps {
  records: BirthRecord[];
  onOpenZkModal?: (record: BirthRecord) => void;
}

interface VelocityTimePoint {
  dateKey: string; // YYYY-MM-DD or YYYY-MM-DD HH:00
  date: Date;
  count: number;
  facilityCounts: Record<string, number>;
  mean: number;
  stdDev: number;
  zScore: number;
  isSpike: boolean;
  topFacility: string;
  topFacilityCount: number;
}

interface FacilityMetric {
  facilityId: string;
  facilityName: string;
  count: number;
  percentage: number;
  latestRegistration: string;
  isSpikeFacility: boolean;
}

export const RegistrationVelocityAnalytics: React.FC<RegistrationVelocityAnalyticsProps> = ({
  records,
  onOpenZkModal
}) => {
  const lineChartRef = useRef<SVGSVGElement | null>(null);
  const barChartRef = useRef<SVGSVGElement | null>(null);

  // Controls
  const [threshold, setThreshold] = useState<number>(2.0); // Z-score threshold
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<'ALL' | '7D' | '30D'>('ALL');
  const [hoveredPoint, setHoveredPoint] = useState<VelocityTimePoint | null>(null);
  const [simulatedRecords, setSimulatedRecords] = useState<BirthRecord[]>([]);

  // Action status for flagged alerts
  const [flaggedActions, setFlaggedActions] = useState<Record<string, 'AUDIT_REQUESTED' | 'DISMISSED' | 'VERIFIED'>>({});

  // Merge base records + simulated surge records
  const allRecords = useMemo(() => {
    return [...simulatedRecords, ...records];
  }, [records, simulatedRecords]);

  // Extract unique facilities
  const facilityList = useMemo(() => {
    const map = new Map<string, string>();
    allRecords.forEach(r => {
      if (r.facilityId && r.facilityName) {
        map.set(r.facilityId, r.facilityName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allRecords]);

  // Filter records by facility & time range
  const filteredRecords = useMemo(() => {
    let list = allRecords;

    if (selectedFacility !== 'ALL') {
      list = list.filter(r => r.facilityId === selectedFacility);
    }

    if (timeRange !== 'ALL') {
      const now = new Date().getTime();
      const days = timeRange === '7D' ? 7 : 30;
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      list = list.filter(r => new Date(r.createdAt || r.dateOfBirth).getTime() >= cutoff);
    }

    return list;
  }, [allRecords, selectedFacility, timeRange]);

  // Compute Time Series Velocity Aggregation
  const velocityData = useMemo<VelocityTimePoint[]>(() => {
    if (filteredRecords.length === 0) return [];

    // Group records by Date (YYYY-MM-DD)
    const groups: Record<string, { date: Date; count: number; facilityCounts: Record<string, number> }> = {};

    filteredRecords.forEach(r => {
      const d = new Date(r.createdAt || r.dateOfBirth);
      // Group by day for clean velocity curve
      const key = d.toISOString().split('T')[0];

      if (!groups[key]) {
        // Normalize time to start of day
        const dayDate = new Date(key + 'T00:00:00.000Z');
        groups[key] = { date: dayDate, count: 0, facilityCounts: {} };
      }

      groups[key].count += 1;
      const facName = r.facilityName || r.facilityId || 'Unknown Facility';
      groups[key].facilityCounts[facName] = (groups[key].facilityCounts[facName] || 0) + 1;
    });

    const points = Object.entries(groups)
      .map(([dateKey, val]) => {
        let topFacility = 'N/A';
        let topFacilityCount = 0;
        Object.entries(val.facilityCounts).forEach(([fac, cnt]) => {
          if (cnt > topFacilityCount) {
            topFacilityCount = cnt;
            topFacility = fac;
          }
        });

        return {
          dateKey,
          date: val.date,
          count: val.count,
          facilityCounts: val.facilityCounts,
          mean: 0,
          stdDev: 0,
          zScore: 0,
          isSpike: false,
          topFacility,
          topFacilityCount
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (points.length === 0) return [];

    // Calculate Mean & Standard Deviation
    const counts = points.map(p => p.count);
    const mean = d3.mean(counts) || 0;
    const stdDev = d3.deviation(counts) || 1; // avoid divide by zero

    return points.map(p => {
      const zScore = stdDev > 0 ? (p.count - mean) / stdDev : 0;
      const isSpike = zScore >= threshold && p.count >= 3;
      return {
        ...p,
        mean,
        stdDev,
        zScore,
        isSpike
      };
    });
  }, [filteredRecords, threshold]);

  // Compute Facility Level Distribution Metrics
  const facilityMetrics = useMemo<FacilityMetric[]>(() => {
    const counts: Record<string, { name: string; count: number; latest: string; isSpike: boolean }> = {};
    const total = filteredRecords.length;

    filteredRecords.forEach(r => {
      const id = r.facilityId || 'UNKNOWN';
      const name = r.facilityName || id;
      const time = r.createdAt || r.dateOfBirth;

      if (!counts[id]) {
        counts[id] = { name, count: 0, latest: time, isSpike: false };
      }
      counts[id].count += 1;
      if (new Date(time) > new Date(counts[id].latest)) {
        counts[id].latest = time;
      }
    });

    // Check if facility is part of any detected spikes
    velocityData.filter(v => v.isSpike).forEach(spike => {
      Object.keys(spike.facilityCounts).forEach(facName => {
        Object.values(counts).forEach(c => {
          if (c.name === facName) c.isSpike = true;
        });
      });
    });

    return Object.entries(counts)
      .map(([facilityId, val]) => ({
        facilityId,
        facilityName: val.name,
        count: val.count,
        percentage: total > 0 ? (val.count / total) * 100 : 0,
        latestRegistration: val.latest,
        isSpikeFacility: val.isSpike
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords, velocityData]);

  // Identified Spike Anomaly Points
  const detectedSpikes = useMemo(() => {
    return velocityData.filter(p => p.isSpike);
  }, [velocityData]);

  // Inject Simulated Spike Burst
  const handleSimulateSurge = () => {
    const surgeTime = new Date().toISOString();
    const newSurgeRecords: BirthRecord[] = Array.from({ length: 8 }).map((_, idx) => ({
      id: `REG-SURGE-${Date.now().toString().slice(-4)}-${idx}`,
      childTempId: `TMP-SURGE-${idx}`,
      childFirstName: `SurgeChild${idx + 1}`,
      childLastName: `Cluster${idx + 1}`,
      dateOfBirth: surgeTime,
      timeOfBirth: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      placeOfBirth: 'Hospital',
      facilityName: 'Harlem Health Hub',
      facilityId: 'FAC-NY-4409',
      gender: idx % 2 === 0 ? 'Male' : 'Female',
      birthWeightGrams: 3200 + idx * 50,
      gestationalAgeWeeks: 39,
      apgar1Min: 9,
      apgar5Min: 10,
      birthType: 'Single',
      motherNationalId: `NAT-SURGE-990${idx}`,
      motherLegalName: `Simulated Mother ${idx + 1}`,
      attendingPhysicianName: 'Dr. James Rivera, MD',
      attendingPhysicianLicense: 'MD-LIC-55102',
      signatures: {
        physicianSignature: `0xsig_surge_doc_${idx}`,
        physicianPublicKey: '0xpub_surge_doc',
        hospitalSignature: `0xsig_surge_hosp_${idx}`,
        hospitalPublicKey: '0xpub_surge_hosp',
        timestamp: surgeTime
      },
      status: 'Pending_Registrar_Seal',
      zkProof: {
        birthHash: `0xbirth_hash_surge_${Date.now()}_${idx}`,
        proofHash: `0xzk_surge_proof_${idx}`,
        publicInputs: {
          motherNationalIdHash: `0xmother_hash_surge_${idx}`,
          facilityId: 'FAC-NY-4409',
          yearOfBirth: 2026,
          jurisdictionCode: 'US-NY-CIVIL-DEPT'
        },
        verified: true,
        generatedAt: surgeTime
      },
      ipfsCid: `bafybeisurgecid${idx}`,
      encryptedPayload: 'AES256-GCM::SIMULATED_SURGE_PAYLOAD',
      createdAt: surgeTime,
      updatedAt: surgeTime,
      syncState: 'Synced'
    }));

    setSimulatedRecords(prev => [...newSurgeRecords, ...prev]);
  };

  // -------------------------------------------------------------
  // D3 LINE CHART RENDERING
  // -------------------------------------------------------------
  useEffect(() => {
    if (!lineChartRef.current || velocityData.length === 0) return;

    const svg = d3.select(lineChartRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const margin = { top: 30, right: 30, bottom: 40, left: 50 };
    const width = lineChartRef.current.clientWidth - margin.left - margin.right;
    const height = 260 - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale (Date)
    const x = d3
      .scaleTime()
      .domain(d3.extent<VelocityTimePoint, Date>(velocityData, d => d.date) as [Date, Date])
      .range([0, width]);

    // Y Scale (Count)
    const maxCount = d3.max<VelocityTimePoint, number>(velocityData, d => d.count) || 5;
    const y = d3
      .scaleLinear()
      .domain([0, Math.max(maxCount + 2, 8)])
      .nice()
      .range([height, 0]);

    // Color Gradients
    const defs = svg.append('defs');

    // Area Gradient
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'velocity-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ba8c63').attr('stop-opacity', 0.4);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#ba8c63').attr('stop-opacity', 0.0);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .ticks(Math.min(velocityData.length, 6))
          .tickFormat(d => d3.timeFormat('%b %d')(d as Date))
      )
      .attr('color', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .attr('color', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Horizontal Grid Lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .attr('stroke', '#334155')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.4);

    // D3 Area Path
    const area = d3
      .area<VelocityTimePoint>()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(d.count))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(velocityData)
      .attr('fill', 'url(#velocity-area-gradient)')
      .attr('d', area);

    // D3 Line Path
    const line = d3
      .line<VelocityTimePoint>()
      .x(d => x(d.date))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(velocityData)
      .attr('fill', 'none')
      .attr('stroke', '#c19c76')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Threshold Line (Mean + threshold * stdDev)
    if (velocityData.length > 0) {
      const meanVal = velocityData[0].mean;
      const stdDevVal = velocityData[0].stdDev;
      const thresholdCount = meanVal + threshold * stdDevVal;

      if (thresholdCount <= maxCount + 2) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', width)
          .attr('y1', y(thresholdCount))
          .attr('y2', y(thresholdCount))
          .attr('stroke', '#f43f5e')
          .attr('stroke-dasharray', '5,5')
          .attr('stroke-width', 1.5);

        g.append('text')
          .attr('x', width - 10)
          .attr('y', y(thresholdCount) - 6)
          .attr('text-anchor', 'end')
          .attr('fill', '#f43f5e')
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .text(`Spike Threshold (${threshold.toFixed(1)}σ: ${thresholdCount.toFixed(1)} reg/day)`);
      }
    }

    // Data Circles & Pulsing Alert Rings for Spikes
    velocityData.forEach(d => {
      const cx = x(d.date);
      const cy = y(d.count);

      if (d.isSpike) {
        // Outer Pulsing Red Ring for Anomaly
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 12)
          .attr('fill', 'none')
          .attr('stroke', '#f43f5e')
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.8)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '8;16;8')
          .attr('dur', '2s')
          .attr('repeatCount', 'indefinite');

        // Warning Badge Icon Anchor
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 6)
          .attr('fill', '#f43f5e')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);

        // Callout Text
        g.append('text')
          .attr('x', cx)
          .attr('y', cy - 16)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fb7185')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'sans-serif')
          .text(`⚡ +${d.zScore.toFixed(1)}σ Surge`);
      } else {
        // Normal Node Circle
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 4)
          .attr('fill', '#cbac88')
          .attr('stroke', '#0f172a')
          .attr('stroke-width', 1.5);
      }

      // Invisible Hover Capture Target
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 16)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredPoint(d))
        .on('mouseleave', () => setHoveredPoint(null));
    });

  }, [velocityData, threshold]);

  // -------------------------------------------------------------
  // D3 FACILITY DISTRIBUTION BAR CHART RENDERING
  // -------------------------------------------------------------
  useEffect(() => {
    if (!barChartRef.current || facilityMetrics.length === 0) return;

    const svg = d3.select(barChartRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 160 };
    const width = barChartRef.current.clientWidth - margin.left - margin.right;
    const height = Math.max(facilityMetrics.length * 32, 140) - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Y Scale (Facility Names)
    const y = d3
      .scaleBand()
      .domain(facilityMetrics.map(d => d.facilityName))
      .range([0, height])
      .padding(0.25);

    // X Scale (Count)
    const maxFacCount = d3.max<FacilityMetric, number>(facilityMetrics, d => d.count) || 5;
    const x = d3
      .scaleLinear()
      .domain([0, maxFacCount + 1])
      .nice()
      .range([0, width]);

    // Y Axis (Facility Names)
    g.append('g')
      .call(d3.axisLeft(y))
      .attr('color', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-family', 'sans-serif')
      .selectAll('text')
      .style('text-anchor', 'end');

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5))
      .attr('color', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Bars
    g.selectAll('.bar')
      .data<FacilityMetric>(facilityMetrics)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('y', (d: FacilityMetric) => y(d.facilityName) || 0)
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', (d: FacilityMetric) => x(d.count))
      .attr('rx', 4)
      .attr('fill', (d: FacilityMetric) => (d.isSpikeFacility ? '#f43f5e' : '#ba8c63'))
      .attr('opacity', 0.85);

    // Value Labels on Bars
    g.selectAll('.label')
      .data<FacilityMetric>(facilityMetrics)
      .enter()
      .append('text')
      .attr('x', (d: FacilityMetric) => x(d.count) + 8)
      .attr('y', (d: FacilityMetric) => (y(d.facilityName) || 0) + y.bandwidth() / 2 + 3)
      .attr('fill', (d: FacilityMetric) => (d.isSpikeFacility ? '#fb7185' : '#cbd5e1'))
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text((d: FacilityMetric) => `${d.count} (${d.percentage.toFixed(0)}%) ${d.isSpikeFacility ? '⚠️ SPIKE' : ''}`);

  }, [facilityMetrics]);

  return (
    <div className="space-y-6">
      {/* Visual Analytics Header Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-medium border border-blue-500/30">
                D3.JS GRAPHICAL ENGINE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-medium border border-emerald-500/30 flex items-center gap-1">
                Real-Time Velocity Stream
              </span>
            </div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Birth Registration Velocity & Geographic Surge Audit
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated statistical velocity profiling and zero-knowledge spatial surge detection across regional facilities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSimulateSurge}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer transition-all active:scale-95"
            >
              Simulate Registration Surge
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-2">
          {/* Sensitivity Slider */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono flex items-center gap-1">
                Spike Threshold (Z-Score σ):
              </span>
              <span className="text-amber-400 font-bold font-mono text-sm">{threshold.toFixed(1)}σ</span>
            </div>
            <input
              type="range"
              min="1.2"
              max="3.5"
              step="0.1"
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1.2σ (Sensitive)</span>
              <span>2.0σ (Standard)</span>
              <span>3.5σ (Strict)</span>
            </div>
          </div>

          {/* Facility Filter */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <label className="text-xs text-slate-400 font-mono block flex items-center gap-1">
              Geographic Facility Node:
            </label>
            <select
              value={selectedFacility}
              onChange={e => setSelectedFacility(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Regional Facilities ({facilityList.length} Nodes)</option>
              {facilityList.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
              ))}
            </select>
          </div>

          {/* Time Window */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <label className="text-xs text-slate-400 font-mono block flex items-center gap-1">
              Time Horizon:
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['ALL', '30D', '7D'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    timeRange === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'ALL' ? 'All Time' : t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1 shadow-lg">
          <span className="text-xs text-slate-400 font-mono block">TOTAL ANALYZED RECORDS</span>
          <span className="text-2xl font-bold font-mono text-white block">{filteredRecords.length}</span>
          <span className="text-[11px] text-slate-500">Across {facilityList.length} registered health nodes</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1 shadow-lg">
          <span className="text-xs text-slate-400 font-mono block">BASELINE MEAN VELOCITY</span>
          <span className="text-2xl font-bold font-mono text-indigo-400 block">
            {(velocityData[0]?.mean || 0).toFixed(1)} <span className="text-xs text-slate-400">reg/day</span>
          </span>
          <span className="text-[11px] text-slate-500">Standard deviation ±{(velocityData[0]?.stdDev || 0).toFixed(1)}</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1 shadow-lg">
          <span className="text-xs text-slate-400 font-mono block">ANOMALOUS SURGES DETECTED</span>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold font-mono ${
              detectedSpikes.length > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {detectedSpikes.length}
            </span>
            {detectedSpikes.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold border border-rose-500/30">
                ⚠️ SURGE ALERT
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">Exceeding {threshold.toFixed(1)}σ statistical cutoff</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1 shadow-lg">
          <span className="text-xs text-slate-400 font-mono block font-sans">MOST ACTIVE FACILITY</span>
          <span className="text-sm font-bold text-emerald-400 truncate block">
            {facilityMetrics[0]?.facilityName || 'N/A'}
          </span>
          <span className="text-[11px] text-slate-500">
            {facilityMetrics[0]?.count || 0} registrations ({facilityMetrics[0]?.percentage.toFixed(0) || 0}% total)
          </span>
        </div>
      </div>

      {/* Main D3 Registration Velocity Timeline Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-white">D3 Registration Velocity Curve & Surge Detection</h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Line: Daily Registrations • Dashed Red: Threshold ({threshold.toFixed(1)}σ)
          </span>
        </div>

        {/* Hover Inspector Tooltip */}
        {hoveredPoint && (
          <div className="p-3 bg-slate-950/90 border border-indigo-500/50 rounded-xl text-xs font-mono text-slate-200 shadow-2xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
            <div>
              <span className="text-slate-400 block">WINDOW DATE</span>
              <strong className="text-white text-sm">{hoveredPoint.dateKey}</strong>
            </div>

            <div>
              <span className="text-slate-400 block">REGISTRATIONS</span>
              <strong className="text-indigo-300 text-sm">{hoveredPoint.count} records</strong>
            </div>

            <div>
              <span className="text-slate-400 block">Z-SCORE RATING</span>
              <strong className={hoveredPoint.zScore >= threshold ? 'text-rose-400 text-sm' : 'text-emerald-400 text-sm'}>
                {hoveredPoint.zScore > 0 ? `+${hoveredPoint.zScore.toFixed(2)}σ` : `${hoveredPoint.zScore.toFixed(2)}σ`}
              </strong>
            </div>

            <div>
              <span className="text-slate-400 block">PRIMARY FACILITY</span>
              <span className="text-amber-300">{hoveredPoint.topFacility} ({hoveredPoint.topFacilityCount})</span>
            </div>
          </div>
        )}

        {/* SVG Container */}
        <div className="w-full overflow-hidden">
          <svg ref={lineChartRef} className="w-full h-[260px] overflow-visible"></svg>
        </div>
      </div>

      {/* D3 Facility Geographic Volume Distribution & Anomaly Audit List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Node Distribution Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <h4 className="text-base font-bold text-white">Geographic Node Distribution (Registrations by Facility)</h4>
          </div>
          <p className="text-xs text-slate-400">
            Horizontal D3 chart ranking facility volume. Highlighted red bars denote node facilities experiencing flagged registration spikes.
          </p>

          <div className="w-full overflow-x-auto">
            <svg ref={barChartRef} className="w-full min-h-[160px]"></svg>
          </div>
        </div>

        {/* Flagged Anomaly Audit Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-white">Flagged Geographic Spike Audit Trail</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono font-bold">
              {detectedSpikes.length} Anomalies
            </span>
          </div>

          {detectedSpikes.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-slate-500 font-mono text-xs">
              <p className="text-slate-300 font-semibold">No anomalous geographic spikes detected</p>
              <p>Registration rates across all facilities are within normal statistical expectations (&lt; {threshold.toFixed(1)}σ).</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {detectedSpikes.map((spike, idx) => {
                const actionState = flaggedActions[spike.dateKey];

                return (
                  <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-rose-900/50 space-y-3 font-mono text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                          ⚡ +{spike.zScore.toFixed(1)}σ SURGE
                        </span>
                        <strong className="text-white">{spike.dateKey}</strong>
                      </div>
                      <span className="text-slate-400">{spike.count} Registrations</span>
                    </div>

                    <div className="text-slate-300 text-[11px] space-y-1">
                      <div>Primary Surge Facility: <strong className="text-amber-300">{spike.topFacility}</strong> ({spike.topFacilityCount} records)</div>
                      <div>Expected Baseline: <span className="text-slate-400">{spike.mean.toFixed(1)} reg/day</span></div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      {actionState === 'AUDIT_REQUESTED' ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          Flagged for State Verification Audit
                        </span>
                      ) : actionState === 'VERIFIED' ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          ZK Proofs Verified Legitimate
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setFlaggedActions(prev => ({ ...prev, [spike.dateKey]: 'AUDIT_REQUESTED' }))}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                          >
                            Flag for Investigation
                          </button>
                          <button
                            onClick={() => setFlaggedActions(prev => ({ ...prev, [spike.dateKey]: 'VERIFIED' }))}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          >
                            Mark Verified
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
