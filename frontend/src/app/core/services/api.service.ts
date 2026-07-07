import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient, private config: ConfigService) {}

  private get base(): string {
    return this.config.apiUrl;
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('cp_token');
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, { headers: this.headers() });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body, { headers: this.headers() });
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body, { headers: this.headers() });
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body, { headers: this.headers() });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`, { headers: this.headers() });
  }

  getPublic<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`);
  }

  downloadText(path: string, filename: string): void {
    this.http.get(`${this.base}${path}`, {
      headers: this.headers(),
      responseType: 'text',
    }).subscribe({
      next: body => {
        const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }
}
