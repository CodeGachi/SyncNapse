"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Note } from '@/lib/types';

interface Node extends d3Node {
    id: string;
    group: number;
    radius: number;
    title: string;
    type: 'student' | 'educator';
    x: number;
    y: number;
    vx: number;
    vy: number;
}

interface Link {
    source: string | Node;
    target: string | Node;
    value: number;
}

interface d3Node {
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

interface KnowledgeGraphWidgetProps {
    notes: Note[];
    className?: string;
}

export function KnowledgeGraphWidget({ notes, className }: KnowledgeGraphWidgetProps) {
    const router = useRouter();
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

    // Initialize nodes and links from props
    const { nodes, links } = useMemo(() => {
        const nodes: Node[] = notes.map(note => ({
            id: note.id,
            group: note.type === 'educator' ? 2 : 1,
            radius: 5 + Math.random() * 5, // Random size for variety
            title: note.title,
            type: note.type || 'student',
            x: 0, // Will be set randomly initially
            y: 0,
            vx: 0,
            vy: 0
        }));

        // Create some random links for visual effect if no real relationships exist yet
        // In a real app, this would be based on folder structure or tags
        const links: Link[] = [];
        if (nodes.length > 1) {
            for (let i = 0; i < nodes.length; i++) {
                // Connect to 1-2 other random nodes
                const numLinks = Math.floor(Math.random() * 2) + 1;
                for (let j = 0; j < numLinks; j++) {
                    const targetIndex = Math.floor(Math.random() * nodes.length);
                    if (targetIndex !== i) {
                        links.push({
                            source: nodes[i].id,
                            target: nodes[targetIndex].id,
                            value: 1
                        });
                    }
                }
            }
        }

        return { nodes, links };
    }, [notes]);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Physics Simulation
    useEffect(() => {
        if (dimensions.width === 0 || dimensions.height === 0 || nodes.length === 0) return;

        const canvasWidth = dimensions.width;
        const canvasHeight = dimensions.height;
        const center = { x: canvasWidth / 2, y: canvasHeight / 2 };

        // Initial random positions near center
        nodes.forEach(node => {
            if (node.x === 0 && node.y === 0) {
                node.x = center.x + (Math.random() - 0.5) * 100;
                node.y = center.y + (Math.random() - 0.5) * 100;
            }
        });

        let animationFrameId: number;

        const tick = () => {
            // 1. Repulsion (Coulomb's Law-ish)
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const nodeA = nodes[i];
                    const nodeB = nodes[j];
                    const dx = nodeB.x - nodeA.x;
                    const dy = nodeB.y - nodeA.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = -2000 / (distance * distance); // Repulsion strength

                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;

                    nodeA.vx += fx;
                    nodeA.vy += fy;
                    nodeB.vx -= fx;
                    nodeB.vy -= fy;
                }
            }

            // 2. Attraction (Springs)
            links.forEach(link => {
                const sourceNode = nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : (link.source as Node).id));
                const targetNode = nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : (link.target as Node).id));

                if (sourceNode && targetNode) {
                    const dx = targetNode.x - sourceNode.x;
                    const dy = targetNode.y - sourceNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = (distance - 100) * 0.005; // Spring constant & resting length

                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;

                    sourceNode.vx += fx;
                    sourceNode.vy += fy;
                    targetNode.vx -= fx;
                    targetNode.vy -= fy;
                }
            });

            // 3. Center Gravity
            nodes.forEach(node => {
                const dx = center.x - node.x;
                const dy = center.y - node.y;
                node.vx += dx * 0.0005;
                node.vy += dy * 0.0005;
            });

            // 4. Update Positions & Damping
            nodes.forEach(node => {
                // Mouse interaction (dragging)
                if (node.fx != null) node.x = node.fx;
                else node.x += node.vx;

                if (node.fy != null) node.y = node.fy;
                else node.y += node.vy;

                node.vx *= 0.95; // Friction
                node.vy *= 0.95;

                // Boundary constraint
                const radius = node.radius + 10;
                node.x = Math.max(radius, Math.min(canvasWidth - radius, node.x));
                node.y = Math.max(radius, Math.min(canvasHeight - radius, node.y));
            });

            // Force re-render
            if (svgRef.current) {
                // Direct DOM manipulation for performance
                const nodeElements = svgRef.current.querySelectorAll('.node-group');
                const linkElements = svgRef.current.querySelectorAll('.link-line');

                nodes.forEach((node, i) => {
                    if (nodeElements[i]) {
                        nodeElements[i].setAttribute('transform', `translate(${node.x},${node.y})`);
                    }
                });

                links.forEach((link, i) => {
                    const sourceNode = nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : (link.source as Node).id));
                    const targetNode = nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : (link.target as Node).id));

                    if (sourceNode && targetNode && linkElements[i]) {
                        linkElements[i].setAttribute('x1', String(sourceNode.x));
                        linkElements[i].setAttribute('y1', String(sourceNode.y));
                        linkElements[i].setAttribute('x2', String(targetNode.x));
                        linkElements[i].setAttribute('y2', String(targetNode.y));
                    }
                });
            }

            animationFrameId = requestAnimationFrame(tick);
        };

        tick();

        return () => cancelAnimationFrame(animationFrameId);
    }, [dimensions, nodes, links]);

    // Interaction Handlers
    const handleMouseDown = (e: React.MouseEvent, node: Node) => {
        e.stopPropagation();
        const svg = svgRef.current;
        if (!svg) return;

        const onMouseMove = (event: MouseEvent) => {
            const rect = svg.getBoundingClientRect();
            node.fx = event.clientX - rect.left;
            node.fy = event.clientY - rect.top;
        };

        const onMouseUp = () => {
            node.fx = null;
            node.fy = null;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div ref={containerRef} className={`relative w-full h-[300px] bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 ${className}`}>
            {/* Background Grid/Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#AFC02B]/5 via-transparent to-transparent opacity-50 pointer-events-none" />

            <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing">
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Links */}
                <g className="links">
                    {links.map((link, i) => (
                        <line
                            key={i}
                            className="link-line transition-opacity duration-300"
                            stroke="#575757"
                            strokeWidth="1"
                            strokeOpacity="0.4"
                        />
                    ))}
                </g>

                {/* Nodes */}
                <g className="nodes">
                    {nodes.map((node, i) => (
                        <g
                            key={node.id}
                            className="node-group transition-all duration-300"
                            onMouseDown={(e) => handleMouseDown(e, node)}
                            onMouseEnter={() => setHoveredNode(node)}
                            onMouseLeave={() => setHoveredNode(null)}
                            onClick={() => router.push(`/note/${node.type}/${node.id}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* Node Circle */}
                            <circle
                                r={node.radius}
                                fill={node.type === 'educator' ? '#AFC02B' : '#4A90D9'}
                                className="transition-all duration-300"
                                filter={hoveredNode?.id === node.id ? "url(#glow)" : ""}
                                stroke="white"
                                strokeWidth={hoveredNode?.id === node.id ? 2 : 0}
                                strokeOpacity={0.8}
                            />

                            {/* Pulse Effect for Educator Nodes */}
                            {node.type === 'educator' && (
                                <circle
                                    r={node.radius + 4}
                                    fill="none"
                                    stroke="#AFC02B"
                                    strokeWidth="1"
                                    className="animate-pulse opacity-50"
                                />
                            )}

                            {/* Label (Visible on Hover) */}
                            <g
                                className={`transition-opacity duration-200 ${hoveredNode?.id === node.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                transform={`translate(0, -${node.radius + 10})`}
                            >
                                <rect
                                    x="-50"
                                    y="-20"
                                    width="100"
                                    height="20"
                                    rx="4"
                                    fill="rgba(0,0,0,0.8)"
                                />
                                <text
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="10"
                                    dy="-6"
                                    className="font-medium"
                                >
                                    {node.title.length > 15 ? node.title.substring(0, 15) + '...' : node.title}
                                </text>
                            </g>
                        </g>
                    ))}
                </g>
            </svg>

            {/* Overlay Title */}
            <div className="absolute top-4 left-4 pointer-events-none">
                <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest">Knowledge Graph</h3>
            </div>
        </div>
    );
}
