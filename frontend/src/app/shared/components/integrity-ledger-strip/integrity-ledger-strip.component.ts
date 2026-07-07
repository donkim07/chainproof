import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

export interface LedgerBlock {
  hash: string;
  verified: boolean;
}

const POOL = [
  'a3f8c21b', '7e2d9f04', 'c1b5e8a2', 'f9d3a710', '2e8b4c6f',
  '5a1d7e93', 'b8f2c045', 'd4e6a819', 'e1c4f782', '6b9a3d15',
];

@Component({
  selector: 'app-integrity-ledger-strip',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="ledger-strip-wrap rounded-xl border border-ink-700/80 bg-ink-900/60 p-3 overflow-hidden" role="list" aria-label="Integrity ledger blocks">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Live anchor chain</span>
        <span class="flex items-center gap-1.5 text-[10px] text-signal-400">
          <span class="h-1.5 w-1.5 rounded-full bg-signal-500 animate-pulse-soft"></span>
          Syncing
        </span>
      </div>
      <div class="ledger-marquee" [class.ledger-marquee--static]="!marquee">
        <div class="ledger-track" [class.ledger-track--animate]="marquee">
          @for (block of displayBlocks; track $index) {
            <div class="ledger-block flex items-center shrink-0" role="listitem"
              [class.ledger-block--new]="$index === 0 && pulseNew">
              <div class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all duration-500"
                [class]="block.verified ? 'border-signal-500/30 bg-signal-500/5' : 'border-alert-500/30 bg-alert-500/5'">
                <app-icon [name]="block.verified ? 'check-circle' : 'alert'" size="sm"
                  [extraClass]="block.verified ? 'text-signal-500' : 'text-alert-500'" />
                <code class="font-mono text-xs text-slate-300">{{ block.hash }}</code>
              </div>
              <div class="ledger-connector h-px w-3 sm:w-5 bg-gradient-to-r from-ink-700 to-signal-500/40 shrink-0"></div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ledger-strip-wrap { min-width: 0; }
    .ledger-marquee { mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); }
    .ledger-marquee--static { mask-image: none; }
    .ledger-marquee--static .ledger-track { flex-wrap: wrap; justify-content: center; gap: 0; }
    .ledger-track { display: flex; align-items: center; width: max-content; }
    .ledger-track--animate { animation: ledger-scroll 28s linear infinite; }
    .ledger-track--animate:hover { animation-play-state: paused; }
    .ledger-block--new { animation: block-pop 0.5s ease-out; }
    @keyframes ledger-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes block-pop {
      0% { opacity: 0; transform: scale(0.85) translateY(4px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .ledger-track--animate { animation: none; }
      .ledger-block--new { animation: none; }
    }
  `],
})
export class IntegrityLedgerStripComponent implements OnInit, OnDestroy {
  @Input() condensed = false;

  blocks: LedgerBlock[] = [];
  displayBlocks: LedgerBlock[] = [];
  marquee = true;
  pulseNew = false;
  private timer?: ReturnType<typeof setInterval>;
  private resizeObs?: ResizeObserver;

  ngOnInit() {
    const count = this.condensed ? 5 : 8;
    this.blocks = POOL.slice(0, count).map((h, i) => ({ hash: h.slice(0, 8), verified: i < count - 1 }));
    this.updateDisplay();

    if (typeof window !== 'undefined') {
      this.marquee = window.innerWidth < 1024;
      this.timer = setInterval(() => this.pushBlock(), 3200);

      const check = () => {
        this.marquee = window.innerWidth < 1024;
        this.updateDisplay();
      };
      window.addEventListener('resize', check);
    }
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.resizeObs?.disconnect();
  }

  private updateDisplay() {
    this.displayBlocks = this.marquee ? [...this.blocks, ...this.blocks] : this.blocks;
  }

  private pushBlock() {
    const hash = POOL[Math.floor(Math.random() * POOL.length)].slice(0, 8);
    const verified = Math.random() > 0.12;
    this.blocks = [{ hash, verified }, ...this.blocks].slice(0, this.condensed ? 5 : 8);
    this.pulseNew = true;
    this.updateDisplay();
    setTimeout(() => this.pulseNew = false, 500);
  }
}
