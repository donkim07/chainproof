import {
  Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

gsap.registerPlugin(MotionPathPlugin);

@Component({
  selector: 'app-fabric-network-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-[480px] sm:h-[520px] bg-ink-950 overflow-hidden rounded-2xl border border-ink-700">
      <div class="absolute inset-0 opacity-[0.07]"
        style="background-image: linear-gradient(#17B8A6 1px, transparent 1px), linear-gradient(90deg, #17B8A6 1px, transparent 1px); background-size: 32px 32px;"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-signal-900/10 via-transparent to-ink-950 pointer-events-none"></div>

      <div class="absolute top-4 left-4 z-10">
        <div class="text-signal-400 font-mono text-xs font-semibold">ChainProof Network Pulse</div>
        <div class="text-ink-500 text-[10px] mt-0.5">channel: chainproof-ledger</div>
      </div>

      <button type="button" class="absolute top-4 right-4 z-10 btn-ghost text-[10px] border border-ink-700"
        (click)="simulateTamper()">Simulate tampering</button>

      <svg #svg class="absolute inset-0 w-full h-full" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#17B8A6" stop-opacity="0.2"/>
            <stop offset="50%" stop-color="#3DD9C6" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#17B8A6" stop-opacity="0.2"/>
          </linearGradient>
        </defs>

        <!-- Flow paths -->
        <path id="path-backend-endpoint" d="M 120 260 L 220 260" fill="none" stroke="url(#lineGrad)" stroke-width="2" class="flow-line"/>
        <path id="path-endpoint-hash" d="M 280 260 L 360 260" fill="none" stroke="url(#lineGrad)" stroke-width="2" class="flow-line"/>
        <path id="path-hash-orderer" d="M 420 260 L 500 200" fill="none" stroke="url(#lineGrad)" stroke-width="2" class="flow-line"/>
        <path id="path-orderer-peer1" d="M 540 200 L 620 140" fill="none" stroke="url(#lineGrad)" stroke-width="2" class="flow-line"/>
        <path id="path-orderer-peer2" d="M 540 200 L 620 260" fill="none" stroke="url(#lineGrad)" stroke-width="2" class="flow-line"/>
        <path id="path-orderer-peer3" d="M 540 200 L 620 380" fill="none" stroke="url(#lineGrad)" stroke-width="2" class="flow-line"/>
        <path id="path-peer-ledger" d="M 680 260 L 740 260" fill="none" stroke="url(#lineGrad)" stroke-width="2" class="flow-line"/>

        <!-- Data packet -->
        <circle id="data-packet" r="6" fill="#3DD9C6" filter="url(#glow)" opacity="0"/>

        <!-- Nodes -->
        <g class="network-node" transform="translate(80,260)">
          <rect x="-50" y="-28" width="100" height="56" rx="10" fill="#12161D" stroke="#17B8A6" stroke-width="1.5"/>
          <text text-anchor="middle" y="-4" fill="#fff" font-size="11" font-weight="600">Your Backend</text>
          <text text-anchor="middle" y="12" fill="#5B677A" font-size="9">Node.js / Go / PHP</text>
        </g>
        <g class="network-node" transform="translate(250,260)">
          <rect x="-45" y="-24" width="90" height="48" rx="8" fill="#12161D" stroke="#262E3A" stroke-width="1.5"/>
          <text text-anchor="middle" y="4" fill="#3DD9C6" font-size="10">REST Endpoint</text>
        </g>
        <g class="network-node" transform="translate(390,260)">
          <rect x="-40" y="-22" width="80" height="44" rx="8" fill="#12161D" stroke="#17B8A6" stroke-width="1.5"/>
          <text text-anchor="middle" y="4" fill="#fff" font-size="10">SHA-256 Hash</text>
        </g>
        <g class="peer-node network-node" transform="translate(520,200)">
          <polygon points="0,-30 26,15 -26,15" fill="#0B3A35" stroke="#17B8A6" stroke-width="1.5"/>
          <text text-anchor="middle" y="32" fill="#5B677A" font-size="9">Orderer</text>
        </g>
        <g class="peer-node network-node" transform="translate(650,140)">
          <circle r="22" fill="#12161D" stroke="#17B8A6" stroke-width="1.5"/>
          <text text-anchor="middle" y="4" fill="#3DD9C6" font-size="9">Peer 1</text>
        </g>
        <g class="peer-node network-node" transform="translate(650,260)">
          <circle r="22" fill="#12161D" stroke="#17B8A6" stroke-width="1.5"/>
          <text text-anchor="middle" y="4" fill="#3DD9C6" font-size="9">Peer 2</text>
        </g>
        <g class="peer-node network-node" transform="translate(650,380)">
          <circle r="22" fill="#12161D" stroke="#17B8A6" stroke-width="1.5"/>
          <text text-anchor="middle" y="4" fill="#3DD9C6" font-size="9">Peer 3</text>
        </g>
        <g class="network-node" transform="translate(760,260)">
          <rect x="-35" y="-28" width="70" height="56" rx="6" fill="#0B3A35" stroke="#17B8A6" stroke-width="2"/>
          <text text-anchor="middle" y="-2" fill="#fff" font-size="10" font-weight="600">Ledger</text>
          <text text-anchor="middle" y="14" fill="#3DD9C6" font-size="8">IMMUTABLE</text>
        </g>

        <!-- Docker hint -->
        <g transform="translate(520,420)" opacity="0.6">
          <rect x="-60" y="-16" width="120" height="32" rx="6" fill="#12161D" stroke="#262E3A"/>
          <text text-anchor="middle" y="4" fill="#5B677A" font-size="9">Docker · Fabric CA · CouchDB</text>
        </g>
      </svg>

      <div class="absolute bottom-4 right-4 w-56 rounded-lg border border-ink-700 bg-ink-900/90 p-3 font-mono text-[10px] max-h-28 overflow-hidden">
        @for (log of logs(); track $index) {
          <div class="text-ink-500 leading-relaxed" [class.text-signal-400]="$index === 0">{{ log }}</div>
        }
      </div>
    </div>
  `,
})
export class FabricNetworkVisualizerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('svg') svgRef!: ElementRef<SVGElement>;
  logs = signal<string[]>(['[init] Fabric channel ready']);
  private tl?: gsap.core.Timeline;
  private logTimer?: ReturnType<typeof setInterval>;
  tampered = false;

  ngAfterViewInit() {
    this.initAnimation();
    this.logTimer = setInterval(() => this.addLog(), 4000);
  }

  ngOnDestroy() {
    this.tl?.kill();
    if (this.logTimer) clearInterval(this.logTimer);
  }

  simulateTamper() {
    this.tampered = !this.tampered;
    const color = this.tampered ? '#F2545B' : '#17B8A6';
    gsap.to('.flow-line', { stroke: this.tampered ? '#F2545B' : 'url(#lineGrad)', duration: 0.4 });
    gsap.to('#data-packet', { fill: color, duration: 0.3 });
    this.logs.update(l => [`[${this.ts()}] ${this.tampered ? '⚠ TAMPER detected on peer-2' : '✓ Integrity restored'}`, ...l.slice(0, 4)]);
  }

  private ts() {
    return new Date().toISOString().slice(11, 19);
  }

  private addLog() {
    const msgs = [
      `Hash anchored → tx: 0x${Math.random().toString(16).slice(2, 10)}`,
      'Peer consensus reached ✓',
      'Block committed to channel',
      'Integrity verified ✓',
    ];
    this.logs.update(l => [`[${this.ts()}] ${msgs[Math.floor(Math.random() * msgs.length)]}`, ...l.slice(0, 4)]);
  }

  private initAnimation() {
    const paths = ['#path-backend-endpoint', '#path-endpoint-hash', '#path-hash-orderer',
      '#path-orderer-peer1', '#path-orderer-peer2', '#path-orderer-peer3', '#path-peer-ledger'];

    paths.forEach(sel => {
      const el = this.svgRef.nativeElement.querySelector(sel) as SVGPathElement;
      if (!el) return;
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    });

    gsap.to('.peer-node', { scale: 1.06, transformOrigin: 'center', duration: 2, yoyo: true, repeat: -1, stagger: 0.4 });

    this.tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
    const packet = '#data-packet';
    gsap.set(packet, { opacity: 1 });

    const sequence = [
      '#path-backend-endpoint', '#path-endpoint-hash', '#path-hash-orderer',
      '#path-orderer-peer1', '#path-orderer-peer2', '#path-orderer-peer3', '#path-peer-ledger',
    ];

    sequence.forEach((sel, i) => {
      const path = this.svgRef.nativeElement.querySelector(sel) as SVGPathElement;
      if (!path) return;
      this.tl!.to(path, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, i * 0.5);
      this.tl!.to(packet, {
        duration: 0.6,
        ease: 'none',
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
      }, i * 0.5);
    });

    this.tl.to(packet, { opacity: 0, duration: 0.2 });
    this.tl.to(sequence, { strokeDashoffset: (i, el) => (el as SVGPathElement).getTotalLength(), duration: 0.01 });
    this.tl.set(packet, { opacity: 1 });
  }
}
