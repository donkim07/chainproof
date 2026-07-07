import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';
import { CodeBlockComponent } from '../../shared/components/code-block/code-block.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ConfigService } from '../../core/services/config.service';

@Component({
  selector: 'app-docs-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PublicNavComponent, CodeBlockComponent, ButtonComponent],
  template: `
    <app-public-nav />
    <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-20 sm:pt-24 pb-12 flex flex-col lg:flex-row gap-6 lg:gap-10">
      <!-- Mobile / tablet section picker -->
      <div class="lg:hidden sticky top-14 sm:top-16 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <label class="sr-only">Documentation section</label>
        <select class="input-field text-sm" [(ngModel)]="active">
          @for (s of sections; track s.id) {
            <option [value]="s.id">{{ s.title }}</option>
          }
        </select>
      </div>

      <aside class="hidden lg:block w-64 shrink-0">
        <nav class="sticky top-24 space-y-1 text-sm">
          @for (s of sections; track s.id) {
            <button (click)="active = s.id" class="block w-full text-left rounded-lg px-3 py-2.5 transition-colors"
              [class]="active === s.id ? 'bg-brand-600/15 text-brand-400 font-medium border-l-2 border-brand-500' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'">
              {{ s.title }}
            </button>
          }
        </nav>
      </aside>

      <main class="flex-1 min-w-0 pb-20">
        @if (active === 'concepts') {
          <div class="badge-info mb-3">Start here</div>
          <h1 class="text-3xl font-bold text-white">How ChainProof works</h1>
          <p class="mt-4 text-slate-400 leading-relaxed max-w-3xl">
            ChainProof is for <strong class="text-white">you (the site owner / backend developer)</strong>, not your end users.
            When your app saves important data, your server calls ChainProof once to anchor a hash on blockchain.
            ChainProof can then re-fetch that record on a schedule and alert you if the live data was altered.
          </p>
          <div class="mt-8 grid gap-4 md:grid-cols-2">
            <div class="card border-emerald-500/20">
              <h3 class="font-semibold text-emerald-300">Your users</h3>
              <p class="mt-2 text-sm text-slate-400">Use your app normally. They never sign up for ChainProof.</p>
            </div>
            <div class="card border-brand-500/20">
              <h3 class="font-semibold text-brand-300">Your backend</h3>
              <p class="mt-2 text-sm text-slate-400">Calls <code class="text-brand-300">/integrity/anchor</code> after each save using your ChainProof API key.</p>
            </div>
          </div>
          <div class="mt-8 card">
            <h3 class="font-semibold text-white mb-3">Integration flow</h3>
            <ol class="space-y-2 text-sm text-slate-300 list-decimal list-inside">
              <li>Register on ChainProof → add your site → copy <strong class="text-white">Site ID</strong> + create an <strong class="text-white">API key</strong>.</li>
              <li>After each write in <em>your</em> database, POST <code class="text-brand-300">/integrity/anchor</code> with <code class="text-emerald-400">entity_id</code>, <code class="text-emerald-400">payload</code>, and <code class="text-emerald-400">verify</code>.</li>
              <li>The <code class="text-emerald-400">verify</code> block tells ChainProof how to re-fetch that exact record later (any HTTP path, any <code class="text-slate-300">{{ '{' }}param{{ '}' }}</code>).</li>
              <li>ChainProof hashes the payload, stores it, and anchors on Hyperledger Fabric.</li>
              <li>Background checks compare live API data to the anchor — tampering appears in your dashboard.</li>
            </ol>
          </div>
        }

        @if (active === 'developer') {
          <div class="badge-success mb-3">Recommended</div>
          <h1 class="text-3xl font-bold text-white">Developer API integration</h1>
          <p class="mt-3 text-slate-400 max-w-3xl leading-relaxed">
            One HTTP call from your backend after each save. Works for any stack, any route shape, any number of records.
          </p>

          <h2 class="mt-8 text-lg font-semibold text-white">Step 1 — Register &amp; credentials</h2>
          <ol class="mt-2 text-sm text-slate-400 space-y-1 list-decimal list-inside">
            <li><a routerLink="/register" class="text-brand-400 hover:underline">Register</a> → Dashboard → <strong class="text-white">Sites</strong> → Add your backend URL.</li>
            <li>Select the site → copy <strong class="text-white">Site ID</strong> (UUID shown on the site card).</li>
            <li>Dashboard → <strong class="text-white">API Keys</strong> → Generate → copy once into your server <code class="text-brand-300">.env</code>.</li>
          </ol>
          <app-code-block title="Your backend .env" [code]="envExample" />

          <h2 class="mt-8 text-lg font-semibold text-white">Step 2 — Anchor after save</h2>
          <p class="text-sm text-slate-400 mt-2">
            <code class="text-emerald-400">payload</code> must match what you would return from your read API.
            <code class="text-emerald-400">verify</code> tells ChainProof how to re-fetch it (supports path params like <code class="text-slate-300">/orders/{{ '{' }}order_id{{ '}' }}</code>).
          </p>
          <app-code-block title="POST /api/v1/integrity/anchor" [code]="anchorUserRecord" />

          <div class="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-sm">
            <div class="card"><strong class="text-white">site_id</strong><p class="text-slate-400 mt-1">From Dashboard → Sites → select site → Site ID</p></div>
            <div class="card"><strong class="text-white">entity_type</strong><p class="text-slate-400 mt-1">Your resource name: session_messages, order, invoice</p></div>
            <div class="card"><strong class="text-white">entity_id</strong><p class="text-slate-400 mt-1">Stable record ID (UUID, order #, etc.)</p></div>
            <div class="card"><strong class="text-white">verify</strong><p class="text-slate-400 mt-1">How ChainProof re-fetches this record for tamper checks</p></div>
          </div>

          <h2 class="mt-8 text-lg font-semibold text-white">Step 3 — Path params (dynamic IDs)</h2>
          <p class="text-sm text-slate-400 mt-2">Use placeholders in <code class="text-brand-300">path_template</code>. Resolve them in <code class="text-brand-300">path_params</code>:</p>
          <ul class="mt-2 text-sm text-slate-400 list-disc list-inside space-y-1">
            <li><code class="text-emerald-400">$entity_id</code> — uses the anchor <code class="text-slate-300">entity_id</code></li>
            <li><code class="text-emerald-400">$payload.field</code> — reads a field from the anchored payload</li>
            <li>Literal values — e.g. <code class="text-slate-300">"tenant": "acme"</code></li>
          </ul>
          <app-code-block title="Example — order with path param" [code]="pathParamExample" />

          <h2 class="mt-8 text-lg font-semibold text-white">Step 4 — Verify (optional manual check)</h2>
          <app-code-block title="POST /api/v1/integrity/verify" [code]="verifyExample" />

          <h2 class="mt-8 text-lg font-semibold text-white">Step 5 — Optional polling (static routes only)</h2>
          <p class="text-sm text-slate-400 mt-2">
            For routes <em>without</em> path params (e.g. <code class="text-slate-300">GET /api/health</code>), you can enable polling in Dashboard → Sites.
            Use <strong class="text-white">one service API key</strong> on your backend — never end-user passwords.
            Routes with <code class="text-slate-300">{{ '{' }}id{{ '}' }}</code> should use the anchor <code class="text-emerald-400">verify</code> block instead.
          </p>

          <div class="mt-8 card border-brand-500/20">
            <p class="text-sm text-slate-300"><strong class="text-white">Auth:</strong> Use <code class="text-brand-300">X-API-Key: cp_...</code> or <code class="text-brand-300">Authorization: Bearer cp_...</code>. ChainProof never stores your users' JWTs.</p>
            <a routerLink="/register" class="mt-4 inline-block"><app-button>Get started</app-button></a>
          </div>
        }

        @if (active === 'curl') {
          <h1 class="text-3xl font-bold text-white">cURL examples</h1>
          <app-code-block title="Anchor with API key" [code]="anchorWithApiKey" />
          <app-code-block title="Verify tampering" [code]="curlVerify" />
        }

        @if (active === 'go') {
          <h1 class="text-3xl font-bold text-white">Go</h1>
          <app-code-block [code]="samples.go" />
        }

        @if (active === 'python') {
          <h1 class="text-3xl font-bold text-white">Python</h1>
          <app-code-block [code]="samples.python" />
        }

        @if (active === 'node') {
          <h1 class="text-3xl font-bold text-white">Node.js</h1>
          <app-code-block [code]="samples.node" />
        }

        @if (active === 'php') {
          <h1 class="text-3xl font-bold text-white">PHP</h1>
          <app-code-block [code]="samples.php" />
        }

        @if (active === 'java') {
          <h1 class="text-3xl font-bold text-white">Java</h1>
          <app-code-block [code]="samples.java" />
        }

        @if (active === 'blockchain') {
          <h1 class="text-3xl font-bold text-white">Blockchain</h1>
          <div class="card mt-4 space-y-3 text-sm text-slate-300">
            <p>Hashes are stored in your tenant DB and anchored on Hyperledger Fabric.</p>
            <p><span class="badge-success">submitted</span> — on-chain anchor succeeded.</p>
            <p><span class="badge-danger">failed</span> — check Fabric gateway logs on your server.</p>
          </div>
        }
      </main>
    </div>
  `,
})
export class DocsPageComponent {
  active = 'concepts';
  sections = [
    { id: 'concepts', title: 'Concepts' },
    { id: 'developer', title: 'Developer API ★' },
    { id: 'curl', title: 'cURL' },
    { id: 'go', title: 'Go' },
    { id: 'python', title: 'Python' },
    { id: 'node', title: 'Node.js' },
    { id: 'php', title: 'PHP' },
    { id: 'java', title: 'Java' },
    { id: 'blockchain', title: 'Blockchain' },
  ];

  anchorUserRecord = `{
  "entity_type": "session_messages",
  "entity_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
  "site_id": "YOUR_SITE_UUID",
  "payload": { "data": [ /* same JSON your GET endpoint returns */ ] },
  "verify": {
    "method": "GET",
    "path_template": "/api/sessions/{session_id}/messages",
    "path_params": { "session_id": "$entity_id" },
    "payload_from": "response"
  }
}`;

  pathParamExample = `{
  "entity_type": "order",
  "entity_id": "ord-8842",
  "site_id": "YOUR_SITE_UUID",
  "payload": { "id": "ord-8842", "total": 199.99, "status": "paid" },
  "verify": {
    "method": "GET",
    "path_template": "/api/v1/orders/{order_id}",
    "path_params": { "order_id": "$entity_id" },
    "payload_from": "response"
  }
}`;

  verifyExample = `{
  "entity_type": "session_messages",
  "entity_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
  "payload": { "data": [ /* current live data */ ] }
}`;

  constructor(private config: ConfigService) {}

  get envExample() {
    return `# ChainProof credentials (Dashboard → Sites + API Keys)
CHAINPROOF_API_KEY=cp_your_key_from_dashboard
CHAINPROOF_BASE_URL=${this.config.apiOrigin}/api/v1
CHAINPROOF_SITE_ID=your-site-uuid-from-dashboard`;
  }

  get anchorWithApiKey() {
    return `curl -X POST ${this.config.apiOrigin}/api/v1/integrity/anchor \\
  -H "X-API-Key: $CHAINPROOF_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entity_type": "session_messages",
    "entity_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
    "site_id": "YOUR_SITE_UUID",
    "payload": { "data": [] },
    "verify": {
      "method": "GET",
      "path_template": "/api/sessions/{session_id}/messages",
      "path_params": { "session_id": "$entity_id" },
      "payload_from": "response"
    }
  }'`;
  }

  get curlVerify() {
    return `curl -X POST ${this.config.apiOrigin}/api/v1/integrity/verify \\
  -H "X-API-Key: $CHAINPROOF_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entity_type": "session_messages",
    "entity_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
    "payload": { "data": [] }
  }'`;
  }

  get samples() {
    const base = this.config.apiOrigin;
    return {
      go: `func anchorRecord(apiKey, siteID, entityID string, payload map[string]interface{}) error {
    body, _ := json.Marshal(map[string]interface{}{
        "entity_type": "session_messages",
        "entity_id":   entityID,
        "site_id":     siteID,
        "payload":     payload,
        "verify": map[string]interface{}{
            "method":        "GET",
            "path_template": "/api/sessions/{session_id}/messages",
            "path_params":   map[string]string{"session_id": "$entity_id"},
            "payload_from":  "response",
        },
    })
    req, _ := http.NewRequest("POST", "${base}/api/v1/integrity/anchor", bytes.NewReader(body))
    req.Header.Set("X-API-Key", apiKey)
    req.Header.Set("Content-Type", "application/json")
    _, err := http.DefaultClient.Do(req)
    return err
}`,
      python: `import os, requests

def anchor_record(entity_id: str, payload: dict) -> None:
    requests.post(
        f"{os.environ['CHAINPROOF_BASE_URL']}/integrity/anchor",
        headers={"X-API-Key": os.environ["CHAINPROOF_API_KEY"]},
        json={
            "entity_type": "session_messages",
            "entity_id": entity_id,
            "site_id": os.environ["CHAINPROOF_SITE_ID"],
            "payload": payload,
            "verify": {
                "method": "GET",
                "path_template": "/api/sessions/{session_id}/messages",
                "path_params": {"session_id": "$entity_id"},
                "payload_from": "response",
            },
        },
        timeout=15,
    )`,
      node: `async function anchorRecord(entityId, payload) {
  await fetch(\`\${process.env.CHAINPROOF_BASE_URL}/integrity/anchor\`, {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.CHAINPROOF_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entity_type: 'session_messages',
      entity_id: entityId,
      site_id: process.env.CHAINPROOF_SITE_ID,
      payload,
      verify: {
        method: 'GET',
        path_template: '/api/sessions/{session_id}/messages',
        path_params: { session_id: '$entity_id' },
        payload_from: 'response',
      },
    }),
  });
}`,
      php: `function anchorRecord(string $entityId, array $payload): void {
    $ch = curl_init(getenv('CHAINPROOF_BASE_URL') . '/integrity/anchor');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'X-API-Key: ' . getenv('CHAINPROOF_API_KEY'),
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'entity_type' => 'session_messages',
            'entity_id' => $entityId,
            'site_id' => getenv('CHAINPROOF_SITE_ID'),
            'payload' => $payload,
            'verify' => [
                'method' => 'GET',
                'path_template' => '/api/sessions/{session_id}/messages',
                'path_params' => ['session_id' => '$entity_id'],
                'payload_from' => 'response',
            ],
        ]),
        CURLOPT_RETURNTRANSFER => true,
    ]);
    curl_exec($ch);
    curl_close($ch);
}`,
      java: `public void anchorRecord(String entityId, Map<String, Object> payload) throws Exception {
    var body = Map.of(
        "entity_type", "session_messages",
        "entity_id", entityId,
        "site_id", System.getenv("CHAINPROOF_SITE_ID"),
        "payload", payload,
        "verify", Map.of(
            "method", "GET",
            "path_template", "/api/sessions/{session_id}/messages",
            "path_params", Map.of("session_id", "$entity_id"),
            "payload_from", "response"
        )
    );
    var request = HttpRequest.newBuilder()
        .uri(URI.create(System.getenv("CHAINPROOF_BASE_URL") + "/integrity/anchor"))
        .header("X-API-Key", System.getenv("CHAINPROOF_API_KEY"))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(new ObjectMapper().writeValueAsString(body)))
        .build();
    HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.discarding());
}`,
    };
  }
}
