import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { CorrelationMatrix } from '../types/index';

export function CorrelationHeatmap({ matrix }: { matrix: CorrelationMatrix }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !matrix || matrix.columns.length < 2) return;
    
    // Limpiar renderizado anterior
    containerRef.current.innerHTML = '';

    const width = 500;
    const height = 500;
    const margin = { top: 80, right: 20, bottom: 80, left: 100 };

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleBand()
      .range([0, innerWidth])
      .domain(matrix.columns)
      .padding(0.05);

    const y = d3.scaleBand()
      .range([innerHeight, 0])
      .domain(matrix.columns.slice().reverse())
      .padding(0.05);

    // Escala de color: -1 (rojo) a 0 (blanco) a 1 (azul)
    const colorScale = d3.scaleLinear<string>()
      .domain([-1, 0, 1])
      .range(["#ef4444", "#ffffff", "#3b82f6"]);

    // Eje X
    svg.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,10)rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "12px")
      .style("font-family", "sans-serif");

    // Eje Y
    svg.append("g")
      .call(d3.axisLeft(y))
      .style("font-size", "12px")
      .style("font-family", "sans-serif");

    // Aplanar matriz para D3
    const data: { x: string; y: string; value: number }[] = [];
    matrix.columns.forEach((col1, i) => {
      matrix.columns.forEach((col2, j) => {
        data.push({
          x: col1,
          y: col2,
          value: matrix.values[i][j]
        });
      });
    });

    // Celdas del heatmap
    svg.selectAll()
      .data(data, (d: any) => d.x + ':' + d.y)
      .enter()
      .append("rect")
      .attr("x", d => x(d.x)!)
      .attr("y", d => y(d.y)!)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => colorScale(d.value))
      .style("stroke-width", 1)
      .style("stroke", "#e5e7eb")
      .style("rx", 4)
      .style("ry", 4)
      .append("title")
      .text(d => `${d.x} & ${d.y}\nCorrelación: ${d.value.toFixed(2)}`);

    // Añadir texto si la grilla no es muy densa
    if (matrix.columns.length <= 10) {
      svg.selectAll()
        .data(data, (d: any) => d.x + ':' + d.y)
        .enter()
        .append("text")
        .attr("x", d => x(d.x)! + x.bandwidth() / 2)
        .attr("y", d => y(d.y)! + y.bandwidth() / 2)
        .style("text-anchor", "middle")
        .style("dominant-baseline", "central")
        .style("font-size", "11px")
        .style("font-family", "sans-serif")
        .style("fill", d => Math.abs(d.value) > 0.5 ? "white" : "#374151")
        .text(d => d.value.toFixed(2));
    }

  }, [matrix]);

  return <div ref={containerRef} className="flex justify-center overflow-x-auto w-full" />;
}
