import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';
import { CodeBlockComponent } from '../../shared/components/code-block/code-block.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-docs-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicNavComponent, CodeBlockComponent, ButtonComponent],
  template: `
    <app-public-nav />
    <div class="mx-auto max-w-7xl px-6 py-24 flex gap-8">
      <aside class="hidden lg:block w-60 shrink-0">
        <nav class="sticky top-24 space-y-1 text-sm">
          @for (s of sections; track s.id) {
            <button (click)="active = s.id" class="block w-full text-left rounded-lg px-3 py-2 transition-colors"
              [class]="active === s.id ? 'bg-brand-600/15 text-brand-400 font-medium' : 'text-slate-400 hover:text-white'">
              {{ s.title }}
            </button>
          }
        </nav>
      </aside>

      <main class="flex-1 min-w-0 space-y-8">
        @if (active === 'developer') {
          <div>
            <div class="badge-success mb-3">Recommended — simplest path</div>
            <h1 class="text-3xl font-bold text-white">Developer API Mode</h1>
            <p class="mt-3 text-slate-400 leading-relaxed max-w-3xl">
              You call ChainProof directly from your backend when data changes. No proxy, no polling, no JWT refresh headaches.
              Your app already knows when a record is created — just anchor the hash at that moment.
            </p>
          </div>

          <div class="card">
            <h2 class="text-lg font-semibold text-white mb-4">Step-by-step (5 minutes)</h2>
            <ol class="space-y-4 text-sm text-slate-300">
              <li class="flex gap-3"><span class="badge-info shrink-0">1</span><span><a routerLink="/register" class="text-brand-400 underline">Register</a> → Dashboard → <strong class="text-white">API Keys</strong> → create a key with <code class="text-emerald-400">integrity:anchor</code> scope.</span></li>
              <li class="flex gap-3"><span class="badge-info shrink-0">2</span><span>When your code saves a record (employee, order, message), build a JSON payload of the fields you want protected.</span></li>
              <li class="flex gap-3"><span class="badge-info shrink-0">3</span><span>POST to <code class="text-brand-300">/api/v1/integrity/anchor</code> with your JWT (login) or use the dashboard token from login.</span></li>
              <li class="flex gap-3"><span class="badge-info shrink-0">4</span><span>ChainProof hashes the payload (SHA-256), stores it, and anchors on Hyperledger Fabric.</span></li>
              <li class="flex gap-3"><span class="badge-info shrink-0">5</span><span>Later, call <code class="text-brand-300">/integrity/verify</code> with live data — if hash differs, tampering is detected.</span></li>
            </ol>
          </div>

          <div>
            <h2 class="text-lg font-semibold text-white mb-2">What to send (anchor request body)</h2>
            <app-code-block title="POST /api/v1/integrity/anchor" [code]="anchorExample" />
          </div>

          <div class="grid gap-4 md:grid-cols-2 text-sm">
            <div class="card"><div class="font-medium text-white">entity_type</div><p class="mt-1 text-slate-400">Table or resource name, e.g. <code>employee</code>, <code>api/ask</code></p></div>
            <div class="card"><div class="font-medium text-white">entity_id</div><p class="mt-1 text-slate-400">Stable ID — primary key, session_id, UUID</p></div>
            <div class="card md:col-span-2"><div class="font-medium text-white">payload</div><p class="mt-1 text-slate-400">The JSON object you want tamper-proofed. Only include fields that matter — salary, status, answer text, etc.</p></div>
          </div>

          <app-code-block title="Full cURL example (login + anchor)" [code]="curlFull" />
          <app-code-block title="Verify (detect tampering)" [code]="verifyExample" />

          <div class="card border-brand-500/20">
            <h3 class="font-semibold text-white">When to use Developer API vs Proxy</h3>
            <ul class="mt-3 space-y-2 text-sm text-slate-400">
              <li><strong class="text-emerald-400">Developer API</strong> — you control your backend code. Best for Spring Boot, Laravel, Node APIs.</li>
              <li><strong class="text-amber-400">Proxy mode</strong> — no code changes but needs auth config, polling, or routing traffic through ChainProof. Harder for JWT APIs.</li>
            </ul>
            <a routerLink="/register" class="mt-4 inline-block"><app-button>Start with Developer API</app-button></a>
          </div>
        }

        @if (active === 'quickstart') {
          <h1 class="text-3xl font-bold text-white">Quick Start</h1>
          <p class="text-slate-400">Fastest path: Developer API. See the <button class="text-brand-400 underline" (click)="active='developer'">Developer API guide</button>.</p>
        }

        @if (active === 'curl' || active === 'go' || active === 'python' || active === 'node') {
          <h1 class="text-3xl font-bold text-white capitalize">{{ active }} Example</h1>
          <app-code-block [code]="samples[active]" />
        }

        @if (active === 'proxy') {
          <h1 class="text-3xl font-bold text-white">Proxy Mode (advanced)</h1>
          <p class="text-slate-400 mb-4">For non-technical users or when you cannot modify backend code. Requires site auth + polling or routing traffic through ChainProof.</p>
          <app-code-block title="Proxy URL format" [code]="proxyExample" />
          <p class="text-sm text-amber-200/90 mt-4">Note: Proxy routes require your ChainProof JWT. For production, prefer Developer API anchoring from your backend.</p>
        }

        @if (active === 'blockchain') {
          <h1 class="text-3xl font-bold text-white">Blockchain status</h1>
          <div class="card space-y-3 text-sm text-slate-300">
            <p><span class="badge-success">submitted</span> — hash anchored (or dev mock if Fabric gateway offline).</p>
            <p><span class="badge-danger">failed</span> — Fabric gateway unreachable. Dev mode auto-retries with mock. Production: run <code>docker compose --profile fabric up</code>.</p>
            <p>Hashes are always stored in your tenant DB even if blockchain is temporarily down.</p>
          </div>
        }
      </main>
    </div>
  `,
})
export class DocsPageComponent {
  active = 'developer';
  api = environment.apiUrl;
  sections = [
    { id: 'developer', title: 'Developer API ★' },
    { id: 'quickstart', title: 'Quick Start' },
    { id: 'curl', title: 'cURL' },
    { id: 'go', title: 'Go' },
    { id: 'python', title: 'Python' },
    { id: 'node', title: 'Node.js' },
    { id: 'proxy', title: 'Proxy Mode' },
    { id: 'blockchain', title: 'Blockchain' },
  ];

  anchorExample = `{
  "entity_type": "employee",
  "entity_id": "123",
  "payload": {
    "id": 123,
    "name": "Jane Doe",
    "salary": 50000
  }
}`;

  curlFull = `# 1. Login (get JWT)
curl -X POST ${environment.apiUrl}/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@company.com","password":"yourpassword"}'

# 2. Anchor (use token from step 1)
curl -X POST ${environment.apiUrl}/api/v1/integrity/anchor \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entity_type": "employee",
    "entity_id": "123",
    "payload": {"id": 123, "salary": 50000}
  }'`;

  verifyExample = `curl -X POST ${environment.apiUrl}/api/v1/integrity/verify \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entity_type": "employee",
    "entity_id": "123",
    "payload": {"id": 123, "salary": 999999}
  }'
# Returns intact: false if data was tampered`;

  proxyExample = `# Route through ChainProof (requires ChainProof JWT + site id)
curl -X POST ${environment.apiUrl}/api/v1/proxy/SITE_ID/api/ask \\
  -H "Authorization: Bearer YOUR_CHAINPROOF_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"hi","session_id":"abc-123"}'`;

  samples: Record<string, string> = {
    curl: this.curlFull,
    go: `// After obtaining JWT from /auth/login
body := \`{"entity_type":"employee","entity_id":"123","payload":{"id":123,"salary":50000}}\`
req, _ := http.NewRequest("POST", "${environment.apiUrl}/api/v1/integrity/anchor", strings.NewReader(body))
req.Header.Set("Authorization", "Bearer "+token)
req.Header.Set("Content-Type", "application/json")
resp, err := http.DefaultClient.Do(req)`,
    python: `import requests

token = requests.post("${environment.apiUrl}/api/v1/auth/login", json={
    "email": "you@company.com", "password": "secret"
}).json()["token"]

requests.post(
    "${environment.apiUrl}/api/v1/integrity/anchor",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "entity_type": "employee",
        "entity_id": "123",
        "payload": {"id": 123, "salary": 50000},
    },
)`,
    node: `const login = await fetch('${environment.apiUrl}/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'you@company.com', password: 'secret' }),
}).then(r => r.json());

await fetch('${environment.apiUrl}/api/v1/integrity/anchor', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${login.token}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    entity_type: 'employee',
    entity_id: '123',
    payload: { id: 123, salary: 50000 },
  }),
});`,
  };
}
