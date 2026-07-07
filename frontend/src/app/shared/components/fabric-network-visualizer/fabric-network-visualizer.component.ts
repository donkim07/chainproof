import {
  Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

gsap.registerPlugin(MotionPathPlugin);

const PATH_NODES: Record<string, string> = {
  '#path-backend-endpoint': '#node-backend',
  '#path-endpoint-hash': '#node-endpoint',
  '#path-hash-orderer': '#node-hash',
  '#path-orderer-peer1': '#node-orderer',
  '#path-orderer-peer2': '#node-orderer',
  '#path-orderer-peer3': '#node-orderer',
  '#path-peer-ledger': '#node-ledger',
};

@Component({
  selector: 'app-fabric-network-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-[min(88vw,440px)] sm:h-[480px] lg:h-[520px] bg-ink-950 overflow-hidden rounded-2xl border border-ink-700 shadow-2xl shadow-black/40">
      <div class="absolute inset-0 opacity-[0.07]"
        style="background-image: linear-gradient(#17B8A6 1px, transparent 1px), linear-gradient(90deg, #17B8A6 1px, transparent 1px); background-size: 32px 32px;"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-signal-900/10 via-transparent to-ink-950 pointer-events-none"></div>

      <div class="absolute top-0 left-0 right-0 z-10 flex items-start justify-between gap-2 p-3 sm:p-4 pointer-events-none">
        <div class="pointer-events-auto min-w-0">
          <div class="text-signal-400 font-mono text-xs font-semibold">ChainProof Network Pulse</div>
          <div class="text-ink-500 text-[10px] mt-0.5">channel: chainproof-ledger</div>
        </div>
        <button type="button" class="pointer-events-auto shrink-0 btn-ghost text-[9px] sm:text-[10px] border border-ink-700 px-2 py-1"
          (click)="simulateTamper()">Simulate tampering</button>
      </div>

      <svg #svg class="absolute inset-0 w-full h-full" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
            <feGaussianBlur stdDeviation="2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="packetGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#17B8A6" stop-opacity="0.15"/>
            <stop offset="50%" stop-color="#3DD9C6" stop-opacity="1"/>
            <stop offset="100%" stop-color="#17B8A6" stop-opacity="0.15"/>
          </linearGradient>
          <linearGradient id="lineDim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#17B8A6" stop-opacity="0.08"/>
            <stop offset="50%" stop-color="#17B8A6" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#17B8A6" stop-opacity="0.08"/>
          </linearGradient>
        </defs>

        <path id="path-backend-endpoint" d="M 120 260 L 220 260" fill="none" stroke="url(#lineDim)" stroke-width="2.5" class="flow-line"/>
        <path id="path-endpoint-hash" d="M 280 260 L 360 260" fill="none" stroke="url(#lineDim)" stroke-width="2.5" class="flow-line"/>
        <path id="path-hash-orderer" d="M 420 260 L 500 200" fill="none" stroke="url(#lineDim)" stroke-width="2.5" class="flow-line"/>
        <path id="path-orderer-peer1" d="M 540 200 L 620 140" fill="none" stroke="url(#lineDim)" stroke-width="2.5" class="flow-line"/>
        <path id="path-orderer-peer2" d="M 540 200 L 620 260" fill="none" stroke="url(#lineDim)" stroke-width="2.5" class="flow-line"/>
        <path id="path-orderer-peer3" d="M 540 200 L 620 380" fill="none" stroke="url(#lineDim)" stroke-width="2.5" class="flow-line"/>
        <path id="path-peer-ledger" d="M 680 260 L 740 260" fill="none" stroke="url(#lineDim)" stroke-width="2.5" class="flow-line"/>

        <circle id="data-packet" r="7" fill="#3DD9C6" filter="url(#packetGlow)" opacity="0"/>

        <g id="node-backend" class="network-node" transform="translate(80,260)" filter="url(#nodeGlow)">
          <rect x="-50" y="-28" width="100" height="56" rx="10" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="node-body"/>
          <text text-anchor="middle" y="-4" fill="#fff" font-size="11" font-weight="600">Your Backend</text>
          <text text-anchor="middle" y="12" fill="#5B677A" font-size="9">Node.js / Go / PHP</text>
        </g>
        <g id="node-endpoint" class="network-node" transform="translate(250,260)" filter="url(#nodeGlow)">
          <rect x="-45" y="-24" width="90" height="48" rx="8" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="node-body"/>
          <text text-anchor="middle" y="4" fill="#3DD9C6" font-size="10">REST Endpoint</text>
        </g>
        <g id="node-hash" class="network-node" transform="translate(390,260)" filter="url(#nodeGlow)">
          <rect x="-40" y="-22" width="80" height="44" rx="8" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="node-body"/>
          <text text-anchor="middle" y="4" fill="#fff" font-size="10">SHA-256 Hash</text>
        </g>
        <g id="node-orderer" class="peer-node network-node" transform="translate(520,200)" filter="url(#nodeGlow)">
          <polygon points="0,-30 26,15 -26,15" fill="#0B3A35" stroke="#262E3A" stroke-width="1.5" class="node-body"/>
          <text text-anchor="middle" y="32" fill="#5B677A" font-size="9">Orderer</text>
        </g>
        <g id="node-peer1" class="peer-node network-node" transform="translate(650,140)" filter="url(#nodeGlow)">
          <circle r="22" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="node-body"/>
          <text text-anchor="middle" y="4" fill="#3DD9C6" font-size="9">Peer 1</text>
        </g>
        <g id="node-peer2" class="peer-node network-node" transform="translate(650,260)" filter="url(#nodeGlow)">
          <circle r="22" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="node-body"/>
          <text text-anchor="middle" y="4" fill="#3DD9C6" font-size="9">Peer 2</text>
        </g>
        <g id="node-peer3" class="peer-node network-node" transform="translate(650,380)" filter="url(#nodeGlow)">
          <circle r="22" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="node-body"/>
          <text text-anchor="middle" y="4" fill="#3DD9C6" font-size="9">Peer 3</text>
        </g>
        <g id="node-ledger" class="network-node" transform="translate(760,260)" filter="url(#nodeGlow)">
          <rect x="-35" y="-28" width="70" height="56" rx="6" fill="#0B3A35" stroke="#262E3A" stroke-width="1.5" class="node-body"/>
          <text text-anchor="middle" y="-2" fill="#fff" font-size="10" font-weight="600">Ledger</text>
          <text text-anchor="middle" y="14" fill="#3DD9C6" font-size="8">IMMUTABLE</text>
        </g>

        <g transform="translate(400,430)" opacity="0.85" filter="url(#nodeGlow)">
          <rect x="-95" y="-18" width="190" height="36" rx="8" fill="#12161D" stroke="#17B8A6" stroke-width="1" stroke-opacity="0.4"/>
          <text text-anchor="middle" y="-2" fill="#17B8A6" font-size="8" font-weight="600">Hyperledger Fabric Stack</text>
          <text text-anchor="middle" y="12" fill="#5B677A" font-size="9">Docker · Fabric CA · CouchDB · Channel MSP</text>
        </g>
      </svg>

      <div class="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 w-[42%] sm:w-56 rounded-lg border border-ink-700 bg-ink-900/95 backdrop-blur-sm p-2 sm:p-3 font-mono text-[9px] sm:text-[10px] max-h-20 sm:max-h-28 overflow-hidden z-10 shadow-lg">
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
    const color = this.tampered ? '#F2545B' : '#3DD9C6';
    gsap.to('.flow-line', { attr: { stroke: this.tampered ? '#F2545B' : 'url(#lineDim)' }, duration: 0.4 });
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

  private pulseNode(nodeSel: string) {
    const node = this.svgRef.nativeElement.querySelector(nodeSel);
    if (!node) return;
    gsap.fromTo(node.querySelector('.node-body'), {
      stroke: '#17B8A6', strokeWidth: 2, filter: 'brightness(1.4)',
    }, {
      stroke: this.tampered ? '#F2545B' : '#17B8A6',
      strokeWidth: 1.5,
      filter: 'brightness(1)',
      duration: 0.8,
      ease: 'power2.out',
    });
    gsap.fromTo(node, { scale: 1 }, { scale: 1.08, duration: 0.25, yoyo: true, repeat: 1, transformOrigin: 'center' });
  }

  private initAnimation() {
    const sequence = [
      '#path-backend-endpoint', '#path-endpoint-hash', '#path-hash-orderer',
      '#path-orderer-peer1', '#path-orderer-peer2', '#path-orderer-peer3', '#path-peer-ledger',
    ];

    sequence.forEach(sel => {
      const el = this.svgRef.nativeElement.querySelector(sel) as SVGPathElement;
      if (!el) return;
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len, attr: { stroke: 'url(#lineGrad)' } });
    });

    gsap.to('.peer-node', { scale: 1.04, transformOrigin: 'center', duration: 2.5, yoyo: true, repeat: -1, stagger: 0.5, ease: 'sine.inOut' });

    this.tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
    const packet = '#data-packet';
    gsap.set(packet, { opacity: 1 });

    sequence.forEach((sel, i) => {
      const path = this.svgRef.nativeElement.querySelector(sel) as SVGPathElement;
      if (!path) return;
      const nodeSel = PATH_NODES[sel] || sel;
      const peerNode = sel.includes('peer1') ? '#node-peer1' : sel.includes('peer2') ? '#node-peer2' : sel.includes('peer3') ? '#node-peer3' : nodeSel;

      this.tl!.to(path, {
        strokeDashoffset: 0,
        duration: 0.55,
        ease: 'power2.inOut',
        attr: { stroke: 'url(#lineGrad)' },
      }, i * 0.45);
      this.tl!.to(packet, {
        duration: 0.55,
        ease: 'none',
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
      }, i * 0.45);
      this.tl!.call(() => this.pulseNode(peerNode), [], i * 0.45 + 0.5);
      this.tl!.to(path, {
        attr: { stroke: 'url(#lineDim)' },
        duration: 0.3,
      }, i * 0.45 + 0.55);
    });

    this.tl.to(packet, { opacity: 0, duration: 0.2 });
    this.tl.set(packet, { opacity: 1 });
  }
}
