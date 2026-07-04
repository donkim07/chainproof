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
    <div class="mx-auto max-w-7xl px-6 py-24 flex gap-10">
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
          <h1 class="text-3xl font-bold text-white">Who ChainProof is for</h1>
          <p class="mt-4 text-slate-400 leading-relaxed max-w-3xl">
            ChainProof is for <strong class="text-white">website owners, product teams, and backend developers</strong> — not your end users.
            You register <em>your</em> API, select endpoints, and decide which <em>user records</em> (orders, messages, medical rows, etc.) get cryptographic proofs on blockchain.
          </p>
          <div class="mt-8 grid gap-4 md:grid-cols-2">
            <div class="card border-emerald-500/20">
              <h3 class="font-semibold text-emerald-300">Your users</h3>
              <p class="mt-2 text-sm text-slate-400">Use your app normally. They never sign up for ChainProof. Their sessions/cookies stay on your site.</p>
            </div>
            <div class="card border-brand-500/20">
              <h3 class="font-semibold text-brand-300">You (owner/dev)</h3>
              <p class="mt-2 text-sm text-slate-400">Register the site, pick endpoints, anchor hashes when records change, get alerts if data is tampered.</p>
            </div>
          </div>
          <div class="mt-8 card">
            <h3 class="font-semibold text-white mb-3">Recommended flow (Developer API)</h3>
            <ol class="space-y-2 text-sm text-slate-300 list-decimal list-inside">
              <li>User submits data on <strong class="text-white">your</strong> website (login with <strong class="text-white">your</strong> auth).</li>
              <li>Your backend saves the record to <strong class="text-white">your</strong> database.</li>
              <li>Immediately after save, your backend calls ChainProof <code class="text-brand-300">/integrity/anchor</code> with <code class="text-emerald-400">entity_id</code> = user record id and <code class="text-emerald-400">payload</code> = fields to protect.</li>
              <li>ChainProof stores SHA-256 hash + anchors on Hyperledger Fabric.</li>
              <li>Later, verify or scheduled checks detect if live data was altered.</li>
            </ol>
          </div>
        }

        @if (active === 'developer') {
          <div class="badge-success mb-3">Recommended integration</div>
          <h1 class="text-3xl font-bold text-white">Developer API — protect user records</h1>
          <p class="mt-3 text-slate-400 max-w-3xl leading-relaxed">
            Add one API call in <strong class="text-white">your backend</strong> after each important write.
            Example: user asks a question → you save it → you anchor <code class="text-emerald-400">{{ '{' }}"question","session_id","answer"{{ '}' }}</code>.
          </p>

          <h2 class="mt-8 text-lg font-semibold text-white">Step 1 — Owner account &amp; API access</h2>
          <p class="text-sm text-slate-400 mt-2">Dashboard → <strong class="text-white">API Keys</strong> → generate a key. Copy it once into your backend <code class="text-brand-300">.env</code> — it is never shown again (only a prefix remains in the panel).</p>
          <app-code-block title="Anchor with API key (recommended for backends)" [code]="anchorWithApiKey" />

          <h2 class="mt-6 text-lg font-semibold text-white">Step 2 — Anchor request body</h2>
          <app-code-block title="POST /api/v1/integrity/anchor" [code]="anchorUserRecord" />

          <div class="mt-6 grid gap-3 md:grid-cols-3 text-sm">
            <div class="card"><strong class="text-white">entity_type</strong><p class="text-slate-400 mt-1">Resource name: chat_message, order, patient_record</p></div>
            <div class="card"><strong class="text-white">entity_id</strong><p class="text-slate-400 mt-1">Stable ID for that user's record (session_id, order #, UUID)</p></div>
            <div class="card"><strong class="text-white">payload</strong><p class="text-slate-400 mt-1">JSON of fields you want tamper-proof — not user passwords</p></div>
          </div>

          <h2 class="mt-8 text-lg font-semibold text-white">Step 3 — Verify (detect tampering)</h2>
          <app-code-block title="POST /api/v1/integrity/verify" [code]="verifyExample" />

          <div class="mt-8 card border-brand-500/20">
            <p class="text-sm text-slate-300"><strong class="text-white">Why this solves auth:</strong> ChainProof never needs your users' cookies or JWTs. Your server already authenticated them; you anchor the record you just wrote using <em>your</em> ChainProof API key.</p>
            <a routerLink="/register" class="mt-4 inline-block"><app-button>Register as owner</app-button></a>
          </div>
        }

        @if (active === 'curl') {
          <h1 class="text-3xl font-bold text-white">cURL — full owner workflow</h1>
          <p class="mt-2 text-slate-400 text-sm">Login as owner → anchor a user chat message → verify tampering.</p>
          <app-code-block title="Complete example" [code]="curlFull" />
        }

        @if (active === 'go') {
          <h1 class="text-3xl font-bold text-white">Go — anchor after user save</h1>
          <p class="mt-2 text-slate-400 text-sm">Call from your API handler after persisting the user's record.</p>
          <app-code-block [code]="samples.go" />
        }

        @if (active === 'python') {
          <h1 class="text-3xl font-bold text-white">Python — anchor after user save</h1>
          <app-code-block [code]="samples.python" />
        }

        @if (active === 'node') {
          <h1 class="text-3xl font-bold text-white">Node.js — anchor after user save</h1>
          <app-code-block [code]="samples.node" />
        }

        @if (active === 'php') {
          <h1 class="text-3xl font-bold text-white">PHP — anchor after user save</h1>
          <app-code-block [code]="samples.php" />
        }

        @if (active === 'java') {
          <h1 class="text-3xl font-bold text-white">Java — anchor after user save</h1>
          <app-code-block [code]="samples.java" />
        }

        @if (active === 'proxy') {
          <h1 class="text-3xl font-bold text-white">Proxy mode (advanced)</h1>
          <p class="mt-3 text-slate-400 max-w-3xl leading-relaxed">
            Optional path when you cannot modify backend code. You still only configure <strong class="text-white">one machine credential</strong> for your API — never end-user logins.
            Route selected traffic through ChainProof or enable polling with a service API key you create on your backend.
          </p>
          <app-code-block title="Service credential (your backend)" [code]="serviceKeyNote" />
          <app-code-block title="Optional proxy path" [code]="proxyExample" />
        }

        @if (active === 'blockchain') {
          <h1 class="text-3xl font-bold text-white">Blockchain &amp; Fabric</h1>
          <div class="card mt-4 space-y-3 text-sm text-slate-300">
            <p>Hashes always save to your tenant DB. On-chain step uses Hyperledger Fabric gateway (:8090).</p>
            <p><span class="badge-success">submitted</span> — anchored (or dev mock if Fabric offline).</p>
            <p><span class="badge-danger">failed</span> — start Fabric: <code class="text-brand-300">bash scripts/fabric-up.sh</code></p>
          </div>
        }
      </main>
    </div>
  `,
})
export class DocsPageComponent {
  active = 'concepts';
  api = environment.apiUrl;
  sections = [
    { id: 'concepts', title: 'Concepts' },
    { id: 'developer', title: 'Developer API ★' },
    { id: 'curl', title: 'cURL' },
    { id: 'go', title: 'Go' },
    { id: 'python', title: 'Python' },
    { id: 'node', title: 'Node.js' },
    { id: 'php', title: 'PHP' },
    { id: 'java', title: 'Java' },
    { id: 'proxy', title: 'Proxy (advanced)' },
    { id: 'blockchain', title: 'Blockchain' },
  ];

  anchorUserRecord = `{
  "entity_type": "chat_message",
  "entity_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
  "site_id": "YOUR_SITE_UUID",
  "payload": {
    "session_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
    "question": "What are my symptoms?",
    "answer": "Please consult a doctor..."
  }
}`;

  verifyExample = `{
  "entity_type": "chat_message",
  "entity_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
  "payload": {
    "session_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
    "question": "What are my symptoms?",
    "answer": "TAMPERED TEXT HERE"
  }
}`;

  anchorWithApiKey = `# Store in YOUR server .env — never in frontend or git
CHAINPROOF_API_KEY=cp_your_key_from_dashboard

curl -X POST ${environment.apiUrl}/api/v1/integrity/anchor \\
  -H "X-API-Key: $CHAINPROOF_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entity_type": "chat_message",
    "entity_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
    "payload": {
      "session_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
      "question": "hi",
      "answer": "Hello!"
    }
  }'`;

  curlFull = `# Alternative: owner JWT from login (expires in 24h)
curl -s -X POST ${environment.apiUrl}/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"owner@mycompany.com","password":"yourpassword"}' | jq .

# 2. After YOUR user submits a chat message and YOU save it — anchor:
curl -X POST ${environment.apiUrl}/api/v1/integrity/anchor \\
  -H "Authorization: Bearer OWNER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entity_type": "chat_message",
    "entity_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
    "payload": {
      "session_id": "29f939fd-2c7b-4029-9fc3-fef9f738bda7",
      "question": "hi",
      "answer": "Hello!"
    }
  }'`;

  serviceKeyNote = `# On YOUR backend, create a long-lived API key for ChainProof monitor (optional polling).
# Example: X-Internal-Monitor-Key: cp_monitor_xxxxx
# End-user JWTs/cookies are NOT stored in ChainProof.`;

  proxyExample = `# Only if you route traffic — still uses YOUR ChainProof owner JWT:
curl -X POST ${environment.apiUrl}/api/v1/proxy/SITE_ID/api/ask \\
  -H "Authorization: Bearer OWNER_CHAINPROOF_JWT" \\
  -d '{"question":"hi","session_id":"user-session-uuid"}'`;

  samples = {
    go: `// In your Go API — after saving user record to DB:
func anchorUserChat(token, sessionID, question, answer string) error {
    payload := map[string]interface{}{
        "entity_type": "chat_message",
        "entity_id":   sessionID,
        "payload": map[string]string{
            "session_id": sessionID,
            "question":   question,
            "answer":     answer,
        },
    }
    body, _ := json.Marshal(payload)
    req, _ := http.NewRequest("POST", "${environment.apiUrl}/api/v1/integrity/anchor", bytes.NewReader(body))
    req.Header.Set("Authorization", "Bearer "+token) // owner's ChainProof token
    req.Header.Set("Content-Type", "application/json")
    _, err := http.DefaultClient.Do(req)
    return err
}`,
    python: `# In your Flask/Django view — after db.session.commit():
import requests

def anchor_user_chat(owner_token, session_id, question, answer):
    requests.post(
        "${environment.apiUrl}/api/v1/integrity/anchor",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "entity_type": "chat_message",
            "entity_id": session_id,
            "payload": {
                "session_id": session_id,
                "question": question,
                "answer": answer,
            },
        },
        timeout=10,
    )`,
    node: `// In your Express route — after await Message.create(...):
async function anchorUserChat(ownerToken, sessionId, question, answer) {
  await fetch('${environment.apiUrl}/api/v1/integrity/anchor', {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${ownerToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entity_type: 'chat_message',
      entity_id: sessionId,
      payload: { session_id: sessionId, question, answer },
    }),
  });
}`,
    php: `// In your Laravel controller — after $message->save():
function anchorUserChat(string $ownerToken, string $sessionId, array $data): void {
    $ch = curl_init('${environment.apiUrl}/api/v1/integrity/anchor');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $ownerToken,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'entity_type' => 'chat_message',
            'entity_id' => $sessionId,
            'payload' => $data,
        ]),
        CURLOPT_RETURNTRANSFER => true,
    ]);
    curl_exec($ch);
    curl_close($ch);
}`,
    java: `// In your Spring service — after repository.save(entity):
public void anchorUserChat(String ownerToken, String sessionId, Map<String, Object> payload) throws Exception {
    var body = Map.of(
        "entity_type", "chat_message",
        "entity_id", sessionId,
        "payload", payload
    );
    var request = HttpRequest.newBuilder()
        .uri(URI.create("${environment.apiUrl}/api/v1/integrity/anchor"))
        .header("Authorization", "Bearer " + ownerToken)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(new ObjectMapper().writeValueAsString(body)))
        .build();
    HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.discarding());
}`,
  };
}
