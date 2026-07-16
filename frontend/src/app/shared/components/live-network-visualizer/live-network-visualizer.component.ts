import {
  Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, Input, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

gsap.registerPlugin(MotionPathPlugin);

export interface NetworkLogLine {
  text: string;
  tampered: boolean;
}

/**
 * Real (not simulated) Hyperledger Fabric topology behind ChainProof's shared
 * ledger: one orderer, one CouchDB-backed peer. Driven by actual polled
 * integrity_records / tamper_incidents — see NetworkPageComponent.
 */
@Component({
  selector: 'app-live-network-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-[min(88vw,420px)] sm:h-[440px] bg-ink-950 overflow-hidden rounded-2xl border border-ink-700 shadow-2xl shadow-black/40">
      <div class="absolute inset-0 opacity-[0.07]"
        style="background-image: linear-gradient(#17B8A6 1px, transparent 1px), linear-gradient(90deg, #17B8A6 1px, transparent 1px); background-size: 32px 32px;"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-signal-900/10 via-transparent to-ink-950 pointer-events-none"></div>

      <div class="absolute top-0 left-0 right-0 z-10 flex items-start justify-between gap-2 p-3 sm:p-4 pointer-events-none">
        <div class="pointer-events-auto min-w-0">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                [class.bg-signal-400]="!tampered()" [class.bg-alert-500]="tampered()"></span>
              <span class="relative inline-flex rounded-full h-2 w-2"
                [class.bg-signal-400]="!tampered()" [class.bg-alert-500]="tampered()"></span>
            </span>
            <div class="text-signal-400 font-mono text-xs font-semibold">{{ tampered() ? 'INTEGRITY ALERT' : 'Live Network' }}</div>
          </div>
          <div class="text-ink-500 text-[10px] mt-0.5">channel: {{ channel || 'chainproof-channel' }}</div>
        </div>
      </div>

      <svg #svg class="absolute inset-0 w-full h-full" viewBox="0 0 800 420" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="lnvNodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
            <feGaussianBlur stdDeviation="2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="lnvPacketGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <linearGradient id="lnvLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#17B8A6" stop-opacity="0.15"/>
            <stop offset="50%" stop-color="#3DD9C6" stop-opacity="1"/>
            <stop offset="100%" stop-color="#17B8A6" stop-opacity="0.15"/>
          </linearGradient>
          <linearGradient id="lnvLineDim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#17B8A6" stop-opacity="0.08"/>
            <stop offset="50%" stop-color="#17B8A6" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#17B8A6" stop-opacity="0.08"/>
          </linearGradient>
        </defs>

        <path id="lnv-path-1" d="M 100 210 L 210 210" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>
        <path id="lnv-path-2" d="M 270 210 L 330 210" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>
        <path id="lnv-path-3" d="M 380 210 L 440 210" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>
        <path id="lnv-path-4" d="M 500 210 L 560 210" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>
        <path id="lnv-path-5" d="M 620 210 L 680 210" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>

        <circle id="lnv-packet" r="7" fill="#3DD9C6" filter="url(#lnvPacketGlow)" opacity="0"/>

        <g id="lnv-node-backend" class="lnv-network-node" transform="translate(60,210)" filter="url(#lnvNodeGlow)">
          <rect x="-50" y="-28" width="100" height="56" rx="10" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
          <text text-anchor="middle" y="-4" fill="#fff" font-size="11" font-weight="600">{{ siteName || 'Your Backend' }}</text>
          <text text-anchor="middle" y="12" fill="#5B677A" font-size="9">connected site</text>
        </g>
        <g id="lnv-node-gateway" class="lnv-network-node" transform="translate(240,210)" filter="url(#lnvNodeGlow)">
          <rect x="-45" y="-24" width="90" height="48" rx="8" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
          <text text-anchor="middle" y="-2" fill="#3DD9C6" font-size="10">ChainProof</text>
          <text text-anchor="middle" y="10" fill="#3DD9C6" font-size="10">Gateway</text>
        </g>
        <g id="lnv-node-hash" class="lnv-network-node" transform="translate(410,210)" filter="url(#lnvNodeGlow)">
          <rect x="-40" y="-22" width="80" height="44" rx="8" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
          <text text-anchor="middle" y="4" fill="#fff" font-size="10">SHA-256 Hash</text>
        </g>
        <g id="lnv-node-orderer" class="lnv-peer-node lnv-network-node" transform="translate(560,210)" filter="url(#lnvNodeGlow)">
          <polygon points="0,-26 24,13 -24,13" fill="#0B3A35" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
          <text text-anchor="middle" y="30" fill="#5B677A" font-size="9">orderer0</text>
        </g>
        <g id="lnv-node-peer" class="lnv-peer-node lnv-network-node" transform="translate(680,210)" filter="url(#lnvNodeGlow)">
          <circle r="26" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
          <text text-anchor="middle" y="-2" fill="#3DD9C6" font-size="9">peer0</text>
          <text text-anchor="middle" y="10" fill="#5B677A" font-size="7">CouchDB</text>
        </g>
        <g id="lnv-node-ledger" class="lnv-network-node" transform="translate(740,330)" filter="url(#lnvNodeGlow)">
          <rect x="-38" y="-24" width="76" height="48" rx="6" fill="#0B3A35" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
          <text text-anchor="middle" y="-4" fill="#fff" font-size="10" font-weight="600">Ledger</text>
          <text text-anchor="middle" y="12" fill="#3DD9C6" font-size="8">IMMUTABLE</text>
        </g>
        <path d="M 680 236 L 740 306" fill="none" stroke="url(#lnvLineDim)" stroke-width="2" stroke-dasharray="3,3"/>

        <g transform="translate(400,385)" opacity="0.85">
          <text text-anchor="middle" fill="#5B677A" font-size="9">{{ chaincode || 'chainproof-integrity' }} chaincode · Docker · Fabric CA · CouchDB</text>
        </g>
      </svg>

      <div class="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 w-[55%] sm:w-72 rounded-lg border border-ink-700 bg-ink-900/95 backdrop-blur-sm p-2 sm:p-3 font-mono text-[9px] sm:text-[10px] max-h-24 sm:max-h-28 overflow-hidden z-10 shadow-lg">
        @for (log of logs(); track $index) {
          <div class="leading-relaxed" [class.text-alert-400]="log.tampered" [class.text-signal-400]="!log.tampered && $index === 0" [class.text-ink-500]="!log.tampered && $index !== 0">{{ log.text }}</div>
        }
        @if (!logs().length) {
          <div class="text-ink-600">Waiting for the first anchor…</div>
        }
      </div>
    </div>
  `,
})
export class LiveNetworkVisualizerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('svg') svgRef!: ElementRef<SVGElement>;
  @Input() siteName = '';
  @Input() channel = '';
  @Input() chaincode = '';

  logs = signal<NetworkLogLine[]>([]);
  tampered = signal(false);
  private ready = false;
  private queue: { text: string; isTamper: boolean }[] = [];
  private playing = false;

  ngAfterViewInit() {
    this.primeLines();
    this.ready = true;
    this.drainQueue();
  }

  ngOnDestroy() {
    gsap.killTweensOf('.lnv-flow-line, .lnv-network-node, .lnv-node-body, #lnv-packet');
  }

  /** Call for every newly observed anchor (isTamper=false) or tamper incident (isTamper=true). */
  emit(text: string, isTamper: boolean) {
    this.logs.update(l => [{ text, tampered: isTamper }, ...l.slice(0, 6)]);
    if (isTamper) {
      this.tampered.set(true);
    }
    this.queue.push({ text, isTamper });
    if (this.ready) this.drainQueue();
  }

  /** Operator acknowledged / integrity restored — clears the red state. */
  clearAlert() {
    this.tampered.set(false);
    gsap.to('.lnv-flow-line', { attr: { stroke: 'url(#lnvLineDim)' }, duration: 0.4 });
    gsap.to('#lnv-packet', { fill: '#3DD9C6', duration: 0.3 });
  }

  private primeLines() {
    const svg = this.svgRef.nativeElement;
    for (let i = 1; i <= 5; i++) {
      const el = svg.querySelector(`#lnv-path-${i}`) as SVGPathElement;
      if (!el) continue;
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    }
  }

  private drainQueue() {
    if (this.playing) return;
    const next = this.queue.shift();
    if (!next) return;
    this.playing = true;
    this.playFlow(next.isTamper, () => {
      this.playing = false;
      this.drainQueue();
    });
  }

  private playFlow(isTamper: boolean, onDone: () => void) {
    const svg = this.svgRef.nativeElement;
    const color = isTamper ? '#F2545B' : '#3DD9C6';
    const lineGrad = isTamper ? '#F2545B' : 'url(#lnvLineGrad)';
    const tl = gsap.timeline({ onComplete: onDone });
    gsap.set('#lnv-packet', { fill: color, opacity: 1 });

    for (let i = 1; i <= 5; i++) {
      const path = svg.querySelector(`#lnv-path-${i}`) as SVGPathElement;
      if (!path) continue;
      tl.to(path, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut', attr: { stroke: lineGrad } }, i === 1 ? 0 : '-=0.05');
      tl.to('#lnv-packet', {
        duration: 0.4, ease: 'none',
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
      }, '<');
      if (i === 4) {
        tl.call(() => this.pulseNode('#lnv-node-orderer', isTamper));
      }
      if (i === 5) {
        tl.call(() => this.pulseNode('#lnv-node-peer', isTamper));
      }
      if (!isTamper) {
        tl.to(path, { attr: { stroke: 'url(#lnvLineDim)' }, duration: 0.3 }, '+=0.05');
      }
    }
    tl.call(() => this.pulseNode('#lnv-node-ledger', isTamper));
    tl.to('#lnv-packet', { opacity: 0, duration: 0.2 });
  }

  private pulseNode(nodeSel: string, isTamper: boolean) {
    const node = this.svgRef.nativeElement.querySelector(nodeSel);
    if (!node) return;
    gsap.fromTo(node.querySelector('.lnv-node-body'), {
      stroke: isTamper ? '#F2545B' : '#17B8A6', strokeWidth: 2, filter: 'brightness(1.5)',
    }, {
      stroke: isTamper ? '#F2545B' : '#262E3A',
      strokeWidth: isTamper ? 2 : 1.5,
      filter: 'brightness(1)',
      duration: 0.9,
      ease: 'power2.out',
    });
    gsap.fromTo(node, { scale: 1 }, { scale: 1.08, duration: 0.25, yoyo: true, repeat: 1, transformOrigin: 'center' });
  }
}
