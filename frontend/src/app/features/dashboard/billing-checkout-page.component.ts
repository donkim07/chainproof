import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

interface CheckoutResponse {
  error?: string;
  message?: string;
  plan_slug?: string;
  plan_name?: string;
  amount?: number;
}

@Component({
  selector: 'app-billing-checkout-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, ButtonComponent],
  template: `
    <app-page-header title="Complete payment" subtitle="Secure checkout powered by Stripe." badge="Billing" />

    <div class="max-w-lg mx-auto card text-center py-10">
      @if (loading) {
        <div class="animate-pulse space-y-4">
          <div class="h-10 w-10 rounded-full bg-ink-800 mx-auto"></div>
          <div class="h-4 bg-ink-800 rounded w-2/3 mx-auto"></div>
          <div class="h-3 bg-ink-800 rounded w-1/2 mx-auto"></div>
        </div>
        <p class="mt-6 text-sm text-ink-500">Connecting to payment provider…</p>
      } @else if (failed) {
        <div class="text-4xl mb-4">💳</div>
        <h2 class="text-xl font-semibold text-white mb-2">Payment unavailable</h2>
        <p class="text-sm text-ink-500 mb-2">{{ message }}</p>
        @if (planSlug) {
          <p class="text-xs text-ink-500 mb-6">
            Selected plan: <span class="text-signal-400 capitalize">{{ planSlug }}</span>
            @if (amount != null && amount > 0) { · &#36;{{ amount }}/mo }
          </p>
        }
        <div class="flex flex-wrap justify-center gap-3">
          <a routerLink="/dashboard/billing"><app-button variant="secondary">Back to billing</app-button></a>
          <a routerLink="/dashboard/billing"><app-button>Try again</app-button></a>
        </div>
      }
    </div>
  `,
})
export class BillingCheckoutPageComponent implements OnInit {
  loading = true;
  failed = false;
  message = '';
  planSlug = '';
  amount: number | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.planSlug = this.route.snapshot.queryParamMap.get('plan') || '';
    this.api.post<CheckoutResponse>('/api/v1/billing/create-checkout', { plan_slug: this.planSlug }).subscribe({
      next: res => {
        if (res.error === 'stripe_not_configured') {
          this.showFailure(res.message || 'Stripe payments are not configured yet.');
          return;
        }
        if (res.message) {
          this.showFailure(res.message);
        }
      },
      error: e => {
        const body = e.error || {};
        if (body.error === 'stripe_not_configured' || e.status === 503) {
          this.showFailure(body.message || 'Stripe payments are not configured yet.');
          return;
        }
        this.showFailure(body.message || body.error || 'Could not start checkout.');
      },
    });
  }

  private showFailure(msg: string) {
    this.loading = false;
    this.failed = true;
    this.message = msg;
  }
}
