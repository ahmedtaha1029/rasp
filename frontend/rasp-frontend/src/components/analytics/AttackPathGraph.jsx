// frontend/src/components/analytics/AttackPathGraph.jsx
//
//             forceX returned `undefined` for non-stage nodes.
//             D3 treats undefined as NaN and propagates it through every
//             simulation tick, causing all x1/y1/x2/y2 and transform attrs
//             to become NaN. Fixed by always returning a numeric fallback
//             (width / 2) and relying on strength(0) to keep it inert for
//             vector nodes — the value is never applied but must be finite.
//
//             Replaced hardcoded `background: "white"` / `fill: "#374151"`
//             with CSS custom property equivalents so the graph respects
//             the app's light/dark theme tokens.

import React, { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { analyticsApi } from "../../api/index"

const GRAPH_HEIGHT = 440

export default function AttackPathGraph({ scenarioId, onNodeSelect }) {
  const svgRef                    = useRef(null)
  const [graphData, setGraphData] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [tooltip,   setTooltip]   = useState({ visible: false, x: 0, y: 0, node: null })

  // ── Fetch graph data via shared axios instance (auth header included) ──
  useEffect(() => {
    if (!scenarioId) return
    setLoading(true)
    setError(null)
    setGraphData(null)
    analyticsApi.attackGraph(scenarioId)
      .then(r  => setGraphData(r.data))
      .catch(err => setError(err.response?.data?.detail ?? "Failed to load graph."))
      .finally(() => setLoading(false))
  }, [scenarioId])

  // ── Render / re-render D3 graph whenever data changes ──
  useEffect(() => {
    if (!graphData || !svgRef.current) return

    const { nodes, edges } = graphData
    const width      = svgRef.current.clientWidth || 700
    const stageCount = nodes.filter(n => n.type === "stage").length

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3.select(svgRef.current)
      .attr("width",  width)
      .attr("height", GRAPH_HEIGHT)

    const g = svg.append("g")

    // Zoom + pan
    svg.call(
      d3.zoom()
        .scaleExtent([0.4, 2.5])
        .on("zoom", (event) => g.attr("transform", event.transform))
    )

    // Arrowhead marker
    svg.append("defs").append("marker")
      .attr("id",          "arrowhead")
      .attr("viewBox",     "-0 -5 10 10")
      .attr("refX",        22)
      .attr("refY",        0)
      .attr("orient",      "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight",6)
      .append("path")
      .attr("d",    "M 0,-5 L 10,0 L 0,5")
      .attr("fill", "#94a3b8")

    // Clone nodes/edges so D3 can mutate positions without touching original state
    const simNodes = nodes.map(n => ({ ...n }))
    const simEdges = edges.map(e => ({ ...e }))

    // ── Force simulation ──────────────────────────────────────────────────
    //
    // Fix NaN: forceX MUST always return a finite number.
    // Returning `undefined` (previous code) causes D3 to compute NaN for the
    // x-component of every affected node, which then propagates through
    // forceLink to all connected nodes and poisons every coordinate.
    //
    // The fix: return width/2 as a neutral fallback for vector nodes and
    // keep strength(0) so the force has zero effect — a finite target that
    // is never applied is harmless; an undefined target breaks everything.
    const simulation = d3.forceSimulation(simNodes)
      .force("link",
        d3.forceLink(simEdges)
          .id(d => d.id)
          .distance(d => d.type === "leads_to" ? 160 : 80)
          .strength(0.8)
      )
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center",    d3.forceCenter(width / 2, GRAPH_HEIGHT / 2))
      .force("collision", d3.forceCollide().radius(d => d.size + 10))
      .force("x",
        d3.forceX()
          .x(d => {
            // Stage nodes are pinned across the horizontal axis by their order.
            // Vector nodes use width/2 as a finite neutral value — strength is 0
            // so this target is never applied, but it must not be undefined/NaN.
            if (d.type === "stage") {
              return (d.stage_order / (stageCount + 1)) * width
            }
            return width / 2   // ← Fix NaN: was `undefined`
          })
          .strength(d => d.type === "stage" ? 0.3 : 0)
      )

    // ── Edges ─────────────────────────────────────────────────────────────
    const link = g.append("g").selectAll("line")
      .data(simEdges)
      .join("line")
      .attr("stroke",          d => d.type === "leads_to" ? "#94a3b8" : "#cbd5e1")
      .attr("stroke-width",    d => d.type === "leads_to" ? 2 : 1)
      .attr("stroke-dasharray",d => d.type === "has_vector" ? "4,3" : null)
      .attr("marker-end",      d => d.type === "leads_to" ? "url(#arrowhead)" : null)
      .attr("opacity", 0.7)

    // ── Nodes ─────────────────────────────────────────────────────────────
    const node = g.append("g").selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on("drag",  (event, d) => { d.fx = event.x; d.fy = event.y })
          .on("end",   (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )
      .on("click",      (event, d) => { event.stopPropagation(); onNodeSelect?.(d.id) })
      .on("mouseenter", (event, d) => setTooltip({ visible: true, x: event.pageX, y: event.pageY, node: d }))
      .on("mouseleave", ()          => setTooltip(t => ({ ...t, visible: false })))

    // Circle
    node.append("circle")
      .attr("r",            d => d.size)
      .attr("fill",         d => d.color)
      .attr("fill-opacity", 0.85)
      .attr("stroke",       "var(--color-surface, #ffffff)")
      .attr("stroke-width", 2.5)

    // Detection rate % inside node
    node.append("text")
      .attr("text-anchor",   "middle")
      .attr("dy",            d => d.type === "stage" ? "0.2em" : "0.35em")
      .attr("font-size",     d => d.type === "stage" ? 11 : 8)
      .attr("font-weight",   "700")
      .attr("fill",          "white")
      .attr("pointer-events","none")
      .text(d => `${Math.round(d.detection_rate * 100)}%`)

    // Label below node
    node.append("text")
      .attr("text-anchor",   "middle")
      .attr("y",             d => d.size + 13)
      .attr("font-size",     d => d.type === "stage" ? 11 : 9)
      .attr("font-weight",   d => d.type === "stage" ? "700" : "500")
      .attr("fill",          "var(--color-text-primary, #374151)")
      .attr("pointer-events","none")
      .text(d => d.label.length > 18 ? d.label.slice(0, 16) + "…" : d.label)

    // MITRE tag below vector nodes
    node.filter(d => d.type === "vector" && d.mitre_id)
      .append("text")
      .attr("text-anchor",   "middle")
      .attr("y",             d => d.size + 24)
      .attr("font-size",     8)
      .attr("fill",          "var(--color-text-muted, #6b7280)")
      .attr("font-family",   "monospace")
      .attr("pointer-events","none")
      .text(d => d.mitre_id)

    // ── Tick ──────────────────────────────────────────────────────────────
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
      node.attr("transform", d => `translate(${d.x},${d.y})`)
    })

    return () => simulation.stop()
  }, [graphData, onNodeSelect])

  // ── Loading / error states ────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 24, color: "var(--color-text-muted, #6b7280)", fontSize: 13 }}>
        Loading attack graph…
      </div>
    )
  }
  if (error) {
    return (
      <div style={{ padding: 24, color: "#dc2626", fontSize: 13 }}>
        Error: {error}
      </div>
    )
  }

  return (
    <div style={{
      position:     "relative",
      background:   "var(--color-surface, #ffffff)",   // ← Fix BG: was hardcoded "white"
      borderRadius: 12,
      border:       "1px solid var(--color-border, #e5e7eb)",
      overflow:     "hidden",
    }}>
      {/* Legend bar */}
      <div style={{
        padding:      "12px 16px",
        borderBottom: "1px solid var(--color-border, #f0f0f0)",
        display:      "flex",
        gap:          16,
        alignItems:   "center",
        background:   "var(--color-surface-2, var(--color-surface, #f9fafb))",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary, #111)" }}>
          Attack Path — {graphData?.scenario_title}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            ["#22c55e", "≥70% detected"],
            ["#eab308", "40–70%"],
            ["#ef4444", "<40% detected"],
          ].map(([color, label]) => (
            <div key={color} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--color-text-muted, #6b7280)" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
              {label}
            </div>
          ))}
          <div style={{ fontSize: 11, color: "var(--color-text-muted, #9ca3af)" }}>
            Drag nodes · Scroll to zoom
          </div>
        </div>
      </div>

      {/* D3 canvas */}
      <svg ref={svgRef} style={{ width: "100%", display: "block" }} />

      {/* Hover tooltip */}
      {tooltip.visible && tooltip.node && (
        <div style={{
          position:   "fixed",
          left:       tooltip.x + 12,
          top:        tooltip.y - 10,
          background: "var(--color-surface, #ffffff)",
          border:     "1px solid var(--color-border, #e5e7eb)",
          borderRadius: 8,
          padding:    "10px 14px",
          boxShadow:  "0 4px 16px rgba(0,0,0,0.12)",
          zIndex:     1000,
          pointerEvents: "none",
          minWidth:   180,
          fontSize:   12,
        }}>
          <div style={{ fontWeight: 700, color: "var(--color-text-primary, #111)", marginBottom: 6 }}>
            {tooltip.node.label}
          </div>
          {tooltip.node.mitre_id && (
            <div style={{ color: "var(--color-text-muted, #6b7280)", fontFamily: "monospace", marginBottom: 4 }}>
              {tooltip.node.mitre_id}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--color-text-muted, #6b7280)" }}>Detection rate:</span>
            <span style={{ fontWeight: 600, color: tooltip.node.color }}>
              {(tooltip.node.detection_rate * 100).toFixed(1)}%
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--color-text-muted, #6b7280)" }}>Attempts:</span>
            <span style={{ fontWeight: 600 }}>{tooltip.node.total_attempts}</span>
          </div>
          {tooltip.node.avg_time_ms > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "var(--color-text-muted, #6b7280)" }}>Avg time:</span>
              <span style={{ fontWeight: 600 }}>{(tooltip.node.avg_time_ms / 1000).toFixed(1)}s</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}