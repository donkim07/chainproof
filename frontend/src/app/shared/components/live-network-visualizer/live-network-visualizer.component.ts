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

const PEER_Y = [130, 210, 290];
const ALL_PATH_IDS = ['lnv-path-1', 'lnv-path-2', 'lnv-path-3', 'lnv-path-4', 'lnv-path-5', 'lnv-path-6', 'lnv-path-7'];

/**
 * Real (not simulated) Hyperledger Fabric topology behind ChainProof's shared
 * ledger, driven by actual polled integrity_records / tamper_incidents — see
 * NetworkPageComponent. Each traversed path stays lit (green, or red for a
 * tamper) until the next event arrives and redraws the diagram fresh.
 */
@Component({
  selector: 'app-live-network-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-[min(88vw,440px)] sm:h-[460px] bg-ink-950 overflow-hidden rounded-2xl border border-ink-700 shadow-2xl shadow-black/40">
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

      <svg #svg class="absolute inset-0 w-full h-full" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid meet">
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

        <path id="lnv-path-1" d="M 100 210 L 170 210" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>
        <path id="lnv-path-2" d="M 270 210 L 330 210" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>
        <path id="lnv-path-3" d="M 420 210 L 480 210" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>
        <path id="lnv-path-4" d="M 545 197 L 612 138" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>
        <path id="lnv-path-5" d="M 560 210 L 612 210" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>
        <path id="lnv-path-6" d="M 545 223 L 612 282" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>
        <path id="lnv-path-7" d="M 664 210 L 760 210" fill="none" stroke="url(#lnvLineDim)" stroke-width="2.5" class="lnv-flow-line"/>

        <circle id="lnv-packet" r="7" fill="#3DD9C6" filter="url(#lnvPacketGlow)" opacity="0"/>

        <g id="lnv-node-backend" class="lnv-network-node" transform="translate(60,210)" filter="url(#lnvNodeGlow)">
          <rect x="-50" y="-28" width="100" height="56" rx="10" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
          <text text-anchor="middle" y="-4" fill="#fff" font-size="11" font-weight="600">{{ siteLabel() || siteName || 'Your Backend' }}</text>
          <text text-anchor="middle" y="12" fill="#5B677A" font-size="9">connected site</text>
        </g>
        <g id="lnv-node-gateway" class="lnv-network-node" transform="translate(220,210)" filter="url(#lnvNodeGlow)">
          <rect x="-45" y="-24" width="90" height="48" rx="8" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
          <text text-anchor="middle" y="-2" fill="#3DD9C6" font-size="10">ChainProof</text>
          <text text-anchor="middle" y="10" fill="#3DD9C6" font-size="10">Gateway</text>
        </g>
        <g id="lnv-node-hash" class="lnv-network-node" transform="translate(380,210)" filter="url(#lnvNodeGlow)">
          <rect x="-40" y="-22" width="80" height="44" rx="8" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
          <text text-anchor="middle" y="4" fill="#fff" font-size="10">SHA-256 Hash</text>
        </g>
        <g id="lnv-node-orderer" class="lnv-peer-node lnv-network-node" transform="translate(520,210)" filter="url(#lnvNodeGlow)">
          <polygon points="0,-26 24,13 -24,13" fill="#0B3A35" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
          <text text-anchor="middle" y="30" fill="#5B677A" font-size="9">orderer0</text>
        </g>
        @for (p of peers; track p.id; let i = $index) {
          <g [id]="'lnv-node-' + p.id" class="lnv-peer-node lnv-network-node" [attr.transform]="'translate(636,' + p.y + ')'" filter="url(#lnvNodeGlow)">
            <circle r="24" fill="#12161D" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
            <text text-anchor="middle" y="4" fill="#3DD9C6" font-size="9">{{ p.label }}</text>
          </g>
        }
        <g id="lnv-node-ledger" class="lnv-network-node" transform="translate(800,210)" filter="url(#lnvNodeGlow)">
          <rect x="-38" y="-28" width="76" height="56" rx="6" fill="#0B3A35" stroke="#262E3A" stroke-width="1.5" class="lnv-node-body"/>
          <text text-anchor="middle" y="-4" fill="#fff" font-size="10" font-weight="600">Ledger</text>
          <text text-anchor="middle" y="12" fill="#3DD9C6" font-size="8">IMMUTABLE</text>
        </g>

        <g transform="translate(450,395)" opacity="0.85">
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
  @Input() set peerNodes(names: string[]) {
    const list = (names && names.length ? names : ['peer0', 'peer1', 'peer2']).slice(0, 3);
    this.peers = list.map((n, i) => ({ id: `peer${i}`, label: shortPeerLabel(n), y: PEER_Y[i] ?? PEER_Y[PEER_Y.length - 1] }));
  }

  peers: { id: string; label: string; y: number }[] = ['peer0', 'peer1', 'peer2']
    .map((n, i) => ({ id: `peer${i}`, label: shortPeerLabel(n), y: PEER_Y[i] }));

  logs = signal<NetworkLogLine[]>([]);
  tampered = signal(false);
  siteLabel = signal('');
  private ready = false;
  private queue: { text: string; isTamper: boolean; siteName?: string }[] = [];
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
  emit(text: string, isTamper: boolean, siteName?: string) {
    this.logs.update(l => [{ text, tampered: isTamper }, ...l.slice(0, 6)]);
    if (isTamper) {
      this.tampered.set(true);
    }
    this.queue.push({ text, isTamper, siteName });
    if (this.ready) this.drainQueue();
  }

  /** Operator acknowledged / integrity restored — clears the red alert state. */
  clearAlert() {
    this.tampered.set(false);
  }

  private primeLines() {
    const svg = this.svgRef.nativeElement;
    ALL_PATH_IDS.forEach(id => {
      const el = svg.querySelector(`#${id}`) as SVGPathElement;
      if (!el) return;
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    });
  }

  private drainQueue() {
    if (this.playing) return;
    const next = this.queue.shift();
    if (!next) return;
    this.playing = true;
    if (next.siteName) this.siteLabel.set(next.siteName);
    this.playFlow(next.isTamper, () => {
      this.playing = false;
      this.drainQueue();
    });
  }

  private playFlow(isTamper: boolean, onDone: () => void) {
    const svg = this.svgRef.nativeElement;
    // Same solid-color treatment for both — only the color itself differs.
    const color = isTamper ? '#F2545B' : '#3DD9C6';
    const lineColor = color;
    // Real Fabric semantics: the orderer broadcasts the block to every peer at
    // once, and every peer commits it to the ledger — so every event lights
    // up the full path through ALL peers and always reaches the ledger.
    const fanPaths = ['lnv-path-4', 'lnv-path-5', 'lnv-path-6'].slice(0, Math.max(1, this.peers.length));
    const fullSequence = ['lnv-path-1', 'lnv-path-2', 'lnv-path-3', ...fanPaths, 'lnv-path-7'];

    // The previous event's lit path disappears the moment a new one starts —
    // snap everything back to idle (no tween, so it can't fight the forward
    // draw that starts on the very same shared paths a moment later).
    this.resetAllPaths();

    const tl = gsap.timeline({ onComplete: onDone });
    gsap.set('#lnv-packet', { fill: color, opacity: 1 });

    fullSequence.forEach((id, i) => {
      const path = svg.querySelector(`#${id}`) as SVGPathElement;
      if (!path) return;
      tl.to(path, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut', attr: { stroke: lineColor } }, i === 0 ? 0 : '-=0.05');
      tl.to('#lnv-packet', {
        duration: 0.4, ease: 'none',
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
      }, '<');
      const fanIdx = fanPaths.indexOf(id);
      if (fanIdx >= 0) {
        const peer = this.peers[fanIdx];
        tl.call(() => this.pulseNode(`#lnv-node-${peer?.id}`, isTamper));
      }
    });
    tl.call(() => this.pulseNode('#lnv-node-ledger', isTamper));
    tl.to('#lnv-packet', { opacity: 0, duration: 0.2 });
    // Lines stay lit (persisted) — no fade-back here by design.
  }

  private resetAllPaths() {
    const svg = this.svgRef.nativeElement;
    ALL_PATH_IDS.forEach(id => {
      const el = svg.querySelector(`#${id}`) as SVGPathElement;
      if (!el) return;
      const len = el.getTotalLength();
      gsap.set(el, { strokeDashoffset: len, attr: { stroke: 'url(#lnvLineDim)' } });
    });
    gsap.set('.lnv-node-body', { stroke: '#262E3A', strokeWidth: 1.5 });
  }

  private pulseNode(nodeSel: string, isTamper: boolean) {
    const node = this.svgRef.nativeElement.querySelector(nodeSel);
    if (!node) return;
    const color = isTamper ? '#F2545B' : '#17B8A6';
    gsap.fromTo(node.querySelector('.lnv-node-body'), {
      stroke: color, strokeWidth: 2, filter: 'brightness(1.5)',
    }, {
      stroke: color,
      strokeWidth: 2,
      filter: 'brightness(1)',
      duration: 0.9,
      ease: 'power2.out',
    });
    gsap.fromTo(node, { scale: 1 }, { scale: 1.08, duration: 0.25, yoyo: true, repeat: 1, transformOrigin: 'center' });
  }
}

function shortPeerLabel(fullName: string): string {
  const first = (fullName || '').split('.')[0];
  return first || 'peer';
}
