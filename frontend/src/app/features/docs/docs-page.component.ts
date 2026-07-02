import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-docs-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './docs-page.component.html',
})
export class DocsPageComponent {
  active = 'quickstart';
  sections = [
    { id: 'quickstart', title: 'Quick Start' },
    { id: 'curl', title: 'cURL' },
    { id: 'go', title: 'Go' },
    { id: 'python', title: 'Python' },
    { id: 'node', title: 'Node.js' },
    { id: 'php', title: 'PHP' },
    { id: 'java', title: 'Java' },
    { id: 'proxy', title: 'Proxy Mode' },
    { id: 'toast-templates', title: 'Toast Templates' },
  ];

  samples: Record<string, string> = {
    curl: `# Anchor a record
curl -X POST http://localhost:8080/api/v1/integrity/anchor \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"entity_type":"employee","entity_id":"123","payload":{"id":123,"salary":50000}}'

# Verify integrity
curl -X POST http://localhost:8080/api/v1/integrity/verify \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -d '{"entity_type":"employee","entity_id":"123","payload":{"id":123,"salary":999999}}'`,

    go: `package main

import ("bytes"; "encoding/json"; "net/http")

func anchorRecord(token string, payload map[string]interface{}) error {
    body, _ := json.Marshal(map[string]interface{}{
        "entity_type": "employee", "entity_id": "123", "payload": payload,
    })
    req, _ := http.NewRequest("POST", "http://localhost:8080/api/v1/integrity/anchor", bytes.NewReader(body))
    req.Header.Set("Authorization", "Bearer "+token)
    _, err := http.DefaultClient.Do(req)
    return err
}`,

    python: `import requests

def anchor_record(token, payload):
    return requests.post(
        "http://localhost:8080/api/v1/integrity/anchor",
        headers={"Authorization": f"Bearer {token}"},
        json={"entity_type": "employee", "entity_id": "123", "payload": payload},
    )`,

    node: `const anchor = async (token, payload) => {
  const res = await fetch('http://localhost:8080/api/v1/integrity/anchor', {
    method: 'POST',
    headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_type: 'employee', entity_id: '123', payload }),
  });
  return res.json();
};`,

    php: `$ch = curl_init('http://localhost:8080/api/v1/integrity/anchor');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    CURLOPT_POSTFIELDS => json_encode([
        'entity_type' => 'employee', 'entity_id' => '123',
        'payload' => ['id' => 123, 'salary' => 50000],
    ]),
    CURLOPT_RETURNTRANSFER => true,
]);
$response = curl_exec($ch);`,

    java: `HttpClient client = HttpClient.newHttpClient();
String body = "{\\"entity_type\\":\\"employee\\",\\"entity_id\\":\\"123\\","
    + "\\"payload\\":{\\"id\\":123,\\"salary\\":50000}}";
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("http://localhost:8080/api/v1/integrity/anchor"))
    .header("Authorization", "Bearer " + token)
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();`,

    toast: `// Vanilla JS tamper alert toast
function showTamperAlert() {
  const el = document.createElement('div');
  el.className = 'cp-tamper-alert';
  el.textContent = '⚠ Data integrity warning detected';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 8000);
}

/* CSS */
.cp-tamper-alert {
  position: fixed; top: 20px; right: 20px;
  background: #f43f5e; color: white;
  padding: 12px 20px; border-radius: 8px;
  animation: slideIn 0.3s ease; z-index: 9999;
}`,
  };
}
