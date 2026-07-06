import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  apiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: AppConfig = { apiUrl: environment.apiUrl };

  get apiUrl(): string {
    return this.config.apiUrl;
  }

  /** Resolved API origin for docs/snippets (never empty). */
  get apiOrigin(): string {
    if (this.config.apiUrl) return this.config.apiUrl.replace(/\/$/, '');
    if (typeof window !== 'undefined') return window.location.origin;
    return environment.apiUrl;
  }

  async load(): Promise<void> {
    try {
      const res = await fetch('/config.json', { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as Partial<AppConfig>;
      if (json.apiUrl !== undefined) {
        this.config = { apiUrl: json.apiUrl };
      }
    } catch {
      // keep environment fallback
    }
  }
}

export function initConfig(config: ConfigService) {
  return () => config.load();
}
