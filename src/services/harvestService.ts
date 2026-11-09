import {
  HarvestProjectAssignment,
  HarvestTimeEntryPayload,
  HarvestTimeEntryResponse,
} from '../types';

export class HarvestService {
  private accountId: string;
  private accessToken: string;
  private baseUrl: string;

  constructor(accountId: string, accessToken: string) {
    this.accountId = accountId.trim();
    this.accessToken = accessToken.trim();

    // Prefer Vite dev server proxy to avoid CORS in local development
    const isLocal =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    this.baseUrl = isLocal ? '/api/harvest' : 'https://api.harvestapp.com';
  }

  private get headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Harvest-Account-Id': this.accountId,
      'User-Agent': 'Commit2Harvest-Workbench',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async testConnection(): Promise<{ success: boolean; userName?: string; error?: string }> {
    try {
      if (!this.accountId || !this.accessToken) {
        return { success: false, error: 'Harvest Account ID ou Access Token ausentes' };
      }

      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}/v2/users/me`, {
          headers: this.headers,
        });
      } catch (networkErr: any) {
        // If local proxy failed, try direct URL as fallback
        if (this.baseUrl.startsWith('/api/harvest')) {
          response = await fetch('https://api.harvestapp.com/v2/users/me', {
            headers: this.headers,
          });
        } else {
          throw networkErr;
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Credenciais inválidas (401 Unauthorized)' };
        }
        if (response.status === 403) {
          return { success: false, error: 'Acesso negado (403 Forbidden). Verifique o Account ID.' };
        }
        return {
          success: false,
          error: `Erro na API Harvest: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email;
      return { success: true, userName };
    } catch (err: any) {
      return {
        success: false,
        error:
          err.message ||
          'Erro de rede ao conectar à Harvest API. Verifique a conectividade ou CORS.',
      };
    }
  }

  async fetchProjectAssignments(): Promise<HarvestProjectAssignment[]> {
    if (!this.accountId || !this.accessToken) {
      throw new Error('Harvest Account ID ou Access Token não configurados');
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v2/users/me/project_assignments?is_active=true&per_page=100`, {
        headers: this.headers,
      });
    } catch (proxyErr) {
      if (this.baseUrl.startsWith('/api/harvest')) {
        response = await fetch(
          'https://api.harvestapp.com/v2/users/me/project_assignments?is_active=true&per_page=100',
          { headers: this.headers }
        );
      } else {
        throw proxyErr;
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      let msg = `${response.status} ${response.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) msg += `: ${parsed.message}`;
      } catch {
        // ignore
      }
      throw new Error(`Falha ao obter projetos do Harvest: ${msg}`);
    }

    const data = await response.json();
    return data.project_assignments || [];
  }

  async createTimeEntry(payload: HarvestTimeEntryPayload): Promise<HarvestTimeEntryResponse> {
    if (!this.accountId || !this.accessToken) {
      throw new Error('Harvest Account ID ou Access Token não configurados');
    }

    let response: Response;
    const bodyStr = JSON.stringify(payload);

    try {
      response = await fetch(`${this.baseUrl}/v2/time_entries`, {
        method: 'POST',
        headers: this.headers,
        body: bodyStr,
      });
    } catch (proxyErr) {
      if (this.baseUrl.startsWith('/api/harvest')) {
        response = await fetch('https://api.harvestapp.com/v2/time_entries', {
          method: 'POST',
          headers: this.headers,
          body: bodyStr,
        });
      } else {
        throw proxyErr;
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      let msg = `${response.status} ${response.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) msg += `: ${parsed.message}`;
        if (parsed.error_description) msg += `: ${parsed.error_description}`;
      } catch {
        // ignore
      }
      throw new Error(`Erro ao registar horas no Harvest: ${msg}`);
    }

    return await response.json();
  }
}
